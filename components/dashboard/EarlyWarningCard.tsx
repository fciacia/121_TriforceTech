'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Wifi } from 'lucide-react'
import { useSwarmStore } from '@/store/useSwarmStore'

export default function EarlyWarningCard() {
  const earlyWarning = useSwarmStore((s) => s.earlyWarning)
  const isLive       = useSwarmStore((s) => s.isLive)

  const atRisk = earlyWarning?.loan_at_risk === true

  return (
    <div
      className="card relative overflow-hidden transition-all duration-300"
      style={atRisk ? {
        borderColor: '#DC262645',
        borderLeftColor: '#DC2626',
        borderLeftWidth: 3,
        boxShadow: '0 0 32px #DC262612, inset 0 0 40px #DC262606',
      } : undefined}
    >
      {/* Danger ambient glow when at risk */}
      {atRisk && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 20% 30%, #DC262610 0%, transparent 70%)' }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: isLive ? '#16A37A' : '#3E414D', boxShadow: isLive ? '0 0 6px #16A37A' : 'none' }}
          />
          <p className="text-[#EAEAEA] text-sm font-semibold">Early Warning</p>
        </div>
        {isLive && (
          <span className="badge-green" style={{ fontSize: 9 }}>LIVE</span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {earlyWarning ? (
          <motion.div
            key="warning"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {/* Headline block */}
            <div
              className="flex items-start gap-3 p-3 rounded-xl mb-5"
              style={{ background: '#DC262610', border: '1px solid #DC262625' }}
            >
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
              <p className="text-sm font-medium text-[#EAEAEA] leading-snug">
                {earlyWarning.headline}
              </p>
            </div>

            {/* Stat table */}
            <div className="flex flex-col divide-y divide-[#1C1E26]">
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-[#71747D]">ESG Impact</span>
                <span className="text-sm font-mono font-bold text-[#DC2626]">
                  {earlyWarning.esg_drop} pts
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-[#71747D]">Loan Status</span>
                <span
                  className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full"
                  style={{
                    color:       atRisk ? '#DC2626' : '#16A37A',
                    background:  atRisk ? '#DC262615' : '#16A37A15',
                    border:     `1px solid ${atRisk ? '#DC262630' : '#16A37A30'}`,
                  }}
                >
                  {atRisk ? 'AT RISK' : 'SAFE'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-[#71747D]">Severity</span>
                <span className={`${
                  earlyWarning.severity === 'HIGH' ? 'badge-red'
                  : earlyWarning.severity === 'MEDIUM' ? 'badge-amber'
                  : 'badge-green'
                }`}>
                  {earlyWarning.severity}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="safe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center justify-center py-10 gap-3"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: '#16A37A15', border: '1px solid #16A37A25' }}
            >
              <Wifi size={22} style={{ color: '#16A37A' }} />
            </div>
            <p className="text-[#71747D] text-sm font-medium">All Systems Clear</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
