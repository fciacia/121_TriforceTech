'use client'
import { motion } from 'framer-motion'
import { useSwarmStore } from '@/store/useSwarmStore'

const MILESTONES = [
  { dayKey: 'day_30' as const, label: 'Day 30', color: '#A855F7' },
  { dayKey: 'day_60' as const, label: 'Day 60', color: '#D97706' },
  { dayKey: 'day_90' as const, label: 'Day 90', color: '#16A37A' },
]

function SkeletonLoader() {
  return (
    <div className="card min-h-[200px] flex flex-col gap-4">
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-3 bg-[#1C1E26] rounded w-1/3" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-1 bg-[#1C1E26] rounded w-6" />
            <div className="h-3 bg-[#1C1E26] rounded w-full" />
            <div className="h-3 bg-[#1C1E26] rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ImpactForecastTimeline() {
  const impactForecast = useSwarmStore((s) => s.impactForecast)

  if (!impactForecast) return <SkeletonLoader />

  return (
    <div className="card flex flex-col gap-5">
      <p className="text-[#EAEAEA] text-sm font-semibold">Impact Forecast</p>

      <div className="relative flex flex-col gap-0">
        {/* Vertical connector line */}
        <div
          className="absolute left-[9px] top-4 bottom-4"
          style={{ width: 1, background: 'linear-gradient(180deg, #A855F740, #D97706 50%, #16A37A40)' }}
        />

        {MILESTONES.map(({ dayKey, label, color }, i) => (
          <motion.div
            key={dayKey}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.12 }}
            className="flex items-start gap-4 py-3"
          >
            {/* Node dot */}
            <div
              className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center"
              style={{
                background: `${color}20`,
                border: `2px solid ${color}60`,
                boxShadow: `0 0 8px ${color}40`,
                marginTop: 2,
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            </div>

            {/* Content */}
            <div className="flex flex-col gap-1 flex-1">
              <span
                className="font-mono text-xs font-bold"
                style={{ color }}
              >
                {label}
              </span>
              <p className="text-[11px] text-[#71747D] leading-relaxed">
                {impactForecast[dayKey]}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
