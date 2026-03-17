/** Minimal Deno globals for Supabase Edge Functions (TypeScript/IDE only). */
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
  env: {
    get: (key: string) => string | undefined
  }
}

/** Allow IDE/TypeScript to resolve @supabase/supabase-js (resolved by Deno via import map). */
declare module '@supabase/supabase-js' {
  export function createClient(
    url: string,
    key: string,
    options?: Record<string, unknown>
  ): import('@supabase/supabase-js').SupabaseClient
}
