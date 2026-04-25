'use client'
import { useState, useRef, useEffect } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, BookmarkPlus, Trash2, X } from 'lucide-react'
import { useWhatIf } from '@/hooks/useWhatIf'
import { useSwarmStore } from '@/store/useSwarmStore'
import type { WhatIfScenario } from '@/types'

const SLIDERS = [
  { key: 'energy_efficiency_pct', label: 'Energy Efficiency Improvement', max: 50,  unit: '%' },
  { key: 'carbon_reduction_pct',  label: 'Carbon Emissions Reduction',    max: 50,  unit: '%' },
  { key: 'revenue_increase_pct',  label: 'Revenue Growth',                max: 100, unit: '%' },
] as const

function Slider({
  value, max, onChange,
}: {
  value: number; max: number; onChange: (v: number) => void
}) {
  return (
    <SliderPrimitive.Root
      className="relative flex items-center select-none touch-none w-full h-5"
      min={0} max={max} step={1} value={[value]}
      onValueChange={([v]) => onChange(v)}
    >
      <SliderPrimitive.Track
        className="relative grow rounded-full overflow-hidden"
        style={{ height: 3, background: '#1C1E26' }}
      >
        <SliderPrimitive.Range
          className="absolute h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #16A37A, #0D9268)' }}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block rounded-full bg-white cursor-grab active:cursor-grabbing focus:outline-none"
        style={{
          width: 14, height: 14,
          boxShadow: '0 0 0 3px #16A37A40, 0 2px 8px rgba(0,0,0,0.5)',
        }}
      />
    </SliderPrimitive.Root>
  )
}

export default function WhatIfSlider() {
  const whatIfBaseline       = useSwarmStore((s) => s.whatIfBaseline)
  const values               = useSwarmStore((s) => s.whatIfValues)
  const scenarios            = useSwarmStore((s) => s.whatIfScenarios)
  const setWhatIfValues      = useSwarmStore((s) => s.setWhatIfValues)
  const saveWhatIfScenario   = useSwarmStore((s) => s.saveWhatIfScenario)
  const deleteWhatIfScenario = useSwarmStore((s) => s.deleteWhatIfScenario)
  const { simulate, result, isLoading, isOffline } = useWhatIf()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scenario naming state
  const [saveName,   setSaveName]   = useState('')
  const [showSaveUI, setShowSaveUI] = useState(false)

  const handleChange = (key: string, v: number) => {
    const next = { ...values, [key]: v }
    setWhatIfValues(next) // update UI immediately
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => simulate(next), 400)
  }

  const handleSave = () => {
    const name = saveName.trim() || `Scenario ${scenarios.length + 1}`
    if (!result) return
    saveWhatIfScenario(name, result)
    setSaveName('')
    setShowSaveUI(false)
  }

  const baseEsg       = whatIfBaseline?.current_esg    ?? 76
  const baseProb      = whatIfBaseline?.approval_prob  ?? 62
  const projectedEsg  = result?.new_esg_score    ?? baseEsg
  const projectedProb = result?.new_approval_prob ?? baseProb
  const deltaEsg      = result?.delta_esg ?? 0

  const anySliderMoved = Object.values(values).some((v) => v > 0)

  return (
    <div className="card flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[#EAEAEA] text-sm font-semibold">What-If Simulator</p>
        </div>
        <span className="text-[11px] text-[#3E414D]">Adjust parameters to model ESG impact</span>
      </div>

      <div className="grid grid-cols-2 gap-10">
        {/* ── Left: sliders ── */}
        <div className="flex flex-col gap-6">
          {SLIDERS.map(({ key, label, max, unit }) => (
            <div key={key} className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#71747D]">{label}</span>
                <span className="font-mono text-xs font-semibold text-[#EAEAEA]">
                  {values[key]}{unit}
                </span>
              </div>
              <Slider
                value={values[key]}
                max={max}
                onChange={(v) => handleChange(key, v)}
              />
              {/* micro-labels */}
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-[#3E414D]">0{unit}</span>
                <span className="font-mono text-[10px] text-[#3E414D]">{max}{unit}</span>
              </div>
            </div>
          ))}

          {/* ── Save scenario ── */}
          <AnimatePresence>
            {anySliderMoved && result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {!showSaveUI ? (
                  <button
                    onClick={() => setShowSaveUI(true)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold transition-all"
                    style={{ color: '#16A37A' }}
                  >
                    <BookmarkPlus size={12} />
                    Save as scenario
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveUI(false) }}
                      placeholder={`Scenario ${scenarios.length + 1}`}
                      className="flex-1 rounded-lg px-2.5 py-1.5 text-xs text-[#EAEAEA] placeholder-[#3E414D] outline-none"
                      style={{ background: '#1C1E26', border: '1px solid #2A2D38' }}
                    />
                    <button
                      onClick={handleSave}
                      disabled={!result}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                      style={{ background: '#16A37A' }}
                    >
                      Save
                    </button>
                    <button onClick={() => setShowSaveUI(false)}>
                      <X size={12} style={{ color: '#3E414D' }} />
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right: live results ── */}
        <div
          className="flex flex-col gap-5 justify-center pl-10"
          style={{ borderLeft: '1px solid #1C1E2680' }}
        >
          {/* ESG Score: from → to */}
          <div>
            <p className="section-label mb-2">ESG Score</p>
            <div className="flex items-end gap-3">
              <motion.span
                key={projectedEsg}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="font-mono font-bold text-3xl text-[#EAEAEA]"
                style={{ letterSpacing: '-0.02em' }}
              >
                {baseEsg}
              </motion.span>
              <span className="text-[#16A37A] text-lg font-mono mb-0.5">→</span>
              <motion.span
                key={`p-${projectedEsg}`}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="font-mono font-bold text-3xl"
                style={{
                  color: deltaEsg > 0 ? '#16A37A' : deltaEsg < 0 ? '#DC2626' : '#EAEAEA',
                  textShadow: deltaEsg > 0 ? '0 0 20px #16A37A50' : 'none',
                  letterSpacing: '-0.02em',
                }}
              >
                {projectedEsg}
              </motion.span>
              {deltaEsg !== 0 && (
                <span
                  className="font-mono text-xs font-bold mb-1 px-2 py-0.5 rounded-full"
                  style={{
                    color: deltaEsg > 0 ? '#16A37A' : '#DC2626',
                    background: deltaEsg > 0 ? '#16A37A15' : '#DC262615',
                    border: `1px solid ${deltaEsg > 0 ? '#16A37A25' : '#DC262625'}`,
                  }}
                >
                  {deltaEsg > 0 ? '+' : ''}{deltaEsg} pts
                </span>
              )}
            </div>
          </div>

          {/* Approval probability: from → to */}
          <div>
            <p className="section-label mb-2">Approval Probability</p>
            <div className="flex items-end gap-3">
              <span className="font-mono font-semibold text-xl text-[#EAEAEA]" style={{ letterSpacing: '-0.02em' }}>{baseProb}%</span>
              <span className="text-[#16A37A] font-mono mb-0.5">→</span>
              <motion.span
                key={projectedProb}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="font-mono font-semibold text-xl"
                style={{
                  color: projectedProb > baseProb ? '#16A37A' : '#EAEAEA',
                  letterSpacing: '-0.02em',
                }}
              >
                {projectedProb}%
              </motion.span>
            </div>
          </div>

          {/* Message */}
          {result?.message && (
            <p
              className="text-[#71747D] text-xs leading-relaxed pt-4"
              style={{ borderTop: '1px solid #1C1E2660' }}
            >
              {isLoading ? 'Calculating…' : result.message}
            </p>
          )}

          {!result && (
            <p className="text-[#2A2D38] text-xs font-mono italic">
              — move a slider to simulate
            </p>
          )}
        </div>
      </div>

      {/* ── Saved Scenarios ── */}
      <AnimatePresence>
        {scenarios.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ScenarioComparison scenarios={scenarios} baseEsg={baseEsg} baseProb={baseProb} onDelete={deleteWhatIfScenario} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Chat section ── */}
      <div
        className="rounded-2xl flex flex-col gap-0 overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0A0C12 0%, #070810 100%)',
          border: '1px solid #16A37A28',
          boxShadow: '0 0 0 1px #16A37A10, 0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Chat header bar */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid #16A37A20', background: '#16A37A0A' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #16A37A25, #16A37A10)', border: '1px solid #16A37A35' }}
          >
            <Bot size={14} style={{ color: '#16A37A' }} />
          </div>
          <div className="flex-1">
            <p className="text-[#EAEAEA] text-xs font-semibold leading-none">Ask the AI</p>
            <p className="text-[#3E414D] text-[10px] mt-0.5">What if I change something? Get instant ESG impact</p>
          </div>
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ background: '#16A37A', boxShadow: '0 0 5px #16A37A' }}
          />
        </div>

        {/* Chat body */}
        <div className="px-4 py-4">
          <WhatIfChat baseEsg={baseEsg} baseProb={baseProb} />
        </div>
      </div>
    </div>
  )
}

// ─── Scenario Comparison Panel ────────────────────────────────────────────────
const SLIDER_SHORT: Record<string, string> = {
  energy_efficiency_pct: 'Energy',
  carbon_reduction_pct:  'Carbon',
  revenue_increase_pct:  'Revenue',
}

function ScenarioComparison({
  scenarios, baseEsg, baseProb, onDelete,
}: {
  scenarios:  WhatIfScenario[]
  baseEsg:    number
  baseProb:   number
  onDelete:   (id: string) => void
}) {
  // Cap at 4 scenarios side by side
  const visible = scenarios.slice(-4)

  return (
    <div
      className="rounded-2xl flex flex-col gap-4 p-5"
      style={{ background: '#0A0C12', border: '1px solid #1C1E26' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.1em] font-semibold text-[#3E414D]">
          Saved Scenarios
        </p>
        <span className="text-[10px] text-[#2A2D38]">{scenarios.length} saved</span>
      </div>

      {/* Baseline column + scenario columns */}
      <div className="overflow-x-auto">
        <div className="flex gap-3 min-w-0" style={{ minWidth: (visible.length + 1) * 140 }}>

          {/* Baseline */}
          <div
            className="flex flex-col gap-2 flex-shrink-0 rounded-xl p-3"
            style={{ width: 136, background: '#111318', border: '1px solid #1C1E26' }}
          >
            <p className="text-[10px] font-bold text-[#3E414D] uppercase tracking-[0.08em]">Baseline</p>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-lg font-bold text-[#EAEAEA]">{baseEsg}</span>
              <span className="text-[10px] text-[#3E414D]">ESG score</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-sm font-semibold text-[#EAEAEA]">{baseProb}%</span>
              <span className="text-[10px] text-[#3E414D]">Approval</span>
            </div>
            <div className="flex flex-col gap-0.5 mt-1">
              {Object.entries(SLIDER_SHORT).map(([k, label]) => (
                <span key={k} className="text-[10px] text-[#2A2D38] font-mono">
                  {label} 0%
                </span>
              ))}
            </div>
          </div>

          {/* Scenario columns */}
          {visible.map((sc, i) => {
            const delta    = sc.result.delta_esg
            const positive = delta > 0
            return (
              <motion.div
                key={sc.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex flex-col gap-2 flex-shrink-0 rounded-xl p-3 relative"
                style={{
                  width: 136,
                  background: positive ? '#16A37A08' : '#DC262608',
                  border: `1px solid ${positive ? '#16A37A25' : '#DC262625'}`,
                }}
              >
                {/* Delete */}
                <button
                  onClick={() => onDelete(sc.id)}
                  className="absolute top-2 right-2 opacity-30 hover:opacity-80 transition-opacity"
                >
                  <Trash2 size={10} style={{ color: '#6B7280' }} />
                </button>

                <p
                  className="text-[10px] font-bold uppercase tracking-[0.06em] pr-4 leading-tight"
                  style={{ color: positive ? '#16A37A' : '#DC2626' }}
                >
                  {sc.name}
                </p>

                {/* ESG */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-lg font-bold text-[#EAEAEA]">
                      {sc.result.new_esg_score}
                    </span>
                    <span
                      className="font-mono text-[10px] font-bold"
                      style={{ color: positive ? '#16A37A' : '#DC2626' }}
                    >
                      {positive ? '+' : ''}{delta}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#3E414D]">ESG score</span>
                </div>

                {/* Approval */}
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-sm font-semibold text-[#EAEAEA]">
                    {sc.result.new_approval_prob}%
                  </span>
                  <span className="text-[10px] text-[#3E414D]">Approval</span>
                </div>

                {/* Slider values */}
                <div className="flex flex-col gap-0.5 mt-1">
                  {Object.entries(SLIDER_SHORT).map(([k, label]) => (
                    <span key={k} className="text-[10px] font-mono" style={{ color: '#3E414D' }}>
                      {label} {sc.adjustments[k] ?? 0}%
                    </span>
                  ))}
                </div>

                {/* Source badge */}
                {sc.result.source === 'offline_estimate' && (
                  <span className="text-[8px] font-semibold mt-auto" style={{ color: '#D97706' }}>
                    est.
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Local question parser ────────────────────────────────────────────────────
// function answerQuestion(q: string, baseEsg: number, baseProb: number): string {
//   const lower = q.toLowerCase()

//   if (/solar|renewable|energy efficiency|clean energy/.test(lower)) {
//     const newEsg  = Math.min(100, baseEsg + 8)
//     const newProb = Math.min(99, Math.round(baseProb + 8 * 1.2))
//     return `Installing solar panels typically adds ~8 pts to your ESG score (Environmental pillar). ESG: ${baseEsg} → ${newEsg}. Approval probability: ${baseProb}% → ${newProb}%. This also satisfies the "verified emissions report" condition on your current loan.`
//   }
//   if (/supplier c|switch supplier|carbon.neutral supplier/.test(lower)) {
//     const newEsg  = Math.min(100, baseEsg + 13)
//     const newProb = Math.min(99, Math.round(baseProb + 13 * 1.2))
//     return `Switching to Supplier C (carbon-neutral certified) removes the -12 pt violation penalty and adds +1 pt for certified sourcing. ESG: ${baseEsg} → ${newEsg}. Approval probability: ${baseProb}% → ${newProb}%. COGS increases by ~RM 8,000/year but net financial benefit is RM 4,000 after interest savings.`
//   }
//   if (/waste|landfill|zero waste/.test(lower)) {
//     const newEsg  = Math.min(100, baseEsg + 5)
//     const newProb = Math.min(99, Math.round(baseProb + 5 * 1.2))
//     return `Resolving the landfill violation clears the greenwash flag and adds ~5 pts (Environmental + Governance). ESG: ${baseEsg} → ${newEsg}. Approval probability: ${baseProb}% → ${newProb}%. Also removes the HIGH greenwash risk label from your profile.`
//   }
//   if (/carbon|emission|co2/.test(lower)) {
//     const newEsg  = Math.min(100, baseEsg + 6)
//     const newProb = Math.min(99, Math.round(baseProb + 6 * 1.2))
//     return `A verified 20% carbon emissions reduction adds ~6 pts (Environmental). ESG: ${baseEsg} → ${newEsg}. Approval probability: ${baseProb}% → ${newProb}%. Submitting a certified emissions report also satisfies condition 2 on your CONDITIONAL loan approval.`
//   }
//   if (/revenue|sales|grow|profit/.test(lower)) {
//     const newEsg  = Math.min(100, baseEsg + 4)
//     const newProb = Math.min(99, Math.round(baseProb + 4 * 1.2))
//     return `Revenue growth improves the Social pillar (local employment, community spending). A 20% revenue increase adds ~4 pts. ESG: ${baseEsg} → ${newEsg}. Approval probability: ${baseProb}% → ${newProb}%. Note: financial growth alone won't clear greenwash flags.`
//   }
//   if (/loan|interest|tier|rate/.test(lower)) {
//     return `Your current CONDITIONAL loan is at 3.5% Green Tier (RM 120,000). To convert to APPROVE, you need ESG ≥ 85 (currently ${baseEsg}). You need +${Math.max(0, 85 - baseEsg)} pts — achievable by switching to Supplier C alone (+13 pts). Interest savings vs. doing nothing: RM 12,000/year.`
//   }
//   if (/job|worker|employment|community/.test(lower)) {
//     const newEsg  = Math.min(100, baseEsg + 3)
//     return `Increasing local employment to 20+ workers adds ~3 pts to the Social pillar. ESG: ${baseEsg} → ${newEsg}. Community impact score improves from 74 → ~82. This also strengthens your Sustainability-Linked Loan covenant compliance.`
//   }
//   if (/certif|iso|audit/.test(lower)) {
//     const newEsg  = Math.min(100, baseEsg + 7)
//     const newProb = Math.min(99, Math.round(baseProb + 7 * 1.2))
//     return `Obtaining ISO 14001 or a carbon-neutral certification adds ~7 pts (Governance + Environmental). ESG: ${baseEsg} → ${newEsg}. Approval probability: ${baseProb}% → ${newProb}%. Certification also unlocks eligibility for the Malaysia Green Technology Grant.`
//   }

//   // Generic fallback
//   return `Based on your current ESG score of ${baseEsg} and ${baseProb}% approval probability, I'd need more specifics to model that scenario. Try asking about: switching suppliers, solar/renewable energy, carbon emissions reduction, ISO certification, or revenue growth.`
// }

// ─── Chat UI ──────────────────────────────────────────────────────────────────
interface ChatMessage {
  id:   number
  role: 'user' | 'ai'
  text: string
}

function WhatIfChat({ baseEsg, baseProb }: { baseEsg: number; baseProb: number }) {
  const esgBreakdown = useSwarmStore((s) => s.esgBreakdown)
  const basicInfo    = useSwarmStore((s) => s.basicInfo)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id:   0,
      role: 'ai',
      text: 'Ask me anything — e.g. "What if I install solar panels?" or "What happens if I switch to Supplier C?"',
    },
  ])
  const [input,     setInput]     = useState('')
  const [thinking,  setThinking]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  // const handleSend = () => {
  //   const q = input.trim()
  //   if (!q || thinking) return

  //   const userMsg: ChatMessage = { id: Date.now(), role: 'user', text: q }
  //   setMessages(prev => [...prev, userMsg])
  //   setInput('')
  //   setThinking(true)

  //   // Simulate ~800ms "thinking" delay
  //   setTimeout(() => {
  //     const answer = answerQuestion(q, baseEsg, baseProb)
  //     setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: answer }])
  //     setThinking(false)
  //   }, 800)
  // }
  const handleSend = async () => {
  const q = input.trim()
  if (!q || thinking) return

  const userMsg: ChatMessage = { id: Date.now(), role: 'user', text: q }
  setMessages(prev => [...prev, userMsg])
  setInput('')
  setThinking(true)

  try {
    const res = await fetch('http://localhost:8000/whatif/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: q,
        current_scores: {
          esg:      baseEsg,
          env:      esgBreakdown?.environmental ?? 38,
          soc:      esgBreakdown?.social        ?? 51,
          gov:      esgBreakdown?.governance    ?? 43,
          approval: baseProb,
        },
      company_context: {
      sme_name: basicInfo?.sme_name ?? '',
      sector:   basicInfo?.sector   ?? '',
  },
}),
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE frames are separated by double newlines
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''   // keep the incomplete trailing chunk

      for (const frame of frames) {
        const line = frame.trim()
        if (!line.startsWith('data:')) continue

        const json = line.slice(5).trim()
        const event = JSON.parse(json)

        if (event.event === 'status') {
          // Optional: show a transient "Analysing…" bubble
          // setMessages(prev => [...prev, { id: -1, role: 'ai', text: event.message }])

        } else if (event.event === 'result') {
          const d = event.data
          // d matches your backend JSON: summary, esg_new, chips, etc.
          const text = [
            d.summary,
            `ESG: ${baseEsg} → ${d.esg_new}  (${d.esg_delta >= 0 ? '+' : ''}${d.esg_delta} pts)`,
            `Risk: ${d.risk} · Timeframe: ${d.timeframe}`,
            d.financial_note,
          ].filter(Boolean).join('\n')

          setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text }])

        } else if (event.event === 'error') {
          setMessages(prev => [...prev, {
            id: Date.now(), role: 'ai',
            text: `Error: ${event.message}`,
          }])

        } else if (event.event === '__done__') {
          break
        }
      }
    }
  } catch (err) {
    setMessages(prev => [...prev, {
      id: Date.now(), role: 'ai',
      text: 'Could not reach the analysis server. Is the backend running?',
    }])
  } finally {
    setThinking(false)
  }
}

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend()
  }

  const SUGGESTIONS = [
    'What if I switch to Supplier C?',
    'What if I install solar panels?',
    'What if I reduce carbon emissions 20%?',
  ]

  return (
    <div className="flex flex-col gap-3">

      {/* Message history */}
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-5 h-5 rounded-full bg-[#16A37A15] border border-[#16A37A30] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={10} className="text-[#16A37A]" />
                </div>
              )}
            <div
                className={`max-w-[80%] rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'text-[#EAEAEA] rounded-br-sm'
                    : 'text-[#C8CACD] rounded-bl-sm'
                }`}
                style={msg.role === 'user'
                  ? { background: '#16A37A18', border: '1px solid #16A37A30' }
                  : { background: '#0D0E14', border: '1px solid #1C1E2680' }
                }
              >
                {msg.text}
              </div>
            </motion.div>
          ))}

          {thinking && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 justify-start"
            >
              <div className="w-5 h-5 rounded-full bg-[#16A37A15] border border-[#16A37A30] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={10} className="text-[#16A37A]" />
              </div>
              <div className="bg-[#161820] border border-[#1C1E26] rounded-xl rounded-bl-sm px-3 py-2 flex gap-1 items-center">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <motion.span
                    key={i}
                    className="w-1 h-1 rounded-full bg-[#3E414D]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips — always visible, not just on first message */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setInput(s)}
            className="text-[11px] font-medium transition-all duration-150"
            style={{
              color: '#16A37A',
              background: '#16A37A10',
              border: '1px solid #16A37A25',
              borderRadius: 20,
              padding: '5px 10px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#16A37A20'
              e.currentTarget.style.borderColor = '#16A37A50'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#16A37A10'
              e.currentTarget.style.borderColor = '#16A37A25'
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div
        className="flex gap-2 rounded-xl p-1.5"
        style={{ background: '#0D0E14', border: '1px solid #1C1E26' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="e.g. What if I install solar panels?"
          className="flex-1 bg-transparent px-2 py-1.5 text-xs text-[#EAEAEA] placeholder-[#3E414D] focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || thinking}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-150 disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, #16A37A, #0D9268)', boxShadow: '0 2px 8px #16A37A30' }}
        >
          <Send size={11} />
          Ask
        </button>
      </div>
    </div>
  )
}
