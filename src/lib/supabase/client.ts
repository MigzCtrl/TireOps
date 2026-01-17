import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance - created once and reused
let client: SupabaseClient | undefined;

export function createClient() {
  // Return existing client if already created
  if (client) {
    return client;
  }

  // Create client only once
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}

// Reset the singleton client - call this on sign out to clear stale sessions
export function resetClient() {
  client = undefined;
}
