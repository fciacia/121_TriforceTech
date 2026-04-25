'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2, Zap, TrendingUp, AlertCircle } from 'lucide-react'
import { useSwarmStore } from '@/store/useSwarmStore'

type State = 'idle' | 'loading' | 'done' | 'error'

function SkeletonLoader() {
  return (
    <div className="card flex flex-col items-center justify-center min-h-[200px] gap-3">
      <div className="animate-pulse flex flex-col items-center gap-3 w-full">
        <div className="h-8 bg-[#1C1E26] rounded w-1/2" />
        <div className="h-3 bg-[#1C1E26] rounded w-1/3" />
        <div className="h-10 bg-[#1C1E26] rounded w-full mt-2" />
      </div>
    </div>
  )
}

export default function ExecutePivotButton() {
  const arbitrageOutput = useSwarmStore((s) => s.arbitrageOutput)
  const executePivot    = useSwarmStore((s) => s.executePivot)
  const esgScore        = useSwarmStore((s) => s.esgScore)
  const [state, setState] = useState<State>('idle')
  const quantifiableImpact = useSwarmStore((s) => s.quantifiableImpact)
  const netImpact  =  quantifiableImpact?.financial_value ?? 'RM 4,000 saved annually'

  const handleClick = async () => {
    if (state !== 'idle') return
    setState('loading')
    try {
      await executePivot()
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (!arbitrageOutput) return <SkeletonLoader />

  return (
    <div
      className="card flex flex-col items-center justify-center gap-5 text-center"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Ambient glow on done */}
      {state === 'done' && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, #16A37A12 0%, transparent 70%)' }}
        />
      )}

      {/* Impact metric */}
      <div className="relative z-10">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <TrendingUp size={12} style={{ color: '#16A37A' }} />
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#3E414D] font-semibold">
            Net Annual Preservation
          </p>
        </div>
        <p
          className="font-mono font-bold text-3xl"
          style={{ color: '#16A37A', textShadow: '0 0 20px #16A37A50', letterSpacing: '-0.02em' }}
        >
          {netImpact}
        </p>
      </div>

      {/* Confidence bar */}
      <div className="w-full relative z-10">
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-[0.08em] text-[#3E414D] font-semibold">AI Confidence</span>
          <span className="font-mono text-xs font-bold text-[#EAEAEA]">
            {arbitrageOutput.confidence_score}<span className="text-[#3E414D]">/100</span>
          </span>
        </div>
        <div className="w-full h-1 rounded-full bg-[#1C1E26] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #16A37A, #0D9268)' }}
            initial={{ width: 0 }}
            animate={{ width: `${arbitrageOutput.confidence_score}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </div>

      {/* Button states */}
      <div className="w-full flex flex-col items-center gap-2 relative z-10">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.button
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleClick}
              className="animate-shimmer-btn w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-5 rounded-xl"
              style={{
                backgroundSize: '300% 100%',
                boxShadow: '0 2px 16px #16A37A35, 0 0 0 1px #16A37A30',
              }}
            >
              <Zap size={14} fill="currentColor" />
              Execute Arbitrage Pivot
            </motion.button>
          )}

          {state === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl"
              style={{ background: '#1C1E26', color: '#71747D' }}
            >
              <Loader2 size={14} className="animate-spin" />
              <span className="font-semibold text-sm">Executing pivot…</span>
            </motion.div>
          )}

          {state === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm"
              style={{
                background: '#16A37A15',
                border: '1px solid #16A37A35',
                color: '#16A37A',
                boxShadow: '0 0 20px #16A37A15',
              }}
            >
              <CheckCircle2 size={14} />
              Pivot Executed · ESG {esgScore.toFixed(1)}
            </motion.div>
          )}

          {state === 'error' && (
            <motion.button
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setState('idle')}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm"
              style={{
                background: '#DC262615',
                border: '1px solid #DC262635',
                color: '#DC2626',
              }}
            >
              <AlertCircle size={14} />
              Failed — tap to retry
            </motion.button>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-[#2A2D38] leading-snug mt-0.5">
          {state === 'done'
            ? `Action logged · ${arbitrageOutput.final_action}`
            : 'Executes pivot · logs to backend · updates ESG score'}
        </p>
      </div>
    </div>
  )
}
