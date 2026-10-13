import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Note: This client uses the SERVICE_ROLE_KEY and should ONLY be used in Server Actions or API routes.
// It bypasses Row Level Security (RLS) entirely!
export function createAdminClient() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!serviceKey) {
    throw new Error(
      "Missing Supabase Key: Please set SUPABASE_SERVICE_ROLE_KEY in your .env file."
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "⚠️ [Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is not set in .env. Falling back to NEXT_PUBLIC_SUPABASE_ANON_KEY, but operations requiring bypass of Row Level Security (RLS) may fail."
    );
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
