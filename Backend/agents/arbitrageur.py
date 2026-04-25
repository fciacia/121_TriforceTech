"""
arbitrageur.py
==============
Final decision layer — loan + ESG + action portfolio interpreter.
"""

import json
from utils.ai_caller import call_ai
from utils.graph_tools import get_risk_nodes
from helpers.loan_engine import determine_loan_tier
from state.swarm_state import SwarmState


# SAFE NUMERIC PARSER
def safe_float(x):
    try:
        return float(x)
    except:
        return 0.0


def run_arbitrageur(state: SwarmState) -> dict:

    G = state["graph"]

    print("\n" + "=" * 60)
    print("⚖️ ARBITRAGEUR — START")
    print("=" * 60)


    # STEP 1: Load upstream outputs
    fraud   = state.get("fraud_output", {})
    cfo     = state.get("cfo_output", {}).get("action_evaluation", [])
    sedg    = state.get("sedg_output", {})

    loan_rates = state["graph_payload"].get("loan_rates", [])
    final_risk_overview = get_risk_nodes(G)


    # STEP 2: ESG consolidation (deterministic)
    esg_before = sedg.get("overall_esg_score", 0)
    greenwash_penalty = fraud.get("greenwash_penalty", 0)

    esg_delta = sum(safe_float(a.get("esg_impact", 0)) for a in cfo)

    esg_after = max(
        0,
        min(100, esg_before + esg_delta + greenwash_penalty)
    )

    print("\n--- ESG Consolidation ---")
    print(f"  before: {esg_before}")
    print(f"  delta:  {esg_delta}")
    print(f"  after:  {esg_after}")


    # STEP 3: FINANCIAL CONSOLIDATION (ONLY APPROVED)
    approved_actions = [a for a in cfo if a.get("approved") is True]

    net_financial_impact = sum(
        safe_float(a.get("financial_impact", 0))
        for a in approved_actions
    )

    print("\n--- CFO Action Portfolio ---")
    print(f"  total actions:   {len(cfo)}")
    print(f"  approved:        {len(approved_actions)}")
    print(f"  net impact:      RM {net_financial_impact:,.2f}")


    # STEP 4: Loan tier selection
    target_tier = determine_loan_tier(esg_after, loan_rates)

    print("\n--- Loan Tier ---")
    print(f"  tier:    {target_tier['tier_name']}")
    print(f"  rate:    {target_tier['interest_rate']}%")


    # STEP 5: Deterministic verdict (GROUND TRUTH)
    if esg_after < 30:
        expected_verdict = "REJECT"
    elif net_financial_impact > 0:
        expected_verdict = "APPROVE"
    else:
        expected_verdict = "CONDITIONAL"

    print(f"\n📌 Expected verdict: {expected_verdict}")


    # STEP 6: FORCE CONDITIONS (CRITICAL FIX)
    forced_conditions = [
        {
            "action": a.get("action"),
            "action_type": a.get("action_type"),
            "financial_impact": safe_float(a.get("financial_impact")),
            "esg_impact": safe_float(a.get("esg_impact")),
            "reason": a.get("reason", "")
        }
        for a in approved_actions
    ]

    # STEP 7: AI (NARRATIVE ONLY — NO DECISION POWER)
    system = """
    You are a financial reporting layer.

    You DO NOT make decisions.

    You ONLY:
    - explain results
    - generate forecast text
    - summarize reasoning

    You MUST NOT modify:
    - verdict
    - conditions
    - numbers

    Output JSON ONLY:

    {
        "impact_forecast": {
            "day_30": "string",
            "day_60": "string",
            "day_90": "string"
        },
        "reasoning_trace": "string",
        "confidence_score": 1-100,
        "financing_recommendation": {
            "product": "string",
            "best_match": "string",
            "alternative": "string"
        }
    }
    """

    user = json.dumps({
        "esg_before": esg_before,
        "esg_after": esg_after,
        "greenwash_penalty": greenwash_penalty,
        "net_financial_impact": net_financial_impact,
        "approved_actions": approved_actions,
        "loan_tier": target_tier,
        "risk_nodes": final_risk_overview["risk_nodes"]
    })

    print("\n--- Calling AI Arbitrageur ---")
    ai_result = call_ai(system, user)


    # STEP 8: BUILD FINAL STRUCTURE (DETERMINISTIC)
    ai_result["loan_decision"] = {
        "verdict": expected_verdict,
        "suggested_amount": target_tier.get("principal", 0),
        "suggested_rate": target_tier["interest_rate"],
        "conditions": forced_conditions
    }


    # STEP 9: SANITY OVERRIDE (NO AI CONTROL)
    if esg_after < 30:
        ai_result["loan_decision"]["verdict"] = "REJECT"

    if net_financial_impact > 0 and esg_after >= 30:
        ai_result["loan_decision"]["verdict"] = "APPROVE"

    # Net financial impact
    if net_financial_impact < 0:
        financial_str = f"RM {abs(net_financial_impact):,.0f} investment required"
    elif net_financial_impact > 0:
        financial_str = f"RM {net_financial_impact:,.0f} saved annually"
    else:
        financial_str = "Cost-neutral portfolio"

    # ESG net impact
    esg_net = round(esg_after - esg_before, 1)
    esg_str = f"ESG {'+' if esg_net >= 0 else ''}{esg_net} pts"

    ai_result["quantifiable_impact"] = f"{esg_str} | {financial_str}"


    # STEP 10: LOGGING
    print("\n--- FINAL RESULT ---")
    print(json.dumps(ai_result, indent=2))

    print("\n✅ ARBITRAGEUR — DONE")
    print("=" * 60 + "\n")

    return {
        "arbitrage_output": ai_result
    }