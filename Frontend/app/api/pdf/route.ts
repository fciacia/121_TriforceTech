import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET(req: NextRequest) {
  const pdfPath = path.resolve(
    process.cwd(),
    '..',
    'Backend',
    'SEDG_Report_TriforceTech_Logistic_FY2024.pdf'
  )

  if (!fs.existsSync(pdfPath)) {
    return NextResponse.json(
      { error: 'PDF report not found. Please run the backend pipeline first.' },
      { status: 404 }
    )
  }

  const fileBuffer = fs.readFileSync(pdfPath)
  const download = req.nextUrl.searchParams.get('download') === '1'

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': download
        ? 'attachment; filename="SEDG_Report_TriforceTech_Logistic_FY2024.pdf"'
        : 'inline; filename="SEDG_Report_TriforceTech_Logistic_FY2024.pdf"',
      'Content-Length': fileBuffer.length.toString(),
    },
  })
}
