import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  basicInfo,
  EarlyWarning,
  LoanDecision,
  ReasoningTrace,
  EsgBreakdown,
  ImpactForecast,
  ArbitrageOutput,
  EconomicEmpowerment,
  WhatIfBaseline,
  QuantifiableImpact,
  WhatIfResult,
  WhatIfScenario,
  AppNotification,
  AnalysisHistoryEntry,
} from '@/types'

interface SwarmStore {
  // Live state
  esgScore:      number
  previousScore: number
  isLive:        boolean
  isDebating:    boolean

  // Settings
  esgThreshold:     number
  emailAlerts:      boolean
  autoRefresh:      boolean
  refreshInterval:  number
  settingsSmeName:  string
  settingsIndustry: string
  setSettings: (settings: Partial<{
    esgThreshold: number
    emailAlerts: boolean
    autoRefresh: boolean
    refreshInterval: number
    settingsSmeName: string
    settingsIndustry: string
  }>) => void

  // Agent outputs
  basicInfo:      basicInfo            | null
  earlyWarning:    EarlyWarning         | null
  reasoningTrace:  ReasoningTrace       | null
  loanDecision:    LoanDecision         | null
  arbitrageOutput: ArbitrageOutput      | null
  impactForecast:  ImpactForecast       | null
  whatIfBaseline:  WhatIfBaseline       | null
  esgBreakdown:    EsgBreakdown         | null
  financingRec:    any
  economicData:    EconomicEmpowerment  | null
  greenwashReport: any

  quantifiableImpact: QuantifiableImpact | null

  // Streaming state
  streamedAgents: Record<string, string>   // node_name → agent message (fills live)
  isStreaming:    boolean

  // What-If persistent state
  whatIfValues:    Record<string, number>   // current slider positions
  whatIfScenarios: WhatIfScenario[]          // saved named scenarios

  // Notifications + history (persisted)
  notifications:   AppNotification[]
  analysisHistory: AnalysisHistoryEntry[]
  hasRunAnalysis:  boolean

  // Actions
  loadData:              () => Promise<void>
  triggerDemo:           () => void
  runAnalysis:           () => Promise<void>
  executePivot:          () => Promise<void>
  resetDemo:             () => void
  updateFromSocket:      (data: any) => void
  updateAgentStream:     (node: string, message: string) => void
  setIsStreaming:        (v: boolean) => void
  setWhatIfValues:       (v: Record<string, number>) => void
  saveWhatIfScenario:    (name: string, result: WhatIfResult) => void
  deleteWhatIfScenario:  (id: string) => void
  addNotification:       (n: Pick<AppNotification, 'type' | 'message'>) => void
  markNotificationsRead: () => void
  clearNotifications:    () => void
  addHistoryEntry:       (e: Omit<AnalysisHistoryEntry, 'id' | 'timestamp'>) => void
}

export const useSwarmStore = create<SwarmStore>()(
  persist(
    (set, get) => ({
  esgScore:        88,
  previousScore:   88,
  isLive:          true,
  isDebating:      false,
  esgThreshold:     65,
  emailAlerts:      true,
  autoRefresh:      true,
  refreshInterval:  30,
  settingsSmeName:  '',
  settingsIndustry: 'Manufacturing',

  setSettings: (opts) => set((state) => ({ ...state, ...opts })),

  streamedAgents: {},
  isStreaming:    false,

  whatIfValues: { energy_efficiency_pct: 0, carbon_reduction_pct: 0, revenue_increase_pct: 0 },
  whatIfScenarios: [],

  notifications:   [],
  analysisHistory: [],
  hasRunAnalysis:  false,

  updateAgentStream: (node, message) =>
    set((s) => ({ streamedAgents: { ...s.streamedAgents, [node]: message } })),

  setIsStreaming: (v) => set({ isStreaming: v }),

  setWhatIfValues: (v) => set({ whatIfValues: v }),

  saveWhatIfScenario: (name, result) => {
    const scenario: WhatIfScenario = {
      id:          crypto.randomUUID(),
      name,
      adjustments: get().whatIfValues,
      result,
      savedAt:     new Date().toISOString(),
    }
    set((s) => ({ whatIfScenarios: [...s.whatIfScenarios, scenario] }))
  },

  deleteWhatIfScenario: (id) =>
    set((s) => ({ whatIfScenarios: s.whatIfScenarios.filter((sc) => sc.id !== id) })),

  addNotification: (n) =>
    set((s) => ({
      notifications: [
        ...s.notifications,
        { ...n, id: crypto.randomUUID(), timestamp: new Date().toISOString(), read: false },
      ],
    })),

  markNotificationsRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  clearNotifications: () => set({ notifications: [] }),

  addHistoryEntry: (e) =>
    set((s) => ({
      analysisHistory: [
        ...s.analysisHistory,
        { ...e, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
      ],
    })),

  basicInfo:       null,
  earlyWarning:    null,
  reasoningTrace:  null,
  loanDecision:    null,
  arbitrageOutput: null,
  impactForecast:  null,
  whatIfBaseline:  null,
  esgBreakdown:    null,
  financingRec:    null,
  economicData:    null,
  greenwashReport: null,
  quantifiableImpact: null,

  loadData: async () => {
    // Fetch and populate all state immediately (no animation) — used on initial mount
    let d: any = null
    try {
      const res = await fetch('/api/esg-data')
      if (res.ok) d = await res.json()
    } catch (err) {
      console.error('Failed to fetch ESG data:', err)
    }
    if (!d) return

    const financing = d.financing ?? d.financing_recommendation ?? {}
    set({
      basicInfo: {                              // ← add this
        sme_name: d.basic_info?.sme_name ?? '',
        sector:   d.basic_info?.sector   ?? '',
      },
      esgScore:        d.esg_breakdown?.total_score ?? 88,
      previousScore:   d.executive_summary?.esg_before ?? 88,
      earlyWarning: {
        headline:     d.early_warning?.headline     ?? '',
        esg_drop:     d.early_warning?.esg_drop     ?? 0,
        loan_at_risk: d.early_warning?.loan_at_risk ?? false,
        severity:     d.early_warning?.severity     ?? 'MEDIUM',
      },
      loanDecision: {
        verdict:          d.loan_decision?.verdict          ?? 'REJECT',
        suggested_amount: d.loan_decision?.suggested_amount ?? 0,
        suggested_rate:   String(d.loan_decision?.suggested_rate ?? ''),
        conditions:       d.loan_decision?.conditions        ?? [],
      },
      reasoningTrace: {
        agent_1: d.reasoning_trace?.esg_auditor    ?? '',
        agent_2: d.reasoning_trace?.cfo_critic     ?? '',
        agent_3: d.reasoning_trace?.arbitrageur    ?? '',
        agent_4: d.reasoning_trace?.fraud_detector ?? '',
      },
      esgBreakdown: {
        total_score:   d.esg_breakdown?.total_score   ?? 0,
        environmental: d.esg_breakdown?.environmental ?? 0,
        social:        d.esg_breakdown?.social        ?? 0,
        governance:    d.esg_breakdown?.governance    ?? 0,
        explanation:   `Base ESG: ${d.esg_breakdown?.base_score ?? 0}, Penalty: -${d.esg_breakdown?.total_penalty ?? 0}`,
      },
      greenwashReport: d.greenwash_report ?? null,
      arbitrageOutput: {
        final_action:             d.executive_summary?.recommendation ?? '',
        confidence_score:         d.executive_summary?.confidence      ?? 0,
        reasoning_trace:          d.executive_summary?.recommendation  ?? '',
        financing_recommendation: {
          product:     financing.product     ?? '',
          best_match:  financing.best_match  ?? '',
          alternative: financing.alternative ?? '',
        },
      },
      impactForecast:  d.impact_forecast ?? null,
      whatIfBaseline: {
        current_esg:        d.whatif_baseline?.current_esg_score         ?? d.whatif_baseline?.current_esg    ?? 0,
        current_cogs:       d.whatif_baseline?.current_annual_cogs        ?? d.whatif_baseline?.current_cogs   ?? 0,
        approval_prob:      d.whatif_baseline?.approval_confidence_pct    ?? d.whatif_baseline?.approval_prob  ?? 0,
        env:                d.whatif_baseline?.env                        ?? 60,
        soc:                d.whatif_baseline?.soc                        ?? 65,
        gov:                d.whatif_baseline?.gov                        ?? 80,
        ghg_intensity:      d.whatif_baseline?.ghg_intensity              ?? null,
        renewables_pct:     d.whatif_baseline?.renewables_pct             ?? 0,
        sector:             d.whatif_baseline?.sector                     ?? d.basic_info?.sector ?? '',
        employee_scale:     d.whatif_baseline?.employee_scale             ?? 1.0,
        centrality_penalty: d.whatif_baseline?.centrality_penalty         ?? 0,
      },
      financingRec:    financing,
      economicData:    d.economic_empowerment ?? null,
      quantifiableImpact: d.quantifiable_impact
      ? {
      esg_text: `ESG ${d.quantifiable_impact.esg_delta ?? 0} pts`,
      financial_text: d.quantifiable_impact.financial_text ?? '',
      esg_delta: d.quantifiable_impact.esg_delta ?? 0,
      financial_value: d.quantifiable_impact.financial_value ?? 0,
      }
  : null,
    })
  },

  triggerDemo: async () => {
    // Fetch live data from backend JSON via API route
    let d: any = null
    try {
      const res = await fetch('/api/esg-data')
      if (res.ok) {
        d = await res.json()
      }
    } catch (err) {
      console.error('Failed to fetch ESG data:', err)
    }

    if (!d) return

    // Map backend JSON keys → frontend store shape
    const earlyWarning: EarlyWarning = {
      headline:     d.early_warning?.headline     ?? '',
      esg_drop:     d.early_warning?.esg_drop     ?? 0,
      loan_at_risk: d.early_warning?.loan_at_risk ?? false,
      severity:     d.early_warning?.severity     ?? 'MEDIUM',
    }

    const loanDecision: LoanDecision = {
      verdict:          d.loan_decision?.verdict          ?? 'REJECT',
      suggested_amount: d.loan_decision?.suggested_amount ?? 0,
      suggested_rate:   String(d.loan_decision?.suggested_rate ?? ''),
      conditions:       d.loan_decision?.conditions        ?? [],
    }

    const reasoningTrace: ReasoningTrace = {
      agent_1: d.reasoning_trace?.esg_auditor    ?? '',
      agent_2: d.reasoning_trace?.cfo_critic     ?? '',
      agent_3: d.reasoning_trace?.arbitrageur    ?? '',
      agent_4: d.reasoning_trace?.fraud_detector ?? '',
    }

    const esgBreakdown: EsgBreakdown = {
      total_score:   d.esg_breakdown?.total_score   ?? 0,
      environmental: d.esg_breakdown?.environmental ?? 0,
      social:        d.esg_breakdown?.social        ?? 0,
      governance:    d.esg_breakdown?.governance    ?? 0,
      explanation:   d.esg_breakdown?.explanation   ?? `Base ESG: ${d.esg_breakdown?.base_score ?? 0}, Penalty: -${d.esg_breakdown?.penalty_total ?? 0}`,
    }

    const financing = d.financing ?? d.financing_recommendation ?? {}

    const whatIfBaseline: WhatIfBaseline = {
      current_esg:        d.whatif_baseline?.current_esg_score         ?? d.whatif_baseline?.current_esg    ?? 0,
      current_cogs:       d.whatif_baseline?.current_annual_cogs        ?? d.whatif_baseline?.current_cogs   ?? 0,
      approval_prob:      d.whatif_baseline?.approval_confidence_pct    ?? d.whatif_baseline?.approval_prob  ?? 0,
      env:                d.whatif_baseline?.env                        ?? 60,
      soc:                d.whatif_baseline?.soc                        ?? 65,
      gov:                d.whatif_baseline?.gov                        ?? 80,
      ghg_intensity:      d.whatif_baseline?.ghg_intensity              ?? null,
      renewables_pct:     d.whatif_baseline?.renewables_pct             ?? 0,
      sector:             d.whatif_baseline?.sector                     ?? d.basic_info?.sector ?? '',
      employee_scale:     d.whatif_baseline?.employee_scale             ?? 1.0,
      centrality_penalty: d.whatif_baseline?.centrality_penalty         ?? 0,
    }

    // Step 1 (0ms): Fire early warning + basic info immediately
    set({ isLive: true, earlyWarning, basicInfo: { sme_name: d.basic_info?.sme_name ?? '', sector: d.basic_info?.sector ?? '' } })

    // Step 2 (1s): Enter streaming mode — same state the live Socket.IO path uses
    setTimeout(() => set({ isDebating: true, isStreaming: true, streamedAgents: {} }), 1000)

    // Steps 3a-d: Stream each agent one-by-one — same updateAgentStream path as live backend.
    // TypingText then types each message character-by-character (14ms/char).
    // Spacing: ~2.0s per agent so typing of a ~200 char message completes before next arrives.
    const agentMessages: [string, string, number][] = [
      ['fraud_detector', d.reasoning_trace?.fraud_detector ?? 'Scanning supply chain for greenwash indicators…', 2200],
      ['auditor',        d.reasoning_trace?.esg_auditor    ?? 'Computing E/S/G pillar scores against SEDG framework…', 4400],
      ['cfo',            d.reasoning_trace?.cfo_critic     ?? 'Modelling financial impact and loan coverage ratios…', 6600],
      ['arbitrageur',    d.reasoning_trace?.arbitrageur    ?? 'Synthesising swarm consensus and final recommendation…', 8800],
    ]
    agentMessages.forEach(([node, msg, delay]) => {
      setTimeout(() => get().updateAgentStream(node, msg), delay)
    })

    // Step 4 (10s): Streaming complete — populate all remaining outputs
    setTimeout(() => {
      set({
        isStreaming:     false,
        isDebating:      false,
        previousScore:   d.executive_summary?.esg_before ?? 88,
        esgScore:        esgBreakdown.total_score,
        reasoningTrace,
        loanDecision,
        greenwashReport: d.greenwash_report,
        arbitrageOutput: {
          final_action:             d.executive_summary?.recommendation ?? '',
          confidence_score:         d.executive_summary?.confidence      ?? 0,
          reasoning_trace:          d.executive_summary?.recommendation  ?? '',
          financing_recommendation: {
            product:     financing.product     ?? '',
            best_match:  financing.best_match  ?? '',
            alternative: financing.alternative ?? '',
          },
        },
        impactForecast:  d.impact_forecast,
        whatIfBaseline,
        esgBreakdown,
        financingRec:    financing,
        economicData:    d.economic_empowerment ?? null,
        quantifiableImpact: d.quantifiable_impact
          ? {
              esg_text: `ESG ${d.quantifiable_impact.esg_delta ?? 0} pts`,
              financial_text: d.quantifiable_impact.financial_text ?? '',
              esg_delta: d.quantifiable_impact.esg_delta ?? 0,
              financial_value: d.quantifiable_impact.financial_value ?? 0,
            }
          : null,
        hasRunAnalysis:  true,
      })
      // Record in persistent history and fire notification
      get().addHistoryEntry({
        sme_name:  d.basic_info?.sme_name ?? 'Unknown SME',
        sector:    d.basic_info?.sector   ?? '',
        esg_score: esgBreakdown.total_score,
        verdict:   loanDecision.verdict,
        event:     'demo',
      })
      get().addNotification({
        type:    'analysis_complete',
        message: `Demo analysis complete for ${d.basic_info?.sme_name ?? 'SME'}. ESG score: ${esgBreakdown.total_score}.`,
      })
    }, 10500)
  },

  executePivot: async () => {
    const { arbitrageOutput, loanDecision, esgScore, basicInfo } = get()
    if (!arbitrageOutput) return

    // Derive real ESG delta from the conditions the swarm already calculated
    const conditions  = loanDecision?.conditions ?? []
    const totalDelta  = conditions.reduce((sum, c) => sum + (c.esg_impact ?? 0), 0)
    const newEsg      = Math.min(100, Math.max(0, esgScore + totalDelta))

    try {
      await fetch('/api/execute-pivot', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sme_name:         basicInfo?.sme_name ?? 'Unknown SME',
          final_action:     arbitrageOutput.final_action,
          confidence_score: arbitrageOutput.confidence_score,
          current_esg:      esgScore,
          conditions,
        }),
      })
    } catch {
      // backend unavailable — still apply state update below
    }

    // Apply real computed values (not hardcoded 89)
    set((state) => ({
      previousScore: state.esgScore,
      esgScore:      newEsg,
      earlyWarning:  state.earlyWarning
        ? { ...state.earlyWarning, loan_at_risk: newEsg >= (state.esgThreshold ?? 60) ? false : state.earlyWarning.loan_at_risk }
        : null,
      loanDecision:  state.loanDecision
        ? {
            ...state.loanDecision,
            verdict: (newEsg >= 75 ? 'APPROVE' : newEsg >= 55 ? 'CONDITIONAL' : 'REJECT') as 'APPROVE' | 'CONDITIONAL' | 'REJECT',
          }
        : null,
    }))
    get().addNotification({
      type:    'pivot_executed',
      message: `Arbitrage pivot executed for ${basicInfo?.sme_name ?? 'SME'}. ESG ${esgScore} → ${newEsg}.`,
    })
  },

  runAnalysis: async () => {
    // Reset UI and enter streaming mode
    set({
      isDebating:     true,
      isStreaming:    true,
      streamedAgents: {},
      earlyWarning:   null,
      reasoningTrace: null,
    })
    try {
      await fetch('/api/run-analysis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sme_id: null }),
      })
      // Results flow in via socket.io; no further action needed here
    } catch {
      // Backend unreachable — fall back to triggerDemo
      set({ isStreaming: false })
      get().triggerDemo()
    }
  },

  resetDemo: () => {
    set({
      esgScore:        88,
      previousScore:   88,
      isDebating:      false,
      isStreaming:     false,
      streamedAgents:  {},
      earlyWarning:    null,
      reasoningTrace:  null,
      loanDecision:    null,
      arbitrageOutput: null,
      impactForecast:  null,
      whatIfBaseline:  null,
      esgBreakdown:    null,
      financingRec:    null,
      economicData:    null,
      greenwashReport: null,
      quantifiableImpact: null,
      hasRunAnalysis:  false,
    })
  },

  updateFromSocket: (data: any) => {
    set({
      earlyWarning:   data.early_warning   ?? get().earlyWarning,
      reasoningTrace: data.reasoning_trace ?? get().reasoningTrace,
      loanDecision:   data.loan_decision   ?? get().loanDecision,
      esgScore:       data.esg_breakdown?.total_score ?? get().esgScore,
      hasRunAnalysis: true,
    })
  },
    }),
    {
      // Renamed key from 'green-graphswarm-settings' so stale localStorage
      // from the old schema is silently orphaned rather than needing migration.
      name: 'green-graphswarm-settings-v2',
      partialize: (state) => ({
        esgThreshold:     state.esgThreshold,
        emailAlerts:      state.emailAlerts,
        autoRefresh:      state.autoRefresh,
        refreshInterval:  state.refreshInterval,
        settingsSmeName:  state.settingsSmeName,
        settingsIndustry: state.settingsIndustry,
        whatIfValues:     state.whatIfValues,
        whatIfScenarios:  state.whatIfScenarios,
        notifications:    state.notifications,
        analysisHistory:  state.analysisHistory,
        hasRunAnalysis:   state.hasRunAnalysis,
      }),
    }
  )
)
