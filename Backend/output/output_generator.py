"""
output_generator.py
====================
Generates the final ESG reporting package from GREEN-GRAPHSWARM agent outputs.

Consumes outputs from four agents:
  fraud_detector  → fraud_output
  auditor         → auditor_output  (nested: decision + improvements)
  cfo             → cfo_output      (nested: action_evaluation list)
  arbitrageur     → arbitrage_output

All numeric values are computed deterministically in Python.
AI agent fields are only used for narrative/string content.
"""

import json
from state.swarm_state import SwarmState


# ── MAIN OUTPUT GENERATOR ─────────────────────────────────────────────────────

def generate_all_outputs(state: dict, sme_name: str = None, output_path: str = None) -> dict:

    # STEP 1) Require upstream agent outputs — fail fast if pipeline incomplete.
    arb   = _require(state, "arbitrage_output")
    cfo   = _require(state, "cfo_output")
    aud   = _require(state, "auditor_output")
    fraud = _require(state, "fraud_output")
    sedg  = _require(state, "sedg_output")

    # STEP 2) Unpack nested auditor structure.
    # auditor_output has two tracks: decision (supplier swap) + improvements (metric actions)
    aud_decision     = aud.get("decision", {})
    aud_improvements = aud.get("improvements", [])
    if not isinstance(aud_improvements, list):
        aud_improvements = []

    # STEP 3) Unpack CFO action evaluations.
    # cfo_output.action_evaluation is a list of per-action verdicts
    cfo_actions = cfo.get("action_evaluation", [])
    if not isinstance(cfo_actions, list):
        cfo_actions = []

    approved_actions = [a for a in cfo_actions if a.get("approved") is True]
    rejected_actions = [a for a in cfo_actions if a.get("approved") is False]

    # STEP 4) Read authoritative deterministic values.
    impact        = state.get("impact_analysis", {})
    risk          = impact.get("risk_summary", {})

    esg_before     = _to_number(sedg.get("overall_esg_score", 0))
    esg_drop       = _to_number(risk.get("esg_drop", 0))           # negative (e.g. -6.0)
    greenwash_pen  = _to_number(fraud.get("greenwash_penalty", 0)) # negative (e.g. -8.0)
    total_penalty  = esg_drop + greenwash_pen                        # negative sum (e.g. -14.0)

    # esg_score_after lives inside auditor_output.decision, not top-level.
    # The auditor adds a replacement_bonus on top of the penalty math, so its
    # esg_after (e.g. 61.0) will differ from naive base+penalty (e.g. 55.0).
    # We expose both so the frontend can show the full score chain clearly.
    esg_after_penalty_only = max(0, min(100, esg_before + total_penalty))   # e.g. 55.0
    esg_after              = max(0, min(100, _to_number(                     # e.g. 61.0 (with supplier bonus)
        aud_decision.get("esg_score_after"), esg_after_penalty_only
    )))

    esg_drop_abs  = abs(esg_drop)
    loan_at_risk  = risk.get("loan_at_risk", False)

    # STEP 5) Build event headline from impact analysis.
    events   = risk.get("events_processed", [])
    headline = " | ".join(
        e.get("event") or e.get("description", "ESG Risk Detected")
        for e in events
    ) if events else "ESG Risk Detected"

    # STEP 6) SME identity.
    sme       = state.get("graph_payload", {}).get("sme", {})
    _sme_name = sme.get("name") or sme_name or "N/A"
    _sector   = sme.get("sector", "N/A")

    # STEP 7) Build export payload.
    export = {

        # ── Identity ──────────────────────────────────────────────────────────
        "basic_info": {
            "sme_name": _sme_name,
            "sector":   _sector,
        },

        # ── Early Warning ─────────────────────────────────────────────────────
        "early_warning": {
            "headline":     headline,
            "esg_drop":     esg_drop_abs,
            "loan_at_risk": loan_at_risk,
            "severity":     _compute_severity(esg_drop_abs, loan_at_risk, fraud.get("greenwash_risk_level", "LOW")),
        },

        # ── Greenwash Report (full fraud detector output) ──────────────────
        # flagged_claims and dirty_chain_risk should be arrays from the fraud
        # detector. If the AI returned a plain string instead of an array,
        # _coerce_to_list wraps it so the frontend always gets a consistent type.
        "greenwash_report": {
            "risk_level":        fraud.get("greenwash_risk_level", "LOW"),
            "confidence":        fraud.get("confidence", 0),
            "penalty":           greenwash_pen,
            "summary":           fraud.get("summary", ""),
            "fraud_analysis":    fraud.get("fraud_analysis"),
            "dirty_chain_risk":  fraud.get("dirty_chain_risk"),
        },

        # ── ESG Breakdown ─────────────────────────────────────────────────────
        # Score chain: base_score + news_drop + greenwash_pen = score_after_penalties
        # The auditor then adds a supplier replacement_bonus → final total_score.
        # total_penalty is negative (a deduction); penalty_magnitude is its absolute value.
        "esg_breakdown": {
            "base_score":             esg_before,
            "news_drop":              esg_drop,                   # negative
            "greenwash_pen":          greenwash_pen,              # negative
            "total_penalty":          round(total_penalty, 2),    # negative sum
            "penalty_magnitude":      abs(total_penalty),         # positive, for display
            "total_score":            esg_after_penalty_only,         
            "environmental":          sedg.get("e_score"),
            "social":                 sedg.get("s_score"),
            "governance":             sedg.get("g_score"),
        },

        # ── Auditor: Supplier Swap Decision ──────────────────────────────────
        "supplier_action": {
            "risk_node_id":   aud_decision.get("risk_node_id"),
            "new_supplier_id":aud_decision.get("new_supplier_id"),
            "proposed_action":aud_decision.get("proposed_action"),
            "rationale":      aud_decision.get("rationale"),          # from decision, not top-level
            "esg_before":     aud_decision.get("esg_score_before"),
            "esg_after":      aud_decision.get("esg_score_after"),
        },

        # ── Auditor: Metric Improvement Roadmap ──────────────────────────────
        # Full improvement_actions list from auditor Track 2.
        # Each entry: metric, pillar, current, target, gap, action, estimated_uplift, effort
        "improvement_roadmap": aud_improvements,

        # ── CFO Action Portfolio ──────────────────────────────────────────────
        # All CFO-evaluated actions with per-action approval, financial and ESG impact.
        "cfo_portfolio": {
            "total_actions":    len(cfo_actions),
            "approved_count":   len(approved_actions),
            "rejected_count":   len(rejected_actions),
            "approved_actions": approved_actions,
            "rejected_actions": rejected_actions,
            "net_financial_impact": sum(
                _to_number(a.get("financial_impact", 0)) for a in approved_actions
            ),
            "net_esg_impact": sum(
                _to_number(a.get("esg_impact", 0)) for a in approved_actions
            ),
        },

        # ── Reasoning Trace (narrative from each agent) ───────────────────────
        "reasoning_trace": {
            "fraud_detector": fraud.get("summary"),
            "esg_auditor":    _aud_to_sentence(aud.get("improvement_summary")),    
            "cfo_critic":     _cfo_to_sentence(cfo.get("action_summary")),
            "arbitrageur":    arb.get("reasoning_trace"),
        },

        # ── Loan Decision (deterministic from arbitrageur) ────────────────────
        "loan_decision":   arb.get("loan_decision", {}),
        "financing":       arb.get("financing_recommendation", {}),
        "impact_forecast": arb.get("impact_forecast", {}),

        # ── Economic Empowerment ──────────────────────────────────────────────
        "economic_empowerment": impact.get("economic_empowerment", {}),

        # ── Executive Summary ─────────────────────────────────────────────────
        "executive_summary": _generate_exec_summary(
            arb, fraud, aud_decision, approved_actions, esg_before, esg_after
        ),

        # ── What-If Baseline ──────────────────────────────────────────────────────
        "whatif_baseline": {
            "current_esg":   esg_after_penalty_only,         # the real post-penalty ESG score
            "current_esg_score": esg_after_penalty_only,     # alias (store checks both)
            "current_annual_cogs": _to_number(
                sme.get("annual_cogs") or sme.get("cogs", 0)
            ),
            "approval_confidence_pct": _to_number(
                arb.get("loan_decision", {}).get("approval_confidence_pct")
                or arb.get("confidence_score", 0)
            ),
            # Pillar scores for chat context and exact what-if simulation
            "env": _to_number(sedg.get("e_score", 0)),
            "soc": _to_number(sedg.get("s_score", 0)),
            "gov": _to_number(sedg.get("g_score", 0)),
            # Additional fields needed for exact slider simulation
            "ghg_intensity":      _to_number(sedg.get("ghg_intensity", 0)),
            "renewables_pct":     _to_number(sedg.get("renewables_pct", 0)),
            "sector":             _sector,
            "employee_scale":     _to_number(sedg.get("employee_scale", 1.0)),
            "centrality_penalty": _to_number(sedg.get("centrality_penalty", 0)),
        },
    }

     # ── QUANTIFIABLE IMPACT SUMMARY (UI LAYER) ───────────────────────────────
    net_financial_impact = _to_number(export["cfo_portfolio"]["net_financial_impact"])

    esg_before_ui = _to_number(sedg.get("overall_esg_score", 0))
    esg_after_ui  = esg_after

    esg_net = round(esg_after_ui - esg_before_ui, 1)

    # Financial formatting
    if net_financial_impact < 0:
        financial_str = f"RM {abs(net_financial_impact):,.0f} investment required"
    elif net_financial_impact > 0:
        financial_str = f"RM {net_financial_impact:,.0f} saved annually"
    else:
        financial_str = "Cost-neutral portfolio"

    # ESG formatting
    esg_str = f"ESG {'+' if esg_net >= 0 else ''}{esg_net} pts"

    # Attach to export
    export["quantifiable_impact"] = {
        "esg_text": esg_str,
        "financial_text": financial_str,
        "esg_delta": esg_net,
        "financial_value": net_financial_impact
    }
    
    # STEP 8) Resolve output path and persist JSON file.
    if output_path is None:
        safe_name = (_sme_name or sme_name or "report").replace(" ", "_")
        output_path = f"{safe_name}_esg_output.json"

    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(export, f, indent=2, ensure_ascii=False)
        print(f"✅ JSON exported successfully → {output_path}")
    except Exception as e:
        print(f"❌ Failed to export JSON: {e}")

    return export


# ── SEVERITY CLASSIFIER ───────────────────────────────────────────────────────

def _compute_severity(esg_drop: float, loan_at_risk: bool, greenwash_level: str) -> str:
    """
    Coarse severity bucket from combined risk signals.

    HIGH   → loan at risk OR ESG dropped 20+ points
    MEDIUM → ESG dropped 10+ points OR greenwash rated HIGH
    LOW    → everything else
    """
    if loan_at_risk or esg_drop >= 20:
        return "HIGH"
    if esg_drop >= 10 or greenwash_level == "HIGH":
        return "MEDIUM"
    return "LOW"


# ── EXECUTIVE SUMMARY BUILDER ─────────────────────────────────────────────────

def _generate_exec_summary(
    arb,
    fraud,
    aud_decision,
    approved_actions,
    esg_before,
    esg_after
):
    loan = arb.get("loan_decision", {})

    return {
        "verdict": loan.get("verdict", "N/A"),
        "amount": loan.get("suggested_amount", 0),
        "rate": loan.get("suggested_rate", 0),

        "esg_before": esg_before,
        "esg_after": esg_after,

        "risk_level": fraud.get("greenwash_risk_level", "LOW"),

        # 🔥 NEW: auditor decision included properly
        "supplier_swap": aud_decision.get("decision", {}).get("new_supplier_id"),
        "proposed_action": aud_decision.get("decision", {}).get("proposed_action"),

        # 🔥 ACTION INSIGHT (from CFO approved actions)
        "approved_actions_count": len(approved_actions),
        "top_actions": [
            a.get("action") for a in approved_actions[:3]
        ],

        "recommendation": arb.get("reasoning_trace", ""),
        "confidence": arb.get("confidence_score", 0),

        "export_ready": True
    }


# ── INTERNAL HELPERS ──────────────────────────────────────────────────────────


def _coerce_to_list(value, primary_key: str) -> list:
    """
    Ensure fraud detector array fields are always returned as lists.

    The fraud AI sometimes returns these as plain prose strings instead of
    JSON arrays. This function handles three cases:
      - Already a valid list of dicts  → return as-is (filter out non-dicts)
      - Plain string                   → wrap in a single dict using primary_key
      - None / anything else           → return []

    primary_key is the main field name for the wrapping dict
    (e.g. "claim" for flagged_claims, "supplier_id" for dirty_chain_risk).
    """
    if isinstance(value, list):
        return [e for e in value if isinstance(e, dict)]
    if isinstance(value, str) and value.strip():
        return [{primary_key: "(unparsed)", "reasoning": value.strip()}]
    return []

def _require(state: SwarmState, key: str) -> dict:
    """Require a state key to exist and be non-empty, fail fast with a clear message."""
    value = state.get(key)
    if not value:
        raise ValueError(
            f"Required agent output '{key}' is missing from SwarmState. "
            f"Ensure the pipeline completed successfully before calling generate_all_outputs()."
        )
    return value


def _to_number(value, default: float = 0.0) -> float:
    """Safe numeric coercion with default fallback."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)
    
def _cfo_to_sentence(cfo_critic: dict) -> str:
    if not isinstance(cfo_critic, dict):
        return "No CFO analysis available."

    approved = cfo_critic.get("approved_actions", 0)
    rejected = cfo_critic.get("rejected_actions", 0)
    esg = cfo_critic.get("net_esg_impact", 0)
    fin = cfo_critic.get("net_financial_impact", 0)
    driver = cfo_critic.get("dominant_decision_driver", "UNKNOWN")
    reason = cfo_critic.get("reasoning_trace", "")

    return (
        f"CFO approved {approved} actions and rejected {rejected} actions. "
        f"The portfolio resulted in a net ESG impact of {esg:.1f} points "
        f"and a financial impact of RM {fin:,.2f}. "
        f"Decision was primarily driven by {driver.lower().replace('_', ' ')}. "
        f"{reason}"
    )

def _format_auditor_summary(aud: dict) -> str:
    summary = aud.get("improvement_summary") or {}

    return (
        f"Auditor identified {summary.get('total_actions', 0)} improvement actions. "
        f"Dominant pillar is {summary.get('dominant_pillar', 'N/A')}. "
        f"Expected ESG uplift is {summary.get('expected_esg_uplift', 0)}. "
        f"Reasoning: {summary.get('reasoning_trace', 'No reasoning provided')}."
    )

def _aud_to_sentence(improvement_summary: dict, improvements: list = None) -> str:
    if not isinstance(improvement_summary, dict):
        return "No ESG auditor analysis available."

    total = improvement_summary.get("total_actions", 0)
    dominant = improvement_summary.get("dominant_pillar", "N/A")
    uplift = improvement_summary.get("expected_esg_uplift", "0")
    reasoning = improvement_summary.get("reasoning_trace", "")

    high_effort = improvement_summary.get("high_effort_count", 0)

    # Optional: include top actions for richness
    top_actions_text = ""
    if isinstance(improvements, list) and improvements:
        top_3 = improvements[:3]
        top_actions_text = " Top actions include: " + ", ".join(
            a.get("action", "unknown action") for a in top_3
        ) + "."

    return (
        f"ESG Auditor identified {total} improvement actions, "
        f"with {high_effort} requiring high effort. "
        f"The dominant ESG pillar affected is {dominant}. "
        f"Expected ESG uplift is {uplift}. "
        f"{reasoning}.{top_actions_text}"
    )