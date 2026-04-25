"""
ripple_engine.py
================
Ripple-cost estimator helper.

Purpose:
- Estimate annual COGS impact from switching away from a risk supplier.
- Combine supplier-switch COGS impact with loan cost impact.
"""

def compute_ripple(payload: dict, risk_summary: dict, loan_change: dict, auditor_output: dict = None) -> dict:
    """
    Compute ripple effect of supplier switch.
    If auditor_output is provided and contains new_supplier_id,
    use that supplier's unit_cost delta instead of generic switch cost.
    """
    # STEP 1) Read contracts/suppliers and build unit-cost lookup.
    contracts  = payload.get("contracts", [])
    suppliers  = payload.get("suppliers", [])
    
    # Build supplier cost lookup
    supplier_cost_map = {s["supplier_id"]: s.get("unit_cost", 0) for s in suppliers}

    # STEP 2) Resolve source supplier and optional replacement supplier.
    affected = risk_summary.get("affected_suppliers", [])
    risk_sid = auditor_output.get("risk_node_id") if auditor_output else (affected[0] if affected else None)

    # STEP 3) Compute annual COGS delta from actual supplier switch when possible.
    new_sid = auditor_output.get("new_supplier_id") if auditor_output else None

    if risk_sid and new_sid and new_sid in supplier_cost_map and risk_sid in supplier_cost_map:
        old_cost = supplier_cost_map[risk_sid]
        new_cost = supplier_cost_map[new_sid]
        
        # Find volume from contract
        contract = next((c for c in contracts if c["supplier_id"] == risk_sid), {})
        volume = contract.get("annual_volume", 1)
        
        annual_cogs_increase = round((new_cost - old_cost) * volume, 2)
    else:
        # STEP 3b) Fallback to coarse switch-cost estimate.
        annual_cogs_increase = round(
            sum(c.get("annual_cogs", 0) for c in contracts) * 0.005, 2
        )

    # STEP 4) Add loan-cost delta and return consolidated annual impact.
    annual_loan_cost_increase = loan_change.get("annual_cost_increase", 0)

    return {
        "annual_cogs_increase":      annual_cogs_increase,
        "annual_loan_cost_increase": annual_loan_cost_increase,
        "net_annual_impact":         round(annual_loan_cost_increase - annual_cogs_increase, 2),
        "summary": (
            f"Switching from '{risk_sid}' to '{new_sid}' increases COGS by "
            f"RM {annual_cogs_increase:,.2f}/yr. "
            f"Loan cost change: RM {annual_loan_cost_increase:,.2f}/yr."
        ) if risk_sid and new_sid else "No supplier switch computed."
    }