"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { publicEnv } from "@/lib/config/env";

let cached: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Browser Supabase client. Anon key only -- every request it makes is subject
 * to RLS. Memoised so React re-renders reuse one realtime connection.
 */
export function createSupabaseBrowserClient() {
  cached ??= createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey
  );
  return cached;
}
