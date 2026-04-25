'use client'
import { motion } from 'framer-motion'
import { useSwarmStore } from '@/store/useSwarmStore'

function SkeletonLoader() {
  return (
    <div className="card min-h-[200px] flex flex-col gap-4">
      <div className="animate-pulse flex flex-col gap-3">
        <div className="h-3 bg-[#1C1E26] rounded w-1/3" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between py-2">
            <div className="h-3 bg-[#1C1E26] rounded w-2/5" />
            <div className="h-3 bg-[#1C1E26] rounded w-1/5" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EconomicEmpowermentCard() {
  const economicData = useSwarmStore((s) => s.economicData)

  if (!economicData) return <SkeletonLoader />

  const bars = [
    {
      label: 'Local Jobs Supported',
      value: `${economicData.local_jobs_supported} workers`,
      pct:   Math.min(100, (economicData.local_jobs_supported / 30) * 100),
      color: '#16A37A',
    },
    {
      label: 'Community Impact Score',
      value: `${economicData.community_impact_score} / 100`,
      pct:   economicData.community_impact_score,
      color: '#A855F7',
    },
    {
      label: 'Sustainable Sourcing',
      value: `${Math.round(economicData.sustainable_sourcing_pct)}%`,
      pct:   economicData.sustainable_sourcing_pct,
      color: '#D97706',
    },
  ]

  return (
    <div className="card flex flex-col gap-5">
      <p className="text-[#EAEAEA] text-sm font-semibold">Social Impact</p>

      <div className="flex flex-col gap-4">
        {bars.map(({ label, value, pct, color }, i) => (
          <div key={label} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#71747D]">{label}</span>
              <span
                className="font-mono text-xs font-bold"
                style={{ color }}
              >
                {value}
              </span>
            </div>
            <div className="w-full h-1 rounded-full bg-[#1C1E26] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: i * 0.15 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
