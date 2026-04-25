"""
impact.py
=========
Impact analysis node.

Purpose:
- Translate risk events into numeric business impact:
  risk summary, loan delta, ripple cost, and empowerment score.
- Persist affected supplier risk flags back into graph state.

Input:
- `SwarmState` with `graph_payload`, `graph`, and optionally `sedg_output`.

Output:
- dict with `impact_analysis`:
  `risk_summary`, `loan_change`, `ripple_effect`, `economic_empowerment`.
"""

from state.swarm_state import SwarmState
from helpers.loan_engine import compare_loan_before_after
from helpers.ripple_engine import compute_ripple
from helpers.risk_engine import detect_risk
from utils.graph_tools import flag_risk_node, compute_sustainable_sourcing_pct


def compute_economic_empowerment(payload, risk_summary, G, sme_id, sedg_score: int = None):
    """
    Compute a simple social-economic empowerment index.

    Args:
        payload: Source payload with SME profile.
        risk_summary: Result from risk engine.
        G: Live graph.
        sme_id: SME node identifier.
        sedg_score: Optional computed ESG score override.

    Returns:
        Dict with local jobs, community impact score, and sustainable sourcing pct.
    """
    sme = payload.get("sme", {})
    contracts = payload.get("contracts", [])

    jobs = sme.get("employee_count", 0)

    # FIX: use the computed SEDG ESG score, not the raw DB value
    esg_score_for_calc = sedg_score if sedg_score is not None else sme.get("esg_score", 0)

    score = int(min(100,
        (esg_score_for_calc * 0.5) +
        (min(jobs, 200) / 200 * 30)
    ))

    if risk_summary.get("loan_at_risk"):
        score -= 10

    return {
        "local_jobs_supported": jobs,
        "community_impact_score": max(0, score),
        "sustainable_sourcing_pct": compute_sustainable_sourcing_pct(G, sme_id)
    }


def build_impact_analysis(state: SwarmState):
    """
    Main impact-analysis node.

    Args:
        state: Shared swarm state.

    Returns:
        Dict update with key `impact_analysis`.
    """
    payload = state["graph_payload"]
    G       = state["graph"]

    # STEP 1) Convert news/regulations to ESG risk summary.
    risk_summary = detect_risk(payload, G)
    # STEP 2) Re-evaluate loan terms before/after risk.
    loan_change  = compare_loan_before_after(payload, risk_summary)

    # STEP 3) Estimate supply-chain financial ripple effect.
    auditor_output = state.get("auditor_output", {})
    ripple = compute_ripple(payload, risk_summary, loan_change, auditor_output=auditor_output)

    # STEP 4) Compute broader socio-economic impact.
    sedg_score   = state.get("sedg_output", {}).get("overall_esg_score")
    empowerment  = compute_economic_empowerment(
        payload, risk_summary, G,
        state["graph_payload"].get("sme", {}).get("sme_id", "sme_0"),
        sedg_score=sedg_score
    )

    # STEP 5) Persist affected supplier risk flags onto graph for downstream nodes.
    for sid in risk_summary.get("affected_suppliers", []):
        flag_risk_node(G, sid, reason=risk_summary.get("risk_type", "risk"))

    return {
        "impact_analysis": {
            "risk_summary":        risk_summary,
            "loan_change":         loan_change,
            "ripple_effect":       ripple,
            "economic_empowerment": empowerment
        }
    }