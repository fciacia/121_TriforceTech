'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { RotateCcw, Play, FileText, ChevronDown, Zap } from 'lucide-react'
import { useSwarmStore } from '@/store/useSwarmStore'

export default function DashboardNavbar() {
  const runAnalysis = useSwarmStore((s) => s.runAnalysis)
  const resetDemo   = useSwarmStore((s) => s.resetDemo)
  const basicInfo   = useSwarmStore((s) => s.basicInfo) 

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 h-[52px]"
        style={{
          background: 'rgba(5,6,10,0.92)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid #1C1E26',
          boxShadow: '0 1px 0 #1C1E26, 0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Left: logo + brand */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="GreenTrust Pulse" className="w-7 h-7 object-contain flex-shrink-0" />
          <span className="font-semibold text-[#EAEAEA] tracking-tight text-sm">
            GreenTrust Pulse
          </span>
          <span
            className="hidden md:block text-[9px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
            style={{ background: '#16A37A12', color: '#16A37A50', border: '1px solid #16A37A15' }}
          >
            ESG Intel
          </span>
        </div>

        {/* Centre: SME pill */}
        <div
          className="hidden md:flex items-center gap-2.5 px-4 py-1.5 rounded-xl cursor-default transition-colors duration-200 hover:bg-[#1C1E2660]"
          style={{ border: '1px solid #1C1E26' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-green"
            style={{ background: '#16A37A' }}
          />
          <span className="text-[13px] text-[#EAEAEA] font-medium">
            {basicInfo?.sme_name || "Ahmad's Packaging Sdn Bhd"}
          </span>
          <ChevronDown size={11} className="text-[#3E414D]" />
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={resetDemo}
            className="flex items-center gap-1.5 text-[#71747D] hover:text-[#EAEAEA] text-xs font-medium transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-[#1C1E26]"
          >
            <RotateCcw size={12} />
            Reset
          </button>

          <motion.button
            onClick={runAnalysis}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary text-xs py-1.5 px-4"
          >
            <Zap size={11} fill="currentColor" />
            Run Analysis
          </motion.button>

          <Link
            href="/report"
            className="flex items-center gap-1.5 text-[#71747D] hover:text-[#EAEAEA] text-xs font-medium transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-[#1C1E26]"
          >
            <FileText size={12} />
            Report
          </Link>
        </div>
      </header>
      <div className="fixed top-[52px] inset-x-0 z-40 h-px" style={{ background: 'linear-gradient(90deg, transparent, #1C1E26 20%, #1C1E26 80%, transparent)' }} />
    </>
  )
}
