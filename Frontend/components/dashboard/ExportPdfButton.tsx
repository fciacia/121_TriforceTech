'use client'
import { motion } from 'framer-motion'
import { Download, ExternalLink, FileText } from 'lucide-react'

export default function ExportPdfButton() {
  const handleExport = () => {
    window.open('/report', '_blank')
  }

  return (
    <div
      className="card flex flex-col items-center justify-center gap-5 text-center"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Background shimmer hint */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #16A37A06 0%, transparent 70%)' }}
      />

      {/* Icon */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center relative z-10"
        style={{
          background: 'linear-gradient(135deg, #16A37A18 0%, #16A37A08 100%)',
          border: '1px solid #16A37A25',
          boxShadow: '0 4px 16px #16A37A15',
        }}
      >
        <FileText size={24} style={{ color: '#16A37A' }} />
      </div>

      <div className="relative z-10">
        <p className="text-[#EAEAEA] text-sm font-semibold mb-1.5">Banker Report</p>
        <p className="text-[#3E414D] text-xs leading-relaxed max-w-[170px] mx-auto">
          Complete AI reasoning trace, ESG scores, and loan recommendation
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 w-full relative z-10">
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleExport}
          className="btn-primary w-full justify-center"
        >
          <Download size={13} />
          Export Banker Report
        </motion.button>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-[#3E414D] hover:text-[#71747D] text-xs transition-colors duration-200"
        >
          <ExternalLink size={10} />
          Preview in browser
        </button>
      </div>
    </div>
  )
}
