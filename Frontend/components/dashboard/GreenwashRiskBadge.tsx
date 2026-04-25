'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, AlertTriangle, AlertCircle } from 'lucide-react'
import { useSwarmStore } from '@/store/useSwarmStore'

// ─── Parse numbered fraud_analysis string → structured claims ─────────────────
interface ParsedClaim {
  number: number
  title:  string
  type:   string
  body:   string
}

function parseFraudAnalysis(raw: string | null | undefined): ParsedClaim[] {
  if (!raw) return []
  const chunks = raw.split(/(?=\d+\.\s)/).filter(Boolean)
  return chunks.map((chunk): ParsedClaim => {
    const m = chunk.match(/^(\d+)\.\s+(.+?)\s+\((.+?)\):\s+([\s\S]+)/)
    if (!m) return { number: 0, title: chunk.slice(0, 60), type: 'UNKNOWN', body: chunk }
    return { number: parseInt(m[1], 10), title: m[2].trim(), type: m[3].trim().toUpperCase(), body: m[4].trim() }
  })
}

function claimColor(type: string) {
  return type === 'CONTRADICTION' ? '#DC2626' : '#D97706'
}

function SkeletonLoader() {
  return (
    <div className="card flex flex-col gap-3">
      <div className="animate-pulse flex flex-col gap-3">
        <div className="h-3 bg-[#1C1E26] rounded w-1/4" />
        <div className="h-3 bg-[#1C1E26] rounded w-3/4" />
        <div className="h-3 bg-[#1C1E26] rounded w-2/3" />
      </div>
    </div>
  )
}

export default function GreenwashRiskBadge() {
  const greenwashReport     = useSwarmStore((s) => s.greenwashReport)
  const [expanded, setExpanded] = useState<number | null>(null)

  if (!greenwashReport) return <SkeletonLoader />

  // Backend output_generator.py writes `risk_level`; legacy mock data used `greenwash_risk_level`
  const level     = (greenwashReport.risk_level ?? greenwashReport.greenwash_risk_level ?? 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW'
  const isHigh    = level === 'HIGH'
  const riskColor = level === 'HIGH' ? '#DC2626' : level === 'MEDIUM' ? '#D97706' : '#16A37A'

  const rawConfidence = greenwashReport.confidence ?? 0
  const confidencePct = rawConfidence <= 1 ? Math.round(rawConfidence * 100) : rawConfidence

  const claims     = parseFraudAnalysis(greenwashReport.fraud_analysis)
  const dirtyChain = greenwashReport.dirty_chain_risk as string | undefined
  const summary    = greenwashReport.summary         as string | undefined

  return (
    <div
      className="card transition-all duration-300"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderLeftColor: isHigh ? '#DC262640' : undefined,
        borderLeftWidth: isHigh ? 2 : undefined,
        boxShadow: isHigh ? '0 0 32px #DC262608, inset 0 0 40px #DC262604' : undefined,
      }}
    >
      {/* Ambient glow on HIGH risk */}
      {isHigh && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 100% 0%, #DC262608 0%, transparent 60%)' }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <p className="text-[#EAEAEA] text-sm font-semibold">Greenwash Detection</p>
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
            level === 'HIGH' ? 'badge-red' : level === 'MEDIUM' ? 'badge-amber' : 'badge-green'
          }`}
        >
          {level} RISK
        </span>
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-xs text-[#71747D] leading-snug mb-4 relative z-10">{summary}</p>
      )}

      {/* Expandable claim items (from fraud_analysis) */}
      {claims.length > 0 ? (
        <div className="flex flex-col gap-2 mb-4 relative z-10">
          {claims.map((claim) => {
            const cc     = claimColor(claim.type)
            const isOpen = expanded === claim.number
            return (
              <div
                key={claim.number}
                className="rounded-xl overflow-hidden"
                style={{
                  border:     `1px solid ${isOpen ? cc + '30' : '#1C1E26'}`,
                  background: isOpen ? `${cc}05` : '#111318',
                }}
              >
                {/* Row header */}
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                  onClick={() => setExpanded(isOpen ? null : claim.number)}
                >
                  {claim.type === 'CONTRADICTION'
                    ? <AlertTriangle size={10} style={{ color: '#DC2626', flexShrink: 0 }} />
                    : <AlertCircle   size={10} style={{ color: '#D97706', flexShrink: 0 }} />}
                  <span className="flex-1 text-xs font-medium text-[#C8CACD] leading-snug">
                    {claim.title}
                  </span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0"
                    style={{ background: `${cc}12`, color: cc, border: `1px solid ${cc}25` }}
                  >
                    {claim.type}
                  </span>
                  <ChevronDown
                    size={12}
                    style={{
                      color:      '#3E414D',
                      transform:  isOpen ? 'rotate(180deg)' : undefined,
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                    }}
                  />
                </button>

                {/* Expanded detail */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="px-3 pb-3 flex flex-col gap-3" style={{ borderTop: `1px solid ${cc}20` }}>
                        <div className="pt-3">
                          <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-[#3E414D] mb-1.5">Analysis</p>
                          <p className="text-xs text-[#71747D] leading-relaxed">{claim.body}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] uppercase tracking-[0.08em] text-[#3E414D] font-semibold whitespace-nowrap">Confidence</span>
                          <div className="flex-1 bg-[#1C1E26] rounded-full h-1 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: cc }}
                              initial={{ width: 0 }}
                              animate={{ width: `${confidencePct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="font-mono text-[10px] font-bold" style={{ color: cc }}>{confidencePct}%</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      ) : (
        /* Legacy fallback for mock data with flagged_claims array */
        <div className="flex flex-col gap-2 mb-4 relative z-10">
          {(greenwashReport.flagged_claims ?? []).map((claim: string, i: number) => (
            <div key={i} className="flex items-start gap-2 text-xs leading-snug" style={{ color: '#C8CACD' }}>
              <span style={{ color: riskColor, flexShrink: 0, marginTop: 1 }}>▸</span>
              <span>{claim}</span>
            </div>
          ))}
        </div>
      )}

      {/* Dirty supply chain risk */}
      {dirtyChain && (
        <div
          className="rounded-xl p-3 mb-4 relative z-10"
          style={{ background: `${riskColor}08`, border: `1px solid ${riskColor}18` }}
        >
          <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-[#3E414D] mb-1.5">Supply Chain Risk</p>
          <p className="text-xs text-[#71747D] leading-snug">{dirtyChain}</p>
        </div>
      )}

      {/* Legacy evidence (mock data path) */}
      {!dirtyChain && (greenwashReport.evidence ?? []).length > 0 && (
        <div
          className="rounded-xl p-3 flex flex-col gap-1.5 mb-4 relative z-10"
          style={{ background: `${riskColor}08`, border: `1px solid ${riskColor}18` }}
        >
          {(greenwashReport.evidence ?? []).map((e: any, i: number) => (
            <p key={i} className="text-[#71747D] text-xs leading-snug">
              {typeof e === 'string' ? e : e?.headline ?? JSON.stringify(e)}
            </p>
          ))}
        </div>
      )}

      {/* Overall confidence bar */}
      <div className="flex items-center gap-3 relative z-10">
        <span className="text-[10px] uppercase tracking-[0.08em] text-[#3E414D] font-semibold whitespace-nowrap">
          Confidence
        </span>
        <div className="flex-1 bg-[#1C1E26] rounded-full h-1 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: riskColor }}
            initial={{ width: 0 }}
            animate={{ width: `${confidencePct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>
        <span
          className="font-mono text-xs font-bold whitespace-nowrap"
          style={{ color: riskColor }}
        >
          {confidencePct}%
        </span>
      </div>
    </div>
  )
}
