export type RiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW'
export type LoanVerdict  = 'APPROVE' | 'REJECT' | 'CONDITIONAL'

export interface basicInfo {
  sme_name: string
  sector:   string
}

export interface EarlyWarning {
  headline:     string
  esg_drop:     number
  loan_at_risk: boolean
  severity:     RiskSeverity
}

type LoanCondition = {
  action: string
  action_type: string
  financial_impact: number
  esg_impact: number
  reason: string
}

export interface LoanDecision {
  verdict:          LoanVerdict
  suggested_amount: number
  suggested_rate:   string
  conditions:       LoanCondition[]
}

export interface ReasoningTrace {
  agent_1: string
  agent_2: string
  agent_3: string
  agent_4: string
}

export interface EsgBreakdown {
  total_score:   number
  environmental: number
  social:        number
  governance:    number
  explanation:   string
}

export interface ImpactForecast {
  day_30: string
  day_60: string
  day_90: string
}

export interface FinancingRecommendation {
  product:     string
  best_match:  string
  alternative: string
}

export interface ArbitrageOutput {
  final_action:             string
  confidence_score:         number
  reasoning_trace:          string
  financing_recommendation: FinancingRecommendation
}

export interface EconomicEmpowerment {
  local_jobs_supported:     number
  community_impact_score:   number
  sustainable_sourcing_pct: number
}

export interface WhatIfBaseline {
  current_esg:         number
  current_cogs:        number
  approval_prob:       number
  // pillar scores for accurate what-if simulation
  env?:                number
  soc?:                number
  gov?:                number
  // exact scoring context returned by backend
  ghg_intensity?:      number
  renewables_pct?:     number
  sector?:             string
  employee_scale?:     number
  centrality_penalty?: number
}

export interface WhatIfResult {
  new_esg_score:     number
  new_approval_prob: number
  delta_esg:         number
  message:           string
  source?:           'backend' | 'offline_estimate'
  new_e?:            number
  new_s?:            number
  new_g?:            number
}

export interface WhatIfScenario {
  id:          string   // crypto.randomUUID()
  name:        string
  adjustments: Record<string, number>
  result:      WhatIfResult
  savedAt:     string   // ISO date string
}

export interface AppNotification {
  id:        string
  type:      'alert_sent' | 'pivot_executed' | 'analysis_complete'
  message:   string
  timestamp: string
  read:      boolean
}

export interface AnalysisHistoryEntry {
  id:        string
  timestamp: string
  sme_name:  string
  sector:    string
  esg_score: number
  verdict:   string
  event:     'analysis' | 'demo' | 'pivot'
}

export interface SwarmOutput {
  early_warning:            EarlyWarning
  greenwash_report:         any
  esg_breakdown:            EsgBreakdown
  reasoning_trace:          ReasoningTrace
  loan_decision:            LoanDecision
  financing_recommendation: FinancingRecommendation
  impact_forecast:          ImpactForecast
  whatif_baseline:          WhatIfBaseline
  economic_empowerment:     EconomicEmpowerment
  executive_summary:        any
}

export interface QuantifiableImpact {
  esg_text: string,
  financial_text: string,
  esg_delta: number,
  financial_value: number
}
