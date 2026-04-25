'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { useSwarmStore } from '@/store/useSwarmStore'

function SkeletonLoader() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-3 w-32 rounded bg-[#1C1E26]" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-14 rounded-xl bg-[#1C1E26]" />
        ))}
      </div>
      <div className="h-px w-full bg-[#1C1E26]" />
      <div className="h-3 w-full rounded bg-[#1C1E26]" />
      <div className="h-3 w-4/5 rounded bg-[#1C1E26]" />
    </div>
  )
}

const VERDICT_STYLES: Record<string, { color: string; label: string }> = {
  APPROVE:     { color: '#16A37A', label: 'APPROVED' },
  CONDITIONAL: { color: '#D97706', label: 'CONDITIONAL APPROVAL' },
  REJECT:      { color: '#DC2626', label: 'REJECTED' },
}

export default function ExecutiveSummaryPanel() {
  const loanDecision    = useSwarmStore((s) => s.loanDecision)
  const arbitrageOutput = useSwarmStore((s) => s.arbitrageOutput)
  const greenwashReport = useSwarmStore((s) => s.greenwashReport)
  const esgBreakdown    = useSwarmStore((s) => s.esgBreakdown)

  const hasData = !!(loanDecision && arbitrageOutput)

  const verdictKey    = loanDecision?.verdict ?? 'CONDITIONAL'
  const verdictStyle  = VERDICT_STYLES[verdictKey] ?? VERDICT_STYLES.CONDITIONAL
  const amount        = loanDecision?.suggested_amount ?? 120000
  const rate          = loanDecision?.suggested_rate   ?? '3.5% Green Tier'
  const quantifiableImpact = useSwarmStore((s) => s.quantifiableImpact)
  const netImpact  =  quantifiableImpact?.financial_value ?? 'RM 4,000 saved annually'
  const confidence    = arbitrageOutput?.confidence_score ?? 91
  const recommendation = arbitrageOutput?.reasoning_trace ?? ''
  const riskLevel     = greenwashReport?.greenwash_risk_level ?? 'HIGH'
  const esgScore      = esgBreakdown?.total_score ?? 76

  const RISK_COLOR: Record<string, string> = {
    HIGH:   '#DC2626',
    MEDIUM: '#D97706',
    LOW:    '#16A37A',
  }

  return (
    <div className="card flex flex-col gap-5" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Ambient verdict glow */}
      {hasData && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(ellipse 80% 60% at 0% 0%, ${verdictStyle.color}06 0%, transparent 60%)` }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="section-label">Executive Summary</p>
          <p className="text-[#3E414D] text-[11px] mt-0.5">Banker-ready brief</p>
        </div>
        {hasData && (
          <Link
            href="/report"
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-[#3E414D] hover:text-[#EAEAEA] transition-colors duration-200"
          >
            Full Report
            <ExternalLink size={11} />
          </Link>
        )}
      </div>

      {!hasData ? (
        <SkeletonLoader />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-5 relative z-10"
        >
          {/* 4 KPI tiles */}
          <div className="grid grid-cols-4 gap-3">
            {/* Verdict */}
            <div
              className="rounded-xl px-3 py-3 flex flex-col gap-1.5"
              style={{
                background: `${verdictStyle.color}0D`,
                border: `1px solid ${verdictStyle.color}28`,
                boxShadow: `0 0 16px ${verdictStyle.color}10`,
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.1em] font-bold" style={{ color: verdictStyle.color }}>
                Decision
              </p>
              <p className="font-mono text-[11px] font-bold leading-snug" style={{ color: verdictStyle.color }}>
                {verdictStyle.label}
              </p>
            </div>

            {/* Loan */}
            <div
              className="rounded-xl px-3 py-3 flex flex-col gap-1.5"
              style={{ background: '#0D0E14', border: '1px solid #1C1E2680' }}
            >
              <p className="text-[10px] uppercase tracking-[0.1em] text-[#3E414D] font-bold">Loan</p>
              <p className="font-mono text-[11px] font-semibold text-[#EAEAEA]">
                RM {amount.toLocaleString()}
              </p>
              <p className="font-mono text-[10px] text-[#71747D] leading-tight">{rate}</p>
            </div>

            {/* Net Impact */}
            <div
              className="rounded-xl px-3 py-3 flex flex-col gap-1.5"
              style={{ background: '#16A37A0C', border: '1px solid #16A37A25' }}
            >
              <p className="text-[10px] uppercase tracking-[0.1em] text-[#16A37A] font-bold">Net Impact</p>
              <p className="font-mono text-[11px] font-semibold text-[#16A37A] leading-tight">{netImpact}</p>
            </div>

            {/* AI Confidence */}
            <div
              className="rounded-xl px-3 py-3 flex flex-col gap-1.5"
              style={{ background: '#0D0E14', border: '1px solid #1C1E2680' }}
            >
              <p className="text-[10px] uppercase tracking-[0.1em] text-[#3E414D] font-bold">AI Confidence</p>
              <p className="font-mono text-[11px] font-bold text-[#EAEAEA]">
                {confidence}<span className="text-[#3E414D] font-normal">/100</span>
              </p>
              <p className="font-mono text-[10px] leading-tight" style={{ color: RISK_COLOR[riskLevel] }}>
                ESG {esgScore} · {riskLevel} risk
              </p>
            </div>
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #1C1E26 20%, #1C1E26 80%, transparent)' }} />

          {/* AI Recommendation */}
          <div className="flex flex-col gap-2">
            <p className="section-label">AI Recommendation</p>
            <p className="text-[11px] text-[#71747D] leading-relaxed">{recommendation}</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
