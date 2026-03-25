import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service role key.
 * This MUST only run in server contexts (Next.js route handlers).
 */
export function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL env var");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env var");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
      // We intentionally do not set `detectSession` to avoid any client-side session logic.
    }
  });
}

