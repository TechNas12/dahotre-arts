"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { logActivity } from "@/lib/logActivity";
import { searchIndex, deleteDocument, extractForIndex } from "@/lib/opensearch";
import { indexProductInOpenSearch } from "@/lib/sync-opensearch";
import { z } from "zod";

export type ActionState = {
  error?: string;
  success?: boolean;
};

// Type definitions based on DB schema
export type Category = {
  id: number;
  name: string;
};

export type ProductVariant = {
  label: string;
  base: number;
  height: number;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
};

export type Product = {
  id: number;
  product_code: string;
  name: string;
  category_id: number;
  cost_price: number;
  default_selling_price: number;
  stock_qty: number;
  photo_urls: string[];
  created_at: string;
  created_by?: number | null;
  base?: number | null;
  height?: number | null;
  variants?: ProductVariant[] | null;
  // Joined fields
  category_name?: string;
  created_by_user?: { name: string } | null;
};

// Ensure user is authenticated
async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const adminClient = createAdminClient();
  const { data: dbUser } = await adminClient.from("users").select("id").eq("supabase_uid", user.id).single();
  let userId = dbUser?.id;
  
  if (!userId && user.email) {
     const { data: dbUserEmail } = await adminClient.from("users").select("id").eq("email", user.email).single();
     userId = dbUserEmail?.id;
  }
  
  if (!userId) {
     throw new Error("Your account is not fully linked to a staff profile.");
  }

  return { supabase, user, userId };
}

const getCachedCategoriesFromDB = unstable_cache(
  async () => {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("categories")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
    return data as Category[];
  },
  ['categories-cache'],
  { tags: ['categories'], revalidate: 3600 }
);

export async function listCategories(): Promise<Category[]> {
  await requireAuth();
  return getCachedCategoriesFromDB();
}

async function resolveProductSearchIds(adminClient: any, searchStr: string): Promise<number[] | null> {
  const trimmed = searchStr.trim();
  if (!trimmed) return null;

  // 1. OpenSearch across all rich product fields
  const searchResult = await searchIndex("products", trimmed, [
    "product_code",
    "name",
    "category_name",
    "staff_name",
    "variant_labels",
    "dimensions",
    "prices",
    "stock_qty",
    "search_text"
  ]);

  let matchedProductIds: number[] | null = null;
  if (searchResult !== null && searchResult.ids.length > 0) {
    matchedProductIds = searchResult.ids;
  }

  // 2. Multi-Table and Multi-Field Fallback if OpenSearch gave no results or is unavailable
  if (matchedProductIds === null || matchedProductIds.length === 0) {
    const safeSearchStr = trimmed
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');

    // Code variations (e.g. "S 01" -> "S01", "S-01" -> "S01")
    const normalizedCode = trimmed.replace(/[\s\-_]/g, '');

    // Numeric checks for prices or dimensions
    const cleanNumStr = trimmed.replace(/[₹,\s]/g, '').trim();
    const numVal = cleanNumStr !== "" && !isNaN(Number(cleanNumStr)) ? Number(cleanNumStr) : null;

    // Dimension check (e.g. "12x18", "12 x 18", "4ft", "H-12")
    const dimMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:x|\*|\sby\s)\s*(\d+(?:\.\d+)?)/i);
    const dim1 = dimMatch ? parseFloat(dimMatch[1]) : null;
    const dim2 = dimMatch ? parseFloat(dimMatch[2]) : null;

    const [matchingProds, matchingCategories, matchingUsers] = await Promise.all([
      adminClient.from("products").select("id, product_code").or(
        `name.ilike.%${safeSearchStr}%,product_code.ilike.%${safeSearchStr}%${normalizedCode ? `,product_code.ilike.%${normalizedCode}%` : ''}`
      ),
      adminClient.from("categories").select("id").ilike("name", `%${safeSearchStr}%`),
      adminClient.from("users").select("id").ilike("name", `%${safeSearchStr}%`),
    ]);

    const dbMatchedIds = new Set<number>();
    (matchingProds.data || []).forEach((p: any) => dbMatchedIds.add(p.id));

    const catIds = (matchingCategories.data || []).map((c: any) => c.id);
    const userIds = (matchingUsers.data || []).map((u: any) => u.id);

    const subQueries: PromiseLike<any>[] = [];

    if (catIds.length > 0) {
      subQueries.push(adminClient.from("products").select("id").in("category_id", catIds));
    }
    if (userIds.length > 0) {
      subQueries.push(adminClient.from("products").select("id").in("created_by", userIds));
    }
    if (numVal !== null) {
      subQueries.push(
        adminClient.from("products").select("id").or(
          `default_selling_price.eq.${numVal},cost_price.eq.${numVal},stock_qty.eq.${numVal}`
        )
      );
    }
    if (dim1 !== null && dim2 !== null) {
      subQueries.push(
        adminClient.from("products").select("id").or(
          `and(base.eq.${dim1},height.eq.${dim2}),and(base.eq.${dim2},height.eq.${dim1})`
        )
      );
    }

    if (subQueries.length > 0) {
      const subResults = await Promise.all(subQueries);
      subResults.forEach(res => {
        (res.data || []).forEach((item: any) => {
          if (item.id) dbMatchedIds.add(item.id);
        });
      });
    }

    if (matchedProductIds === null) {
      matchedProductIds = Array.from(dbMatchedIds);
    } else if (matchedProductIds.length === 0 && dbMatchedIds.size > 0) {
      matchedProductIds = Array.from(dbMatchedIds);
    }
  }

  return matchedProductIds;
}

export async function listProducts(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  prefix?: string;
  limit?: number;
}): Promise<{ data: Product[], totalCount: number }> {
  await requireAuth();
  
  const adminClient = createAdminClient();
  const page = params?.page || 1;
  const pageSize = params?.limit || params?.pageSize || 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = adminClient
    .from("products")
    .select(`
      *,
      category:categories(name),
      created_by_user:users!created_by(name)
    `, { count: 'exact' });

  if (params?.categoryId && params.categoryId > 0) {
    query = query.eq("category_id", params.categoryId);
  }

  if (params?.prefix) {
    query = query.ilike("product_code", `${params.prefix.toUpperCase()}%`);
  }

  if (params?.search) {
    const matchedIds = await resolveProductSearchIds(adminClient, params.search);
    if (matchedIds !== null) {
      if (matchedIds.length === 0) {
        return { data: [], totalCount: 0 };
      }
      query = query.in("id", matchedIds);
    }
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching products:", error);
    return { data: [], totalCount: 0 };
  }

  type ProductJoinedRow = {
    id: number;
    product_code: string;
    name: string;
    category_id: number;
    cost_price: number;
    default_selling_price: number;
    stock_qty: number;
    photo_urls: string[];
    created_at: string;
    created_by?: number | null;
    base?: number | null;
    height?: number | null;
    variants?: ProductVariant[] | null;
    category?: { name: string } | { name: string }[];
    created_by_user?: { name: string } | { name: string }[];
  };

  const formattedData: Product[] = (data as unknown as ProductJoinedRow[]).map((p) => ({
    id: p.id,
    product_code: p.product_code,
    name: p.name,
    category_id: p.category_id,
    cost_price: p.cost_price,
    default_selling_price: p.default_selling_price,
    stock_qty: p.stock_qty,
    photo_urls: p.photo_urls,
    created_at: p.created_at,
    created_by: p.created_by,
    base: p.base,
    height: p.height,
    variants: p.variants,
    category_name: Array.isArray(p.category) ? p.category[0]?.name : (p.category?.name || "UNKNOWN"),
    created_by_user: Array.isArray(p.created_by_user) ? p.created_by_user[0] : (p.created_by_user || null),
  }));

  return { data: formattedData, totalCount: count || 0 };
}

export async function searchProductsAction(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  prefix?: string;
  priceMin?: number;
  priceMax?: number;
  inStockOnly?: boolean;
}): Promise<{ data: Product[], totalCount: number }> {
  await requireAuth();
  
  const adminClient = createAdminClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = adminClient
    .from("products")
    .select(`
      *,
      category:categories(name),
      created_by_user:users!created_by(name)
    `, { count: 'exact' });

  if (params?.categoryId && params.categoryId > 0) {
    query = query.eq("category_id", params.categoryId);
  }

  if (params?.prefix) {
    query = query.ilike("product_code", `${params.prefix.toUpperCase()}%`);
  }
  
  if (params?.priceMin !== undefined) {
    query = query.gte("default_selling_price", params.priceMin);
  }
  
  if (params?.priceMax !== undefined) {
    query = query.lte("default_selling_price", params.priceMax);
  }

  if (params?.inStockOnly) {
    query = query.gt("stock_qty", 0);
  }

  if (params?.search) {
    const matchedIds = await resolveProductSearchIds(adminClient, params.search);
    if (matchedIds !== null) {
      if (matchedIds.length === 0) {
        return { data: [], totalCount: 0 };
      }
      query = query.in("id", matchedIds);
    }
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching products:", error);
    return { data: [], totalCount: 0 };
  }

  const formattedData: Product[] = (data as any[]).map((p) => ({
    id: p.id,
    product_code: p.product_code,
    name: p.name,
    category_id: p.category_id,
    cost_price: p.cost_price,
    default_selling_price: p.default_selling_price,
    stock_qty: p.stock_qty,
    photo_urls: p.photo_urls,
    created_at: p.created_at,
    created_by: p.created_by,
    base: p.base,
    height: p.height,
    variants: p.variants,
    category_name: Array.isArray(p.category) ? p.category[0]?.name : (p.category?.name || "UNKNOWN"),
    created_by_user: Array.isArray(p.created_by_user) ? p.created_by_user[0] : (p.created_by_user || null),
  }));

  return { data: formattedData, totalCount: count || 0 };
}

const productSchema = z.object({
  product_code: z.string().min(1, "Product code is required"),
  name: z.string().min(2, "Product name must be at least 2 characters"),
  category_id: z.coerce.number().min(1, "Category is required"),
  cost_price: z.coerce.number().min(0, "Cost price cannot be negative"),
  default_selling_price: z.coerce.number().min(0, "Selling price cannot be negative"),
  stock_qty: z.coerce.number().int().min(0, "Stock quantity cannot be negative"),
  base: z.coerce.number().optional().nullable(),
  height: z.coerce.number().optional().nullable(),
  photo_urls: z.string().transform((val) => {
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }),
  variants: z.string().optional().transform((val) => {
    if (!val) return [];
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }),
});

export async function createProductAction(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  let adminClient;
  let userId;
  try {
    const auth = await requireAuth();
    userId = auth.userId;
    adminClient = createAdminClient();
  } catch (err: any) {
    return { error: err.message };
  }

  const result = productSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { data: insertedProduct, error } = await adminClient.from("products").insert({
    product_code: result.data.product_code,
    name: result.data.name,
    category_id: result.data.category_id,
    cost_price: result.data.cost_price,
    default_selling_price: result.data.default_selling_price,
    stock_qty: result.data.stock_qty,
    base: result.data.base,
    height: result.data.height,
    photo_urls: result.data.photo_urls,
    variants: result.data.variants,
    created_by: userId,
  }).select('id').single();

  if (error) {
    if (error.code === '23505') { // Unique violation
       return { error: "A product with this code already exists." };
    }
    return { error: error.message };
  }

  // Sync to OpenSearch (async background)
  indexProductInOpenSearch(adminClient, insertedProduct.id).catch(err => console.error("OpenSearch product indexing error:", err));

  await logActivity(adminClient, userId, 'PRODUCT_ADDED', 'product', insertedProduct.id, `Added product ${result.data.name}`);

  revalidateTag('products', 'max');
  revalidatePath("/dashboard/products");
  return { success: true };
}

const updateProductSchema = productSchema.extend({
  id: z.coerce.number(),
});

export async function updateProductAction(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  let adminClient;
  let userId;
  try {
    const auth = await requireAuth();
    userId = auth.userId;
    adminClient = createAdminClient();
  } catch (err: any) {
    return { error: err.message };
  }

  const result = updateProductSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { id, ...updateData } = result.data;

  const { error } = await adminClient
    .from("products")
    .update(updateData)
    .eq("id", id);

  if (error) {
    if (error.code === '23505') {
       return { error: "A product with this code already exists." };
    }
    return { error: error.message };
  }

  // Sync to OpenSearch (async background)
  indexProductInOpenSearch(adminClient, id).catch(err => console.error("OpenSearch product indexing error:", err));

  await logActivity(adminClient, userId, 'PRODUCT_UPDATED', 'product', id, `Updated product ${updateData.name}`);

  revalidateTag('products', 'max');
  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function deleteProductsAction(productIds: number[]): Promise<ActionState> {
  let adminClient;
  let userId;
  try {
    const auth = await requireAuth();
    userId = auth.userId;
    adminClient = createAdminClient();
  } catch (err: any) {
    return { error: err.message };
  }

  if (!productIds || productIds.length === 0) {
    return { error: "No products selected for deletion." };
  }

  const { error } = await adminClient
    .from("products")
    .delete()
    .in("id", productIds);

  if (error) {
    return { error: `Failed to delete products: ${error.message}` };
  }

  // Remove from OpenSearch
  for (const id of productIds) {
    await deleteDocument("products", id);
  }

  await Promise.all(productIds.map(id =>
    logActivity(adminClient, userId, 'PRODUCT_DELETED', 'product', id, `Deleted product`)
  ));

  revalidateTag('products', 'max');
  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function getNextProductSequence(prefix: string): Promise<string> {
  await requireAuth();
  const adminClient = createAdminClient();

  if (!prefix || prefix.trim().length === 0) return "";

  const cleanPrefix = prefix.trim().toUpperCase();

  const { data, error } = await adminClient
    .from("products")
    .select("product_code")
    .ilike("product_code", `${cleanPrefix}%`);

  if (error) {
    console.error("Error fetching sequence:", error);
    return "01";
  }

  let maxNum = 0;
  for (const row of data) {
    const suffix = row.product_code.slice(cleanPrefix.length);
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  return nextNum.toString().padStart(2, "0");
}

export async function adjustProductStockAction(
  productId: number,
  variantIndex: number | null,
  qtyToAdd: number
): Promise<ActionState> {
  let adminClient;
  let userId;
  try {
    const auth = await requireAuth();
    userId = auth.userId;
    adminClient = createAdminClient();
  } catch (err: any) {
    return { error: err.message };
  }

  if (!qtyToAdd || isNaN(qtyToAdd)) return { error: "Invalid quantity" };

  // Fetch current product
  const { data: product, error: fetchErr } = await adminClient
    .from("products")
    .select("name, stock_qty, variants")
    .eq("id", productId)
    .single();

  if (fetchErr || !product) {
    return { error: "Product not found" };
  }

  let updateData: any = {};
  
  if (variantIndex != null && product.variants && Array.isArray(product.variants) && product.variants.length > variantIndex) {
    // Update variant stock
    const newVariants = [...product.variants];
    const oldStock = newVariants[variantIndex].stock_qty || 0;
    const newStock = Math.max(0, oldStock + qtyToAdd);
    newVariants[variantIndex].stock_qty = newStock;
    updateData.variants = newVariants;
  } else {
    // Update base stock
    const oldStock = product.stock_qty || 0;
    const newStock = Math.max(0, oldStock + qtyToAdd);
    updateData.stock_qty = newStock;
  }

  const { error: updateErr } = await adminClient
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  const actionType = qtyToAdd > 0 ? "Stock Added" : "Stock Reduced";
  await logActivity(adminClient, userId, 'PRODUCT_UPDATED', 'product', productId, `${actionType} for ${product.name} (${qtyToAdd > 0 ? '+' : ''}${qtyToAdd})`);

  revalidateTag('products', 'max' as any);
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/pos");
  
  return { success: true };
}
