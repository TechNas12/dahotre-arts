"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export type ActionState = {
  error?: string;
  success?: boolean;
};

// Type definitions based on DB schema
export type Category = {
  id: number;
  name: string;
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
  // Joined fields
  category_name?: string;
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

  return { supabase, user };
}

export async function listCategories(): Promise<Category[]> {
  await requireAuth(); // just to verify they are logged in
  const adminClient = createAdminClient();
  
  // Order by id so UNKNOWN (id 1) is first
  const { data, error } = await adminClient
    .from("categories")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return data as Category[];
}

export async function listProducts(): Promise<Product[]> {
  await requireAuth(); // just to verify they are logged in
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("products")
    .select(`
      *,
      category:categories(name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  // Map the nested category name to a flat property for the UI
  return data.map((p) => ({
    ...p,
    category_name: p.category?.name || "UNKNOWN",
  }));
}

const productSchema = z.object({
  product_code: z.string().min(1, "Product code is required"),
  name: z.string().min(2, "Product name must be at least 2 characters"),
  category_id: z.coerce.number().min(1, "Category is required"),
  cost_price: z.coerce.number().min(0, "Cost price cannot be negative"),
  default_selling_price: z.coerce.number().min(0, "Selling price cannot be negative"),
  stock_qty: z.coerce.number().int().min(0, "Stock quantity cannot be negative"),
  photo_urls: z.string().transform((val) => {
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
  try {
    await requireAuth();
    adminClient = createAdminClient();
  } catch (err: any) {
    return { error: err.message };
  }

  const result = productSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { error } = await adminClient.from("products").insert({
    product_code: result.data.product_code,
    name: result.data.name,
    category_id: result.data.category_id,
    cost_price: result.data.cost_price,
    default_selling_price: result.data.default_selling_price,
    stock_qty: result.data.stock_qty,
    photo_urls: result.data.photo_urls,
  });

  if (error) {
    if (error.code === '23505') { // Unique violation
       return { error: "A product with this code already exists." };
    }
    return { error: error.message };
  }

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
  try {
    await requireAuth();
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

  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function deleteProductsAction(productIds: number[]): Promise<ActionState> {
  let adminClient;
  try {
    await requireAuth();
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
