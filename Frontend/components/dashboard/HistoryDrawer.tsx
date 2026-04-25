'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History, X, TrendingUp, TrendingDown } from 'lucide-react'
import { useSwarmStore } from '@/store/useSwarmStore'

const VERDICT_COLOR: Record<string, string> = {
  APPROVE:     '#16A37A',
  CONDITIONAL: '#D97706',
  REJECT:      '#DC2626',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' }) +
    ' · ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  )
}

export default function HistoryDrawer() {
  const [open, setOpen] = useState(false)
  const analysisHistory = useSwarmStore((s) => s.analysisHistory)
  const reversed        = [...analysisHistory].reverse()

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[#71747D] hover:text-[#EAEAEA] hover:bg-[#1C1E26] transition-all duration-200"
        title="Analysis history"
      >
        <History size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-96 flex flex-col"
              style={{
                background:  '#0A0C12',
                borderLeft:  '1px solid #1C1E26',
                boxShadow:   '-16px 0 48px rgba(0,0,0,0.5)',
              }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 flex-shrink-0"
                style={{ height: 52, borderBottom: '1px solid #1C1E26' }}
              >
                <div className="flex items-center gap-2.5">
                  <History size={14} style={{ color: '#16A37A' }} />
                  <p className="text-sm font-semibold text-[#EAEAEA]">Analysis History</p>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: '#16A37A15', color: '#16A37A', border: '1px solid #16A37A25' }}
                  >
                    {analysisHistory.length}
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1C1E26] transition-colors"
                >
                  <X size={14} style={{ color: '#71747D' }} />
                </button>
              </div>

              {/* Entries */}
              <div className="flex-1 overflow-y-auto px-5 py-5 pb-20 md:pb-5">
                {reversed.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <History size={28} style={{ color: '#2A2D38' }} />
                    <p className="text-sm text-[#3E414D]">No analysis history yet</p>
                    <p className="text-xs text-[#2A2D38] max-w-[200px] leading-relaxed">
                      Run an analysis or load demo data to start tracking your ESG journey.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {reversed.map((entry, idx) => {
                      const verdictColor = VERDICT_COLOR[entry.verdict] ?? '#71747D'
                      const prev         = reversed[idx + 1]
                      const delta        = prev ? entry.esg_score - prev.esg_score : null
                      const isLatest     = idx === 0

                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="rounded-xl p-4 flex flex-col gap-3"
                          style={{
                            background: isLatest ? '#16A37A08' : '#111318',
                            border:     `1px solid ${isLatest ? '#16A37A25' : '#1C1E26'}`,
                          }}
                        >
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <p className="text-xs font-semibold text-[#EAEAEA] truncate">{entry.sme_name}</p>
                              <p className="text-[10px] text-[#3E414D]">{entry.sector}</p>
                            </div>
                            <span
                              className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0"
                              style={{
                                background: `${verdictColor}15`,
                                color:      verdictColor,
                                border:     `1px solid ${verdictColor}30`,
                              }}
                            >
                              {entry.verdict}
                            </span>
                          </div>

                          {/* Score + meta row */}
                          <div className="flex items-end justify-between">
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono text-2xl font-bold text-[#EAEAEA]">
                                {entry.esg_score}
                              </span>
                              <span className="text-[10px] text-[#3E414D]">ESG</span>
                              {delta !== null && (
                                <span
                                  className="flex items-center gap-0.5 text-[10px] font-bold font-mono"
                                  style={{ color: delta >= 0 ? '#16A37A' : '#DC2626' }}
                                >
                                  {delta >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                  {delta >= 0 ? '+' : ''}{delta}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              <span
                                className="text-[9px] uppercase tracking-wide"
                                style={{ color: '#3E414D' }}
                              >
                                {entry.event}
                              </span>
                              <span className="text-[9px] font-mono text-[#2A2D38]">
                                {formatDate(entry.timestamp)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
