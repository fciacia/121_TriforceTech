'use client'
import { motion } from 'framer-motion'
import { Leaf, Zap, Play } from 'lucide-react'

export default function EmptyState({
  onRunAnalysis,
  onRunDemo,
}: {
  onRunAnalysis: () => void
  onRunDemo:     () => void
}) {
  return (
    <div
      className="flex items-center justify-center px-6 pb-16 md:pb-0"
      style={{ minHeight: 'calc(100vh - 52px)' }}
    >
      <motion.div
        className="flex flex-col items-center gap-8 max-w-md w-full text-center"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #16A37A18 0%, #0D926808 100%)',
            border: '1px solid #16A37A25',
            boxShadow: '0 0 60px #16A37A10',
          }}
        >
          <Leaf size={32} style={{ color: '#16A37A' }} />
        </div>

        {/* Text */}
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold text-[#EAEAEA] tracking-tight">
            No analysis yet
          </h2>
          <p className="text-[#71747D] text-sm leading-relaxed">
            Run your first ESG analysis to see supply chain risk, greenwash detection,
            loan readiness scores, and what-if improvement scenarios for your SME.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onRunDemo}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-medium text-[#C8CACD] transition-all duration-200 hover:bg-[#1C1E26]"
            style={{ border: '1px solid #2A2D38' }}
          >
            <Play size={13} />
            Load demo data
          </button>
          <motion.button
            onClick={onRunAnalysis}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 text-sm"
          >
            <Zap size={13} fill="currentColor" />
            Run Analysis
          </motion.button>
        </div>

        {/* Ghost preview cards */}
        <div className="grid grid-cols-3 gap-3 w-full select-none pointer-events-none">
          {['ESG Score', 'Loan Decision', 'Greenwash Risk'].map((label) => (
            <div
              key={label}
              className="rounded-xl p-4 flex flex-col items-center gap-2"
              style={{ background: '#0D0E14', border: '1px solid #1C1E26', opacity: 0.3 }}
            >
              <span className="font-mono text-xl font-bold text-[#2A2D38]">—</span>
              <span className="text-[10px] text-[#1C1E26] font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Feature hint */}
        <p className="text-[11px] text-[#2A2D38] leading-relaxed">
          ESG scoring · Supply chain graph · Agent debate · Greenwash detection · What-if simulator
        </p>
      </motion.div>
    </div>
  )
}
