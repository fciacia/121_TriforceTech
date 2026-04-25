'use client'
import { useEffect, useState } from 'react'
import { motion, animate } from 'framer-motion'
import { useSwarmStore } from '@/store/useSwarmStore'

const RADIUS_INNER = 72
const RADIUS_OUTER = 84
const CIRC_INNER   = 2 * Math.PI * RADIUS_INNER

function scoreColor(score: number) {
  if (score >= 85) return '#16A37A'
  if (score >= 70) return '#D97706'
  return '#DC2626'
}

function tierLabel(score: number) {
  if (score >= 85) return 'Tier 1 — Green'
  if (score >= 70) return 'Tier 2 — At Risk'
  return 'Tier 3 — Critical'
}

export default function EsgScoreMeter() {
  const esgScore      = useSwarmStore((s) => s.esgScore)
  const previousScore = useSwarmStore((s) => s.previousScore)

  const [displayScore, setDisplayScore] = useState(previousScore)

  useEffect(() => {
    const controls = animate(previousScore, esgScore, {
      duration: 1.6,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayScore(Math.round(v)),
    })
    return controls.stop
  }, [esgScore, previousScore])

  const color      = scoreColor(esgScore)
  const delta      = esgScore - previousScore
  const dashOffset = CIRC_INNER * (1 - esgScore / 100)
  const prevOffset = CIRC_INNER * (1 - previousScore / 100)
  const cx = 96, cy = 96

  return (
    <div
      className="card flex flex-col items-center justify-center gap-5 py-7"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ background: `radial-gradient(ellipse 120% 80% at 50% 100%, ${color}18 0%, transparent 70%)` }}
      />

      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3E414D] z-10">
        ESG Score
      </p>

      <div className="relative z-10">
        <svg width="196" height="196" style={{ overflow: 'visible' }}>
          {/* Outer faint ring */}
          <circle cx={cx} cy={cy} r={RADIUS_OUTER} fill="none" stroke="#1C1E2650" strokeWidth="1" />

          {/* Track */}
          <circle cx={cx} cy={cy} r={RADIUS_INNER} fill="none" stroke="#1C1E26" strokeWidth="11" />

          {/* Track glow layer (very faint color on track) */}
          <circle
            cx={cx} cy={cy} r={RADIUS_INNER}
            fill="none"
            stroke={color}
            strokeWidth="11"
            strokeOpacity="0.06"
          />

          {/* Progress arc */}
          <motion.circle
            cx={cx} cy={cy} r={RADIUS_INNER}
            fill="none"
            stroke={color}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={CIRC_INNER}
            initial={{ strokeDashoffset: prevOffset }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: `${cx}px ${cy}px`,
              filter: `drop-shadow(0 0 8px ${color}BB) drop-shadow(0 0 3px ${color})`,
            }}
          />
        </svg>

        {/* Centered score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-bold tabular-nums"
            style={{ fontSize: 52, lineHeight: 1, color, textShadow: `0 0 30px ${color}99` }}
          >
            {displayScore}
          </span>
          <span className="text-[#3E414D] text-xs font-mono mt-1">/ 100</span>
        </div>
      </div>

      {/* Tier pill */}
      <div
        className="z-10 flex items-center gap-2 px-3 py-1 rounded-full"
        style={{ background: `${color}14`, border: `1px solid ${color}30` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[11px] font-semibold" style={{ color }}>{tierLabel(esgScore)}</span>
      </div>

      {/* Delta chip */}
      {delta !== 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{
            background: delta > 0 ? '#16A37A12' : '#DC262612',
            border: `1px solid ${delta > 0 ? '#16A37A30' : '#DC262630'}`,
          }}
        >
          <span
            className="font-mono text-xs font-bold"
            style={{ color: delta > 0 ? '#16A37A' : '#DC2626' }}
          >
            {delta > 0 ? '↑' : '↓'} {delta > 0 ? '+' : ''}{delta} pts
          </span>
        </motion.div>
      )}
    </div>
  )
}
