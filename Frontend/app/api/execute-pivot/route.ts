import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  try {
    const body = await req.json()
    const res = await fetch(`${backendUrl}/execute-pivot`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
