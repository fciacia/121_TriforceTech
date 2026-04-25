'use client'
import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, FileJson, Table } from 'lucide-react'
import { useSwarmStore } from '@/store/useSwarmStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(filename: string, content: string, mimeType: string) {
  try {
    const blob = new Blob([content], { type: mimeType })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export failed:', err)
  }
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape  = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExportDataButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const esgBreakdown    = useSwarmStore((s) => s.esgBreakdown)
  const loanDecision    = useSwarmStore((s) => s.loanDecision)
  const whatIfScenarios = useSwarmStore((s) => s.whatIfScenarios)
  const greenwashReport = useSwarmStore((s) => s.greenwashReport)
  const basicInfo       = useSwarmStore((s) => s.basicInfo)
  const impactForecast  = useSwarmStore((s) => s.impactForecast)
  const analysisHistory = useSwarmStore((s) => s.analysisHistory)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const slug = (basicInfo?.sme_name ?? 'sme').replace(/\s+/g, '_').toLowerCase()

  const options: { label: string; icon: typeof Download; action: () => void }[] = [
    {
      label:  'ESG Breakdown (CSV)',
      icon:   Table,
      action: () => {
        if (!esgBreakdown) return
        downloadBlob(`${slug}_esg_breakdown.csv`, toCSV([{ ...esgBreakdown }]), 'text/csv')
      },
    },
    {
      label:  'Loan Conditions (CSV)',
      icon:   Table,
      action: () => {
        const conditions = loanDecision?.conditions ?? []
        if (!conditions.length) return
        downloadBlob(`${slug}_loan_conditions.csv`, toCSV(conditions), 'text/csv')
      },
    },
    {
      label:  'What-If Scenarios (CSV)',
      icon:   Table,
      action: () => {
        if (!whatIfScenarios.length) return
        const rows = whatIfScenarios.map((s) => ({
          name:              s.name,
          saved_at:          s.savedAt,
          ...Object.fromEntries(Object.entries(s.adjustments).map(([k, v]) => [k, v])),
          new_esg_score:     s.result.new_esg_score,
          delta_esg:         s.result.delta_esg,
          new_approval_prob: s.result.new_approval_prob,
          source:            s.result.source ?? '',
        }))
        downloadBlob(`${slug}_whatif_scenarios.csv`, toCSV(rows), 'text/csv')
      },
    },
    {
      label:  'Analysis History (CSV)',
      icon:   Table,
      action: () => {
        if (!analysisHistory.length) return
        downloadBlob(
          `${slug}_analysis_history.csv`,
          toCSV(analysisHistory.map(({ id, ...r }) => r)),
          'text/csv',
        )
      },
    },
    {
      label:  'Full Report (JSON)',
      icon:   FileJson,
      action: () => {
        const data = {
          exported_at:      new Date().toISOString(),
          sme:              basicInfo,
          esg_breakdown:    esgBreakdown,
          loan_decision:    loanDecision,
          greenwash:        greenwashReport,
          impact_forecast:  impactForecast,
          whatif_scenarios: whatIfScenarios,
          analysis_history: analysisHistory,
        }
        downloadBlob(`${slug}_esg_report.json`, JSON.stringify(data, null, 2), 'application/json')
      },
    },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#EAEAEA] transition-all duration-200 hover:bg-[#1C1E2660]"
        style={{ background: '#111318', border: '1px solid #1C1E26' }}
      >
        <Download size={13} />
        Export Data
        <ChevronDown
          size={11}
          className="text-[#3E414D] transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-56 rounded-xl z-50 overflow-hidden"
          style={{
            background:  '#0D0E14',
            border:      '1px solid #1C1E26',
            boxShadow:   '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {options.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={() => { action(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#C8CACD] hover:bg-[#1C1E26] hover:text-[#EAEAEA] transition-colors text-left"
            >
              <Icon size={11} style={{ color: '#3E414D', flexShrink: 0 }} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
