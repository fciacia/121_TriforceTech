import { NextResponse } from 'next/server'

/**
 * Proxy POST /api/run-analysis → Python backend /run-analysis.
 * The backend starts the swarm pipeline and returns immediately.
 * Results arrive on the frontend via socket.io events.
 */
export async function POST(req: Request) {
  const body = await req.json()
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

  try {
    const res = await fetch(`${backendUrl}/run-analysis`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
