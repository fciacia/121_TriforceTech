import { NextResponse, type NextRequest } from 'next/server'

// Auth is disabled for demo mode.
// To re-enable, swap this file with the Supabase SSR guard in git history.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/report/:path*'],
}
