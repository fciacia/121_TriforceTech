'use client'
import { forwardRef } from 'react'
import { useSwarmStore } from '@/store/useSwarmStore'

const VERDICT_COLOR: Record<string, string> = {
  'CONDITIONAL APPROVAL': '#F59E0B',
  'APPROVE':              '#16A34A',
  'REJECT':               '#DC2626',
}

type Props = { printDate: string }

const ExecutiveSummaryReport = forwardRef<HTMLDivElement, Props>(({ printDate }, ref) => {
  const loanDecision   = useSwarmStore((s) => s.loanDecision)
  const esgBreakdown   = useSwarmStore((s) => s.esgBreakdown)
  const impactForecast = useSwarmStore((s) => s.impactForecast)
  const reasoningTrace = useSwarmStore((s) => s.reasoningTrace)
  const arbitrageOutput = useSwarmStore((s) => s.arbitrageOutput)

  // Fall back to mock values if store is empty (direct navigation)
  const verdict      = loanDecision?.verdict ?? 'CONDITIONAL'
  const verdictLabel = verdict === 'APPROVE' ? 'APPROVED' : verdict === 'REJECT' ? 'REJECTED' : 'CONDITIONAL APPROVAL'
  const verdictColor = VERDICT_COLOR[verdictLabel] ?? '#F59E0B'

  const esgScore  = esgBreakdown?.total_score ?? 76
  const confidence = arbitrageOutput?.confidence_score ?? 91
  const quantifiableImpact = useSwarmStore((s) => s.quantifiableImpact)
  const netImpact  =  quantifiableImpact?.financial_value 
  const amount     = loanDecision?.suggested_amount ?? 120000
  const rate       = loanDecision?.suggested_rate   ?? '3.5% Green Tier'
  const conditions = loanDecision?.conditions       ?? []

  return (
    <div
      ref={ref}
      className="bg-white text-gray-900 font-sans"
      style={{ width: 794, minHeight: 1123, padding: '48px 56px', boxSizing: 'border-box' }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid #16A34A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="GreenTrust Pulse" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <div>
            <p style={{ fontWeight: 800, fontSize: 18, color: '#111', lineHeight: 1.2 }}>GreenTrust Pulse</p>
            <p style={{ fontSize: 11, color: '#6B7280' }}>AI-Powered ESG Intelligence</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: '#6B7280' }}>ESG Assessment Report</p>
          <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{printDate}</p>
          <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Ahmad&apos;s Packaging Sdn Bhd</p>
        </div>
      </div>

      {/* ── Verdict banner ── */}
      <div style={{ background: `${verdictColor}18`, border: `2px solid ${verdictColor}55`, borderRadius: 12, padding: '18px 24px', marginBottom: 28, textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: verdictColor, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Loan Decision</p>
        <p style={{ fontSize: 26, fontWeight: 800, color: verdictColor }}>{verdictLabel}</p>
        <p style={{ fontSize: 13, color: '#4B5563', marginTop: 6 }}>
          RM {amount.toLocaleString()} · {rate}
        </p>
      </div>

      {/* ── Key metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'ESG Score',   value: `${esgScore}/100`,  color: esgScore >= 85 ? '#16A34A' : esgScore >= 70 ? '#D97706' : '#DC2626' },
          { label: 'AI Confidence', value: `${confidence}%`,  color: '#7C3AED' },
          { label: 'Net Impact',  value: `${netImpact}`,            color: '#16A34A' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'monospace' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── ESG breakdown ── */}
      {esgBreakdown && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #E5E7EB' }}>ESG Breakdown</p>
          {[
            { label: 'Environmental', value: esgBreakdown.environmental, color: '#16A34A' },
            { label: 'Social',        value: esgBreakdown.social,        color: '#7C3AED' },
            { label: 'Governance',    value: esgBreakdown.governance,    color: '#D97706' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: '#4B5563', width: 100 }}>{label}</p>
              <div style={{ flex: 1, height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4 }} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'monospace', width: 32, textAlign: 'right' }}>{value}</p>
            </div>
          ))}
          <p style={{ fontSize: 10, color: '#6B7280', marginTop: 8 }}>{esgBreakdown.explanation}</p>
        </div>
      )}

      {/* ── AI Reasoning ── */}
      {reasoningTrace && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #E5E7EB' }}>AI Agent Reasoning</p>
          {[
            { agent: 'Fraud Detector', key: 'agent_4', color: '#7C3AED' },
            { agent: 'ESG Auditor',    key: 'agent_1', color: '#16A34A' },
            { agent: 'CFO',            key: 'agent_2', color: '#DC2626' },
            { agent: 'Arbitrageur',    key: 'agent_3', color: '#D97706' },
          ].map(({ agent, key, color }) => (
            <div key={key} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flexShrink: 0, width: 72, paddingTop: 2 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{agent}</p>
              </div>
              <p style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>
                {reasoningTrace[key as keyof typeof reasoningTrace]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Conditions ── */}
      {conditions.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #E5E7EB' }}>Approval Conditions</p>
          {conditions.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <p style={{ fontSize: 12, color: '#D97706', fontWeight: 700, flexShrink: 0 }}>→</p>
              <p style={{ fontSize: 11, color: '#374151' }}>
              {typeof c === 'string' ? c : c.action ?? c.action ?? c.reason ?? JSON.stringify(c)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── 30/60/90 Forecast ── */}
      {impactForecast && (
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #E5E7EB' }}>Impact Forecast</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Day 30', text: impactForecast.day_30, color: '#7C3AED' },
              { label: 'Day 60', text: impactForecast.day_60, color: '#D97706' },
              { label: 'Day 90', text: impactForecast.day_90, color: '#16A34A' },
            ].map(({ label, text, color }) => (
              <div key={label} style={{ background: '#F9FAFB', border: `1px solid ${color}44`, borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 10, color: '#374151', lineHeight: 1.5 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 9, color: '#9CA3AF' }}>AI-generated report — for advisory purposes only. Not a substitute for professional financial advice.</p>
        <p style={{ fontSize: 9, color: '#9CA3AF' }}>GreenTrust Pulse © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
})

ExecutiveSummaryReport.displayName = 'ExecutiveSummaryReport'
export default ExecutiveSummaryReport
