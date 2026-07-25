import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Note: This client uses the SERVICE_ROLE_KEY and should ONLY be used in Server Actions or API routes.
// It bypasses Row Level Security (RLS) entirely!
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
