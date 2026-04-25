import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET() {
  const jsonPath = path.resolve(
    process.cwd(),
    '..',
    'Backend',
    'TriforceTech_Logistic_esg_output.json'
  )

  if (!fs.existsSync(jsonPath)) {
    return NextResponse.json(
      { error: 'ESG output JSON not found. Please run the backend pipeline first.' },
      { status: 404 }
    )
  }

  let data: Record<string, unknown>
  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8')
    data = JSON.parse(raw)
  } catch {
    return NextResponse.json(
      { error: 'ESG output JSON is malformed. Re-run the backend pipeline.' },
      { status: 422 }
    )
  }

  return NextResponse.json(data)
}
