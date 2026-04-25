'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Download, ArrowLeft, Loader2, FileText } from 'lucide-react'
import ExecutiveSummaryReport from '@/components/report/ExecutiveSummaryReport'

export default function ReportPage() {
  const [exporting,    setExporting]    = useState(false)
  const [pdfAvailable, setPdfAvailable] = useState<boolean | null>(null)
  const [printDate]                    = useState(() => new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }))

  // Check whether the backend-generated PDF exists
  useEffect(() => {
    fetch('/api/pdf', { method: 'HEAD' })
      .then((r) => setPdfAvailable(r.ok))
      .catch(() => setPdfAvailable(false))
  }, [])

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const res = await fetch('/api/pdf?download=1')
      if (!res.ok) throw new Error('PDF not found')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'SEDG_Report_TriforceTech_Logistic_FY2024.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download failed:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] py-10 px-6">
      {/* ── Top controls ── */}
      <div className="max-w-[860px] mx-auto flex items-center justify-between mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-[#6B7280] hover:text-[#F9FAFB] text-sm font-medium transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary flex items-center gap-2 text-sm py-2 px-5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <><Loader2 size={14} className="animate-spin" /> Generating...</>
          ) : (
            <><Download size={14} /> Export PDF</>
          )}
        </motion.button>
      </div>

      {/* ── Report body ── */}
      <div className="max-w-[860px] mx-auto rounded-2xl overflow-hidden shadow-2xl">
        {pdfAvailable === null && (
          // Still checking
          <div className="flex items-center justify-center h-64 bg-[#111827] rounded-2xl">
            <Loader2 size={20} className="animate-spin text-[#16A37A]" />
          </div>
        )}

        {pdfAvailable === true && (
          <iframe
            src="/api/pdf"
            className="w-full bg-white"
            style={{ height: '85vh', border: 'none' }}
            title="SEDG ESG Report"
          />
        )}

        {pdfAvailable === false && (
          // No backend-generated PDF yet — render the live report component instead
          <div className="bg-white rounded-2xl overflow-hidden">
            <ExecutiveSummaryReport printDate={printDate} />
            <div className="flex items-center gap-2 px-8 pb-6 text-xs text-gray-400">
              <FileText size={12} />
              Run the backend pipeline to generate a downloadable PDF
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom export ── */}
      <div className="max-w-[860px] mx-auto mt-6 flex justify-center">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <><Loader2 size={16} className="animate-spin" /> Generating PDF...</>
          ) : (
            <><Download size={16} /> Export Banker Report</>
          )}
        </motion.button>
      </div>
    </div>
  )
}
