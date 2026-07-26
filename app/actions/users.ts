"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  error?: string;
  success?: boolean;
};

// Only SUPERADMINs can create users.
// We must verify the caller's role before doing this.
async function verifySuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: Only SUPERADMIN can perform this action");
  }
  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role !== "SUPERADMIN") {
    throw new Error("Unauthorized: Only SUPERADMIN can perform this action");
  }
  
  return user;
}

export async function listUsers() {
  await verifySuperadmin();
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.listUsers();

  if (error) {
    throw new Error(error.message);
  }

  // Map to a simpler structure for the UI
  return data.users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name || "Unknown",
    role: u.app_metadata?.role || u.user_metadata?.role || "ADMIN",
    created_at: u.created_at,
  }));
}

const createUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["STAFF", "ADMIN", "SUPERADMIN"]),
});

export async function createUserAction(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    await verifySuperadmin();
  } catch (err: any) {
    return { error: err.message };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  const result = createUserSchema.safeParse({ name, email, password, role });

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const adminClient = createAdminClient();

  const { data: newAuthUser, error } = await adminClient.auth.admin.createUser({
    email: result.data.email,
    password: result.data.password,
    email_confirm: true,
    user_metadata: {
      name: result.data.name,
      role: result.data.role,
    },
    app_metadata: {
      role: result.data.role,
    },
  });

  if (error) {
    return { error: error.message };
  }
  
  if (newAuthUser.user) {
    const { error: dbError } = await adminClient.from("users").insert({
       supabase_uid: newAuthUser.user.id,
       name: result.data.name,
       username: result.data.email, // using email as username
       role: result.data.role,
       email: result.data.email,
       status: "ACTIVE"
    });
    
    if (dbError) {
      // If the public record fails, we should ideally roll back the auth user, but for now we'll just report it
      return { error: `Auth created but DB insert failed: ${dbError.message}` };
    }
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["STAFF", "ADMIN", "SUPERADMIN"]),
});

export async function updateUserAction(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    await verifySuperadmin();
  } catch (err: any) {
    return { error: err.message };
  }

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;

  const result = updateUserSchema.safeParse({ id, name, email, role });

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.updateUserById(
    result.data.id,
    {
      email: result.data.email,
      user_metadata: {
        name: result.data.name,
        role: result.data.role,
      },
      app_metadata: {
        role: result.data.role,
      },
    }
  );

  if (error) {
    return { error: error.message };
  }
  
  // Update public.users
  await adminClient.from("users").update({
    name: result.data.name,
    email: result.data.email,
    role: result.data.role
  }).eq("supabase_uid", result.data.id);

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function deleteUsersAction(userIds: string[]): Promise<ActionState> {
  let currentUser;
  try {
    currentUser = await verifySuperadmin();
  } catch (err: any) {
    return { error: err.message };
  }

  if (!userIds || userIds.length === 0) {
    return { error: "No users selected for deletion." };
  }

  if (userIds.includes(currentUser.id)) {
    return { error: "You cannot delete your own account." };
  }

  const adminClient = createAdminClient();
  let hasError = false;
  let lastError = "";

  for (const id of userIds) {
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) {
      hasError = true;
      lastError = error.message;
    } else {
      // Delete from public.users
      await adminClient.from("users").delete().eq("supabase_uid", id);
    }
  }

  if (hasError) {
    return { error: `Failed to delete some users: ${lastError}` };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}
