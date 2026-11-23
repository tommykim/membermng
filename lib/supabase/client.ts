import { createBrowserClient } from '@supabase/ssr'
import { createMockClient } from './mock-client'

export function isLocalMockMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return true
  if (
    url.includes('placeholder') ||
    url.includes('example') ||
    url.includes('your-supabase') ||
    key.includes('placeholder')
  ) {
    return true
  }
  return false
}

export function createClient() {
  if (isLocalMockMode()) {
    return createMockClient() as any
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { secure: process.env.NODE_ENV === 'production' } },
  )
}
