"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { logActivity } from "@/lib/logActivity";
import { searchIndex, indexDocument, deleteDocument, extractForIndex } from "@/lib/opensearch";
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

export async function listProducts(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
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

  if (params?.search) {
    const searchStr = params.search.trim();
    if (searchStr) {
      // 1. Try OpenSearch first
      const searchResult = await searchIndex("products", searchStr, ["name", "product_code"]);
      
      if (searchResult !== null) {
        // OpenSearch succeeded
        if (searchResult.ids.length === 0) {
          return { data: [], totalCount: 0 };
        }
        query = query.in("id", searchResult.ids);
      } else {
        // Fallback to Supabase search if OpenSearch fails or is not configured
        const safeSearchStr = searchStr
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/%/g, '\\%')
          .replace(/_/g, '\\_');
        query = query.or(`name.ilike."%${safeSearchStr}%",product_code.ilike."%${safeSearchStr}%"`);
      }
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

  // Sync to OpenSearch
  // To get category_name, we either need to fetch it or we can leave it blank/basic.
  // We'll fetch the category name since we have category_id.
  const { data: categoryData } = await adminClient.from("categories").select("name").eq("id", result.data.category_id).single();
  
  await indexDocument("products", insertedProduct.id, {
    product_code: extractForIndex(result.data.product_code),
    name: extractForIndex(result.data.name),
    category_name: extractForIndex(categoryData?.name),
  });

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

  // Sync to OpenSearch
  let categoryName = "";
  if (updateData.category_id) {
    const { data: catData } = await adminClient.from("categories").select("name").eq("id", updateData.category_id).single();
    categoryName = catData?.name || "";
  } else {
    // If category_id wasn't in updateData, we might want to fetch the existing one.
    const { data: existingData } = await adminClient.from("products").select("category:categories(name)").eq("id", id).single();
    const cat = Array.isArray(existingData?.category) ? existingData?.category[0] : existingData?.category;
    categoryName = cat?.name || "";
  }

  await indexDocument("products", id, {
    product_code: extractForIndex(updateData.product_code),
    name: extractForIndex(updateData.name),
    category_name: extractForIndex(categoryName),
  });

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
