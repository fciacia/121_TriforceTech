import { NextResponse } from 'next/server'

/**
 * Proxy POST /api/whatif → Python backend /whatif.
 * Runs server-side so there's no browser CORS constraint.
 * If the backend is unavailable the hook's offline fallback handles it.
 */
export async function POST(req: Request) {
  const body = await req.json()
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

  try {
    const res = await fetch(`${backendUrl}/whatif`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(3000), // fail fast so client never sees 503
    })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
  } catch {
    // backend unreachable — return 200 so browser doesn't log a console error
  }
  return NextResponse.json({ offline: true })
}
