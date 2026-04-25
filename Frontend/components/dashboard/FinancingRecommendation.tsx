'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { useSwarmStore } from '@/store/useSwarmStore'

function SkeletonLoader() {
  return (
    <div className="card min-h-[200px] flex flex-col gap-4">
      <div className="animate-pulse flex flex-col gap-3">
        <div className="h-3 bg-[#1C1E26] rounded w-2/5" />
        <div className="h-6 bg-[#1C1E26] rounded w-3/4" />
        <div className="h-3 bg-[#1C1E26] rounded w-1/2" />
      </div>
    </div>
  )
}

// Derive score-improvement actions from store state
function useScoreActions() {
  const esgBreakdown   = useSwarmStore((s) => s.esgBreakdown)
  const greenwashReport = useSwarmStore((s) => s.greenwashReport)
  const loanDecision   = useSwarmStore((s) => s.loanDecision)

  const score   = esgBreakdown?.total_score ?? 76
  const needed  = Math.max(0, 85 - score)

  const actions: { label: string; delta: string; priority: 'high' | 'medium' }[] = []

  // Always show supplier switch if score < 85
  if (score < 85) {
    actions.push({
      label:    'Switch to Supplier C (carbon-neutral)',
      delta:    '+13 pts',
      priority: 'high',
    })
  }

  // Greenwash flags present
  if (greenwashReport?.greenwash_risk_level === 'HIGH') {
    actions.push({
      label:    'Submit verified emissions report',
      delta:    '+5 pts',
      priority: 'high',
    })
    actions.push({
      label:    'Resolve landfill violation record',
      delta:    '+4 pts',
      priority: 'medium',
    })
  }

  // Conditional loan conditions
  if (loanDecision?.verdict === 'CONDITIONAL') {
    actions.push({
      label:    'Obtain ISO 14001 certification',
      delta:    '+7 pts',
      priority: 'medium',
    })
  }

  // Generic if nothing else applies
  if (actions.length === 0) {
    actions.push({
      label:    'Increase renewable energy usage to 30%',
      delta:    '+6 pts',
      priority: 'medium',
    })
  }

  return { actions, needed }
}

export default function FinancingRecommendation() {
  const financingRec = useSwarmStore((s) => s.financingRec)
  const [showWhy, setShowWhy] = useState(false)
  const { actions, needed } = useScoreActions()

  if (!financingRec) return <SkeletonLoader />

  return (
    <div className="card flex flex-col gap-5">
      <p className="text-[#EAEAEA] text-sm font-medium">Financing Recommendation</p>

      {/* Primary — two-panel layout */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-4"
      >
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] uppercase tracking-[0.06em] text-[#71747D]">Best Product</p>
          <p className="text-[#EAEAEA] text-base font-semibold leading-snug">
            {financingRec.product}
          </p>
          <p className="text-[#71747D] text-xs mt-1">{financingRec.best_match}</p>
        </div>
        <span className="flex-shrink-0 text-[10px] font-semibold tracking-[0.08em] text-[#16A37A] mt-1">
          MATCHED
        </span>
      </motion.div>

      {/* Separator */}
      <div className="border-t border-[#1C1E26]" />

      {/* Alternative — italic, no card */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="text-xs text-[#71747D] italic"
      >
        Alt: {financingRec.alternative} →
      </motion.p>

      {/* Why this product? toggle */}
      <button
        onClick={() => setShowWhy((v) => !v)}
        className="flex items-center gap-1 text-[#71747D] hover:text-[#EAEAEA] text-xs font-medium transition-colors duration-200 self-start"
      >
        {showWhy ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Why this product?
      </button>

      <AnimatePresence>
        {showWhy && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-[#71747D] text-xs leading-relaxed">
              Your ESG profile qualifies for sustainability-linked pricing. Switching to Supplier C
              within 14 days locks in the Tier 1 green rate and preserves RM 4,000 in annual savings.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Score-Improvement Actions ── */}
      <div className="border-t border-[#1C1E26]" />

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-1.5">
          <TrendingUp size={11} className="text-[#16A37A]" />
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#3E414D] font-semibold">
            Actions to Increase Score
          </p>
          {needed > 0 && (
            <span className="ml-auto font-mono text-[10px] text-[#D97706]">
              need +{needed} pts for Tier 1
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {actions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.07, duration: 0.25 }}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-0.5 w-1 h-1 rounded-full flex-shrink-0"
                  style={{ background: action.priority === 'high' ? '#16A37A' : '#3E414D', marginTop: 6 }}
                />
                <span className="text-xs text-[#71747D] leading-snug">{action.label}</span>
              </div>
              <span
                className="flex-shrink-0 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{
                  color:       action.priority === 'high' ? '#16A37A' : '#D97706',
                  background:  action.priority === 'high' ? '#16A37A12' : '#D9770612',
                }}
              >
                {action.delta}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
