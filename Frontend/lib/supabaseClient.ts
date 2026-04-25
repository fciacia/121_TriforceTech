import { createBrowserClient } from '@supabase/ssr'

// Browser client — uses cookies instead of localStorage so Next.js middleware
// can read the session on the server and protect routes.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
