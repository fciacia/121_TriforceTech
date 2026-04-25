'use client'
import { useState } from 'react'
import { useSwarmStore } from '@/store/useSwarmStore'
import type { WhatIfResult } from '@/types'

// Mirror of esg_math.py calculate_sector_weights()
function sectorWeights(sector?: string): { E: number; S: number; G: number } {
  const s = (sector ?? '').toLowerCase()
  if (s.includes('logistic') || s.includes('transport') || s.includes('shipping'))
    return { E: 0.55, S: 0.25, G: 0.20 }
  if (s.includes('manufacturing'))
    return { E: 0.45, S: 0.30, G: 0.25 }
  if (s.includes('it') || s.includes('software') || s.includes('services') || s.includes('consulting'))
    return { E: 0.25, S: 0.40, G: 0.35 }
  return { E: 0.40, S: 0.35, G: 0.25 }
}

export function useWhatIf() {
  const [result,    setResult]    = useState<WhatIfResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const whatIfBaseline = useSwarmStore((s) => s.whatIfBaseline)

  const simulate = async (adjustments: Record<string, number>) => {
    setIsLoading(true)
    setIsOffline(false)

    const baseline = {
      current_esg:        whatIfBaseline?.current_esg         ?? 76,
      approval_prob:      whatIfBaseline?.approval_prob        ?? 62,
      env:                whatIfBaseline?.env                  ?? 60,
      soc:                whatIfBaseline?.soc                  ?? 65,
      gov:                whatIfBaseline?.gov                  ?? 80,
      ghg_intensity:      whatIfBaseline?.ghg_intensity        ?? null,
      renewables_pct:     whatIfBaseline?.renewables_pct       ?? 0,
      sector:             whatIfBaseline?.sector               ?? '',
      employee_scale:     whatIfBaseline?.employee_scale       ?? 1.0,
      centrality_penalty: whatIfBaseline?.centrality_penalty   ?? 0,
    }

    try {
      const res = await fetch(
        '/api/whatif',
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ baseline, adjustments }),
          signal:  AbortSignal.timeout(8000),
        }
      )
      if (res.ok) {
        const data = await res.json()
        if (!data.offline) {
          setResult({ ...data, source: 'backend' as const })
          setIsLoading(false)
          return
        }
        // proxy signalled backend is down — fall through to offline estimation
      }
    } catch {
      // network error — fall through to offline estimation
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OFFLINE FALLBACK — exact replica of esg_math.py scoring bands
    // ─────────────────────────────────────────────────────────────────────────
    setIsOffline(true)

    const currentE  = baseline.env
    const currentS  = baseline.soc
    const currentG  = baseline.gov
    const baseProb  = baseline.approval_prob
    const base      = baseline.current_esg

    // If ghg_intensity not stored, reverse-engineer from E score band midpoints
    const intensity = (baseline.ghg_intensity != null && baseline.ghg_intensity > 0)
      ? baseline.ghg_intensity
      : currentE >= 85 ? 2.5 : currentE >= 70 ? 10.0 : currentE >= 55 ? 22.5 : 40.0

    const energyEff  = (adjustments.energy_efficiency_pct ?? 0) / 100.0
    const carbonRed  = (adjustments.carbon_reduction_pct  ?? 0) / 100.0
    const revenueInc = (adjustments.revenue_increase_pct  ?? 0) / 100.0

    // Energy efficiency cuts nonrenewable fuel (×0.7 efficiency factor),
    // carbon reduction cuts total GHG output; combined multiplicatively.
    const emissionsFactor = (1.0 - energyEff * 0.7) * (1.0 - carbonRed)
    const newIntensity    = intensity * emissionsFactor / (1.0 + revenueInc)

    // Stepped E-score bands (mirrors calculate_pillar_scores exactly)
    let newE = newIntensity < 5 ? 85 : newIntensity < 15 ? 70 : newIntensity < 30 ? 55 : 35

    // Renewables bonus: efficiency shifts nonrenewable → renewable share
    const renewPct       = baseline.renewables_pct
    const nonrenewBefore = 100.0 - renewPct
    const nonrenewAfter  = nonrenewBefore * (1.0 - energyEff * 0.7)
    const newTotal       = nonrenewAfter + renewPct
    const newRenewPct    = newTotal > 0 ? (renewPct / newTotal * 100.0) : renewPct
    if (newRenewPct > 60 || renewPct > 60) newE += 15
    newE = Math.min(100, newE)

    const weights  = sectorWeights(baseline.sector)
    const scale    = baseline.employee_scale
    const penalty  = baseline.centrality_penalty

    const oldBase  = currentE * weights.E + currentS * weights.S + currentG * weights.G
    const newBase  = newE     * weights.E + currentS * weights.S + currentG * weights.G

    const oldEsg   = Math.max(0, Math.min(100, oldBase * scale) - penalty)
    const newEsg   = Math.max(0, Math.min(100, newBase * scale) - penalty)
    const delta    = Math.round((newEsg - oldEsg) * 10) / 10

    // Approval probability: same +1.5×delta rule as backend /whatif endpoint
    const newProb = Math.min(99, Math.max(1, baseProb + (newEsg - base) * 1.5))

    setResult({
      new_esg_score:     Math.round(newEsg * 10) / 10,
      new_approval_prob: Math.round(newProb * 10) / 10,
      delta_esg:         delta,
      message: `ESG improves to ${Math.round(newEsg)} → approval probability: ${Math.round(newProb)}%`,
      source:            'offline_estimate',
    })
    setIsLoading(false)
  }

  return { simulate, result, isLoading, isOffline }
}
