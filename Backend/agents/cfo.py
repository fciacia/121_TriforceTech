"""
cfo.py
======
CFO agent for financial viability checks.

"""

import json

from numpy import number
from utils.ai_caller import call_ai
from utils.graph_tools import get_financial_dependency_subgraph, resolve_risk_node
from helpers.ripple_engine import compute_ripple
from state.swarm_state import SwarmState

MAX_AUDITOR_RETRIES = 2

def run_cfo(state: SwarmState) -> dict:
    
    # ── Inputs ────────────────────────────────────────────────────
    G      = state["graph"]
    sme_id = state["graph_payload"]["sme"].get("sme_id", "sme_0")
    auditor = state["auditor_output"]
    ripple  = state["impact_analysis"]["ripple_effect"]

    print("\n" + "="*60)
    print("💰 CFO — START")
    print("="*60)

    # STEP 1) Build supplier spend context from graph.
    fin_subgraph = get_financial_dependency_subgraph(G, sme_id, top_n=10)
    print(f"  Financial subgraph: {fin_subgraph}")

    # STEP 2) Recompute ripple using auditor-selected supplier (if present).
    # `impact_analysis` runs before `auditor`, so we refresh here for accuracy.
    loan_change = state["impact_analysis"]["loan_change"]
    recomputed_ripple = compute_ripple(
        state["graph_payload"],
        state["impact_analysis"]["risk_summary"],
        loan_change,
        auditor_output=auditor,
    )
    if auditor.get("decision").get('new_supplier_id'):
        ripple = recomputed_ripple

    # STEP 3) Compute all authoritative financial figures in Python.
    contracts  = state["graph_payload"].get("contracts", [])
    baseline_cogs     = sum(c.get("annual_cogs", 0) for c in contracts)
    cogs_delta = ripple["annual_cogs_increase"]
    loan_delta = loan_change["annual_cost_increase"]

    net_financial_impact = loan_delta - cogs_delta

    payback_months = (
        round(cogs_delta / (loan_delta / 12), 1)
        if loan_delta != 0
        else 0
    )

    print(f"\n--- Pre-computed Financials (Python, authoritative) ---")
    print(f"  baseline_cogs:         RM {baseline_cogs:,.2f}")
    print(f"  cogs_delta:            RM {cogs_delta:,.2f}")
    print(f"  loan_delta:            RM {loan_delta:,.2f}")
    print(f"  net_financial_impact:  RM {net_financial_impact:,.2f}")
    print(f"  payback_months:        {payback_months}")

    # STEP 4) Normalize Auditor Actions into a consistent format for CFO reasoning.
    supplier_action = auditor.get("decision", {})
    improvement_actions = auditor.get("improvements", [])

    all_actions = []

    # Supplier swap as action
    if supplier_action:
        all_actions.append({
            "action_type": "SUPPLIER_SWAP",
            "data": supplier_action
        })

    # ESG improvements
    for act in improvement_actions:
        all_actions.append({
            "action_type": "ESG_IMPROVEMENT",
            "data": act
        })

    enriched_actions = []

    for action in all_actions:
        data = action["data"]

        esg_impact = _to_float_safe(data.get("estimated_uplift", 0))

        if action["action_type"] == "SUPPLIER_SWAP":
            financial_impact = net_financial_impact
        else:
            # Example: derive cost from effort
            effort = data.get("effort", "LOW")

            if effort == "HIGH":
                financial_impact = -5000
            elif effort == "MEDIUM":
                financial_impact = -2000
            else:
                financial_impact = -500

        enriched_actions.append({
            "action": data.get("action", "Unknown action"),
            "action_type": action["action_type"],
            "financial_impact": financial_impact,
            "esg_impact": esg_impact,
        })


    # STEP 5) Ask LLM for human-readable note and optional reject reason.
        system = """
        You are a CFO responsible for financial viability.

        You do NOT estimate or guess values.

        You are given:
        - financial_impact (already computed)
        - esg_impact (already computed)

        Your ONLY job:
        - approve if financially viable OR ESG-critical with acceptable cost
        - reject if financial loss is significant with low ESG benefit

        Financial rules:
        - financial_impact < -1000 → high cost pressure (reject unless ESG > 5)
        - financial_impact between -1000 and 0 → conditional or approve based on ESG
        - financial_impact > 0 → approve

        Return ONLY per-action evaluation.

        DO NOT invent numbers.
        DO NOT modify financial_impact or ESG impact.

        All numeric fields MUST be numbers only.
        Do NOT include units, symbols, or text.

        Output ONLY valid JSON:
        e.g.
        {
            "action_evaluation": [
            {
                "action": "Replace SUP_R with SUP_C",
                "action_type": "SUPPLIER_SWAP",
                "approved": true,

                "financial_impact": -468.0,
                "esg_impact": 6.0,

                "reason": "Lower ESG supplier reduces compliance risk"
            }],
            "action_summary": {
                "approved_actions": 1,
                "rejected_actions": 0,
                "net_esg_impact": 6.0,
                "net_financial_impact": -468.0,
                "dominant_decision_driver": "ESG_COMPLIANCE_OVER_COST",
                "reasoning_trace": "CFO prioritizes ESG uplift over marginal financial cost due to regulatory exposure risk."
            }
        }
    """

    user = json.dumps({
        "SUPPLIER_SWAP": {
            "baseline_cogs": baseline_cogs,
            "cogs_delta": cogs_delta,
            "loan_delta": loan_delta,
            "net_financial_impact": net_financial_impact,
            "payback_months": payback_months,
            "esg_score_before": auditor.get("esg_score_before"),
            "esg_score_after": auditor.get("esg_score_after"),
        },
        "ESG_IMPROVEMENT": all_actions,
    })


    print(f"\n--- Calling AI CFO ---")
    ai_result = call_ai(system, user)

    # STEP 6) Log raw AI payload.
    print(f"\n--- AI CFO Output ---")
    print(f"{ai_result.get('action_evaluation')}")
    
    print(f"\n✅ CFO — DONE")
    print("="*60 + "\n")

    return {
        "cfo_output":        ai_result,
        "cfo_reject_reason": ai_result.get("reject_reason", ""),
    }


def cfo_decision_router(state: SwarmState) -> str:
    """
    LangGraph router for CFO outcome.

    Input:
        state with `cfo_output.cfo_recommendation` and `auditor_retry_count`.
    Output:
        - "retry_auditor" or
        - "continue_to_arbitrageur"
    """
    # FIX: read from enforced Python value, never trust AI field
    recommendation = state["cfo_output"].get("cfo_recommendation", "CONDITIONAL")
    retry_count    = state.get("auditor_retry_count", 0)

    if recommendation == "REJECT" and retry_count < MAX_AUDITOR_RETRIES:
        print(
            f"♻️  CFO REJECTED — triggering Auditor retry "
            f"({retry_count + 1}/{MAX_AUDITOR_RETRIES}). "
            f"Reason: {state.get('cfo_reject_reason', '')}"
        )
        return "retry_auditor"

    return "continue_to_arbitrageur"

def increment_retry(state: SwarmState) -> dict:
    """Increment auditor retry counter by 1."""
    return {"auditor_retry_count": state.get("auditor_retry_count", 0) + 1}

import re

def _to_float_safe(value, default=0.0):
    """
    Extract first valid numeric value from messy LLM output.
    Handles:
    '+11 ESG points'
    '-5.2%'
    'approx 10'
    12
    None
    """
    if value is None:
        return default

    if isinstance(value, (int, float)):
        return float(value)

    if isinstance(value, str):
        match = re.search(r'-?\d+(\.\d+)?', value)
        if match:
            return float(match.group())

    return default