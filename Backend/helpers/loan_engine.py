"""
loan_engine.py
==============
Loan tier and interest impact helper functions.

Purpose:
- Determine applicable loan tier from ESG score.
- Compare loan terms before/after ESG deterioration.
"""

def determine_loan_tier(esg_score, loan_rates):
    """
    Choose BEST tier based on ESG (highest qualifying)
    """
    sorted_loans = sorted(loan_rates, key=lambda x: x["min_esg_score"], reverse=True)

    for loan in sorted_loans:
        if esg_score >= loan["min_esg_score"]:
            return loan

    return sorted_loans[-1]  # lowest tier fallback


def compare_loan_before_after(payload, risk_result):
    """
    Compare loan profile before risk and after risk.

    Input:
    - payload with SME + loan rates
    - risk_result from risk engine (`new_score`)
    Output:
    - dict with before/after tiers and annual cost increase
    """
    # STEP 1) Resolve baseline data and principal.
    loan_rates = payload["loan_rates"]
    sme_data = payload["sme"]

    principal = sme_data.get("principal", 500000)

    # STEP 2) Determine best qualifying tiers for before/after ESG.
    before_esg = payload["sme"]["esg_score"]
    after_esg  = risk_result["new_score"]

    before_loan = determine_loan_tier(before_esg, loan_rates)
    after_loan  = determine_loan_tier(after_esg, loan_rates)

    # STEP 3) Compute annual interest costs and delta.
    cost_before = (before_loan["interest_rate"] / 100) * principal
    cost_after = (after_loan["interest_rate"] / 100) * principal

    return {
        "before_news": {
            "esg":      before_esg,
            "tier":     before_loan["tier_name"],      # ✅ FIXED
            "interest": before_loan.get("interest_rate", "N/A"),
            "product":  before_loan.get("product_name", "N/A"),
            "principal": before_loan.get("principal", 0), 
        },
        "after_news": {
            "esg":      after_esg,
            "tier":     after_loan["tier_name"],       # ✅ FIXED
            "interest": after_loan.get("interest_rate", "N/A"),
            "product":  after_loan.get("product_name", "N/A"),
            "principal": after_loan.get("principal", 0), 
        },
        "interest_rate_increase": round(
            after_loan["interest_rate"] - before_loan["interest_rate"], 2
        ),
        "annual_cost_increase": round(cost_after - cost_before, 2)
    }