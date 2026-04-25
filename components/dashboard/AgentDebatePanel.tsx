'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwarmStore } from '@/store/useSwarmStore'

// ─── TypingText ───────────────────────────────────────────────────────────────
function TypingText({ text, startDelay = 0, onDone }: { text: string; startDelay?: number; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState('')
  const [started,   setStarted]   = useState(false)
  const [done,      setDone]      = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    setStarted(false)
    const t = setTimeout(() => setStarted(true), startDelay * 1000)
    return () => clearTimeout(t)
  }, [text, startDelay])

  useEffect(() => {
    if (!started) return
    let i = 0
    const iv = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(iv)
        setDone(true)
        onDone?.()
      }
    }, 16)
    return () => clearInterval(iv)
  }, [started, text, onDone])

  if (!started) return <span className="text-[#3E414D] font-mono text-xs italic">standby…</span>

  return (
    <span className="font-mono text-xs leading-relaxed" style={{ color: '#C8CACD' }}>
      {displayed}
      {!done && (
        <span className="inline-block w-1.5 h-3 bg-[#16A37A] ml-0.5 align-middle animate-blink" />
      )}
    </span>
  )
}

// ─── Timestamp helper ─────────────────────────────────────────────────────────
function getTimestamp(offsetSeconds: number) {
  const d = new Date()
  d.setSeconds(d.getSeconds() + offsetSeconds)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ─── Agent config ──────────────────────────────────────────────────────────────
const AGENTS = [
  { key: 'agent_4', name: 'FRAUD_DETECTOR', color: '#A855F7', delay: 0,  role: 'Fraud & Greenwash' },
  { key: 'agent_1', name: 'ESG_AUDITOR',    color: '#16A37A', delay: 2,  role: 'ESG Scoring' },
  { key: 'agent_2', name: 'CFO',            color: '#DC2626', delay: 4,  role: 'Financial Analysis' },
  { key: 'agent_3', name: 'ARBITRAGEUR',    color: '#D97706', delay: 6,  role: 'Final Decision' },
] as const

// ─── Component ────────────────────────────────────────────────────────────────
export default function AgentDebatePanel() {
  const reasoningTrace = useSwarmStore((s) => s.reasoningTrace)
  const isDebating     = useSwarmStore((s) => s.isDebating)
  const traceKey       = reasoningTrace ? JSON.stringify(reasoningTrace) : 'empty'

  // Generate timestamps only on the client to avoid SSR/client hydration mismatch
  const [timestamps, setTimestamps]             = useState<string[]>([])
  const [idleTimestamp, setIdleTimestamp]       = useState('')
  const [debatingTimestamps, setDebatingTimestamps] = useState<string[]>([])

  useEffect(() => {
    setTimestamps(AGENTS.map((_, i) => getTimestamp(-(AGENTS.length - i) * 2)))
    setIdleTimestamp(getTimestamp(0))
    setDebatingTimestamps([0, 1, 2].map(i => getTimestamp(-i * 2)))
  }, [])

  return (
    <div
      className="overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #07080D 0%, #050609 100%)',
        border: '1px solid #1C1E26',
        borderRadius: 18,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Terminal header bar ── */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid #1C1E2680', background: 'rgba(255,255,255,0.015)' }}
      >
        {/* macOS traffic lights */}
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F5688' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#FFBD2E88' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#27C93F88' }} />
        </div>

        {/* Center title */}
        <div className="flex items-center gap-2.5">
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            animate={{ opacity: isDebating ? [1, 0.3, 1] : 1 }}
            transition={{ duration: 1, repeat: isDebating ? Infinity : 0 }}
            style={{ background: '#16A37A', boxShadow: '0 0 6px #16A37A' }}
          />
          <span className="font-mono text-[11px] font-bold tracking-[0.1em] text-[#16A37A]">
            AGENT SWARM — LIVE
          </span>
          {isDebating && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="badge-amber"
              style={{ fontSize: 9 }}
            >
              DEBATING
            </motion.span>
          )}
        </div>

        {/* Right: agent pipeline dots */}
        <div className="flex items-center gap-1">
          {AGENTS.map(({ color, name }) => (
            <motion.div
              key={name}
              title={name}
              className="w-2 h-2 rounded-full"
              animate={isDebating
                ? { opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }
                : { opacity: reasoningTrace ? 1 : 0.25, scale: 1 }
              }
              transition={{ duration: 1.2, repeat: isDebating ? Infinity : 0, repeatType: 'loop' }}
              style={{ background: color, boxShadow: reasoningTrace ? `0 0 5px ${color}80` : 'none' }}
            />
          ))}
        </div>
      </div>

      {/* ── Log body ── */}
      <div className="px-5 py-5 flex flex-col gap-3 min-h-[200px]" key={traceKey}>
        <AnimatePresence mode="wait">
          {reasoningTrace ? (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-3"
            >
              {AGENTS.map(({ key, name, color, delay, role }, i) => {
                const text = reasoningTrace[key as keyof typeof reasoningTrace]
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay * 0.08, duration: 0.3 }}
                    className="flex items-start gap-3 font-mono text-xs"
                  >
                    {/* Timestamp */}
                    <span className="text-[#2A2D38] flex-shrink-0 tabular-nums pt-0.5">
                      [{timestamps[i] ?? ''}]
                    </span>
                    {/* Agent name badge */}
                    <span
                      className="flex-shrink-0 font-bold w-[128px] pt-0.5"
                      style={{ color }}
                    >
                      {name}
                    </span>
                    {/* Divider */}
                    <span className="text-[#2A2D38] flex-shrink-0 pt-0.5">│</span>
                    {/* Message */}
                    <TypingText text={text} startDelay={delay} />
                  </motion.div>
                )
              })}

              {/* Consensus line */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-center gap-3 font-mono text-xs mt-1 pt-2"
                style={{ borderTop: '1px solid #1C1E2650' }}
              >
                <span className="text-[#2A2D38] flex-shrink-0 tabular-nums">
                  [{timestamps[AGENTS.length - 1] ?? ''}]
                </span>
                <span className="text-[#16A37A] w-[128px] font-bold flex-shrink-0">SYSTEM</span>
                <span className="text-[#2A2D38] flex-shrink-0">│</span>
                <span style={{ color: '#16A37A' }}>Swarm consensus reached. Executing recommendation.</span>
                <span className="inline-block w-1.5 h-3 bg-[#16A37A] ml-0.5 align-middle animate-blink" />
              </motion.div>
            </motion.div>
          ) : isDebating ? (
            <motion.div
              key="debating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-3"
            >
              {[
                'Initialising multi-agent graph…',
                'FRAUD_DETECTOR scanning ESG claims…',
                'ESG_AUDITOR loading supplier data…',
              ].map((line, i) => (
                <motion.div
                  key={line}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.4 }}
                  className="flex items-center gap-3 font-mono text-xs"
                >
                  <span className="text-[#2A2D38]">[{debatingTimestamps[i] ?? ''}]</span>
                  <span className="text-[#16A37A] w-[128px] font-bold">SYSTEM</span>
                  <span className="text-[#2A2D38]">│</span>
                  <span style={{ color: '#71747D' }}>{line}</span>
                  {i === 2 && (
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      style={{ color: '#16A37A' }}
                    >▌</motion.span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3 font-mono text-xs"
            >
              <span className="text-[#2A2D38]">[{idleTimestamp}]</span>
              <span className="text-[#2A2D38] w-[128px]">SYSTEM</span>
              <span className="text-[#2A2D38]">│</span>
              <span className="text-[#2A2D38]">
                4-agent swarm ready. Press{' '}
                <span style={{ color: '#16A37A' }}>Run Analysis</span>
                {' '}to trigger.
              </span>
              <span className="inline-block w-1.5 h-3 bg-[#2A2D38] ml-0.5 align-middle animate-blink" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
