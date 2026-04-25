'use client'
import { motion } from 'framer-motion'
import { useSwarmStore } from '@/store/useSwarmStore'
import type { LoanVerdict } from '@/types'

const VERDICT_STYLES: Record<LoanVerdict, { color: string; borderColor: string; label: string }> = {
  APPROVE:     { color: '#16A37A', borderColor: '#16A37A', label: 'APPROVED' },
  CONDITIONAL: { color: '#D97706', borderColor: '#D97706', label: 'CONDITIONAL' },
  REJECT:      { color: '#DC2626', borderColor: '#DC2626', label: 'REJECTED' },
}

function SkeletonLoader() {
  return (
    <div className="card flex flex-col gap-4 min-h-[200px]">
      <div className="animate-pulse flex flex-col gap-3">
        <div className="h-3 bg-[#1C1E26] rounded w-1/3" />
        <div className="h-8 bg-[#1C1E26] rounded w-2/3" />
        <div className="h-3 bg-[#1C1E26] rounded w-1/2 mt-2" />
        <div className="h-3 bg-[#1C1E26] rounded w-3/4" />
      </div>
    </div>
  )
}

export default function LoanDecisionCard() {
  const loanDecision = useSwarmStore((s) => s.loanDecision)

  if (!loanDecision) return <SkeletonLoader />

  const style = VERDICT_STYLES[loanDecision.verdict]

  return (
    <div className="card flex flex-col gap-5" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background glow tint based on verdict */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse 80% 60% at 0% 0%, ${style.color}08 0%, transparent 70%)` }}
      />

      {/* Verdict */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="pl-4 relative"
        style={{ borderLeft: `3px solid ${style.color}` }}
      >
        <p className="text-[10px] uppercase tracking-[0.1em] text-[#71747D] mb-1 font-semibold">Decision</p>
        <p className="font-bold text-2xl tracking-tight" style={{ color: style.color }}>
          {style.label}
        </p>
        <div
          className="absolute -left-0.5 top-0 bottom-0 w-px opacity-50"
          style={{ background: `linear-gradient(to bottom, ${style.color}, transparent)` }}
        />
      </motion.div>

      {/* Amount + rate */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-[#71747D] mb-1 font-semibold">Amount</p>
          <p className="text-[#EAEAEA] font-mono font-bold text-lg">
            RM {loanDecision.suggested_amount.toLocaleString()}
          </p>
        </div>
        <div
          className="px-3 py-2 rounded-xl text-right"
          style={{ background: `${style.color}12`, border: `1px solid ${style.color}25` }}
        >
          <p className="text-[10px] uppercase tracking-[0.08em] font-semibold mb-0.5" style={{ color: style.color }}>Rate</p>
          <p className="font-mono text-sm font-bold" style={{ color: style.color }}>
            {loanDecision.suggested_rate}
          </p>
        </div>
      </div>

      {/* Conditions */}
      {loanDecision.conditions.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-[#1C1E26] pt-4">
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#3E414D] font-semibold">Conditions</p>
          {loanDecision.conditions.map((condition, i) => (
            <motion.div
              key={i}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 0.25 }}
              className="flex items-start gap-3"
            >
              <span
                className="font-mono text-[10px] font-bold tabular-nums w-5 flex-shrink-0 mt-0.5"
                style={{ color: style.color }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-[#71747D] text-xs leading-relaxed">{condition.action}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
