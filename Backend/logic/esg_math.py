"""
esg_math.py
===========
SEDG scoring logic.

Purpose:
- Compute deterministic ESG pillar and overall score.
- Apply sector weighting, SME size scaling, and supplier-centrality penalty.
- Provide baseline ESG output for downstream swarm agents.
"""

from state.swarm_state import SwarmState
from utils.graph_tools import get_bottleneck_suppliers

# ─────────────────────────────────────────────────────────────────────────────
# PURE ESG HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def map_esg_to_loan_tier(overall_esg_score: float, loan_rates: list) -> dict:
    """Map ESG score to highest eligible loan tier."""
    if not loan_rates:
        return {"tier_name": "N/A", "interest_rate": 0, "product_name": "Standard Loan"}

    sorted_tiers = sorted(loan_rates, key=lambda x: x.get("min_esg_score", 0))

    for tier in reversed(sorted_tiers):
        if overall_esg_score >= tier.get("min_esg_score", 0):
            return tier

    return sorted_tiers[0]


def calculate_sector_weights(sector: str) -> dict:
    """Return SEDG pillar weights by SME sector profile."""
    sector = (sector or "").lower()

    if any(k in sector for k in ["logistics", "transport", "shipping"]):
        return {"E": 0.55, "S": 0.25, "G": 0.20}

    if "manufacturing" in sector:
        return {"E": 0.45, "S": 0.30, "G": 0.25}

    if any(k in sector for k in ["it", "software", "services", "consulting"]):
        return {"E": 0.25, "S": 0.40, "G": 0.35}

    return {"E": 0.40, "S": 0.35, "G": 0.25}


def employee_scaling(emp_count: int) -> float:
    """Scale ESG score by SME size band."""
    if emp_count < 10: return 0.85
    if emp_count < 50: return 1.0
    if emp_count < 200: return 1.1
    return 1.2


def calculate_pillar_scores(metrics: dict, revenue: float):
    """
    Compute E/S/G pillar scores from normalized metrics.

    Returns:
        tuple: (e_score, s_score, g_score, explanations)
    """
    revenue = max(revenue, 1)
    explanations = []

    # ── E ──
    emissions = (
        metrics.get("sedg_e1_1_scope1_ghg_tco2e", 0) +
        metrics.get("sedg_e1_2_scope2_ghg_tco2e", 0)
    )

    intensity = emissions / (revenue / 1_000_000)

    if intensity < 5:
        e_score = 85
    elif intensity < 15:
        e_score = 70
    elif intensity < 30:
        e_score = 55
    else:
        e_score = 35

    # renewables
    renew = metrics.get("sedg_e2_1_renewable_fuel_wh", 0)
    total_energy = renew + metrics.get("sedg_e2_1_nonrenewable_fuel_wh", 0)

    renew_pct = (renew / total_energy * 100) if total_energy > 0 else 0
    if renew_pct > 60:
        e_score += 15

    # ── S ──
    training = metrics.get("sedg_s2_1_avg_training_hrs", 0)
    s_score = 85 if training > 16 else 70 if training > 8 else 50

    # ── G ──
    g_score = 0
    if metrics.get("sedg_g2_1_code_of_conduct"): g_score += 20
    if metrics.get("sedg_g2_1_anti_corruption_policy"): g_score += 20
    if metrics.get("sedg_g4_1_corruption_incidents", 0) == 0:
        g_score += 25
    else:
        g_score -= 50

    return (
        min(100, e_score),
        min(100, s_score),
        min(100, g_score),
        explanations,
        round(intensity, 4),    # tCO2e per (revenue / 1M MYR)
        round(renew_pct, 2),    # % of fuel energy from renewables
    )


def compute_centrality_penalty(bottlenecks, supplier_esg_map):
    """Compute supplier bottleneck risk penalty to subtract from scaled ESG."""
    penalty = 0
    explanations = []

    for bn in bottlenecks.get("bottlenecks", []):
        sid = bn["supplier_id"]
        esg = supplier_esg_map.get(sid, 50)

        if esg < 50:
            impact = int(bn["risk_multiplier"] * (100 - esg) / 50)
            penalty += impact
            explanations.append(f"{sid} penalty -{impact}")

    return penalty, explanations


def compute_overall_esg(sme, metrics, G):
    """
    Compute final overall ESG score (deterministic).

    Inputs:
    - SME profile
    - ESG metrics
    - supply graph
    Output:
    - dict containing pillar scores, penalties, and overall score
    """
    # STEP 1) Read profile inputs and compute raw pillar scores.
    sector = sme.get("sector", "")
    emp = sme.get("employee_count", 0)
    revenue = max(sme.get("revenue", 1), 1_000_000)

    e, s, g, exp, ghg_intensity, renewables_pct = calculate_pillar_scores(metrics, revenue)

    # STEP 2) Apply sector weighting and employee scaling.
    weights = calculate_sector_weights(sector)
    scale = employee_scaling(emp)

    base = (e * weights["E"]) + (s * weights["S"]) + (g * weights["G"])
    scaled = min(100, int(base * scale))

    # STEP 3) Build supplier ESG map and centrality-driven penalty.
    supplier_esg_map = {
        n: d.get("esg_score", 50)
        for n, d in G.nodes(data=True)
        if d.get("type") == "supplier"
    }

    bottlenecks = get_bottleneck_suppliers(G)

    penalty, pen_exp = compute_centrality_penalty(bottlenecks, supplier_esg_map)

    # STEP 4) Compute final bounded score and package output.
    final = max(0, scaled - penalty)

    return {
        "e_score":            e,
        "s_score":            s,
        "g_score":            g,
        "overall_esg_score": final,
        "scaled_score":      scaled,
        "centrality_penalty": penalty,
        "employee_scale":    scale,
        "ghg_intensity":     ghg_intensity,
        "renewables_pct":    renewables_pct,
        "bottlenecks":       bottlenecks,
        "explanations":      exp + pen_exp,
    }


# ─────────────────────────────────────────────────────────────────────────────
# WHAT-IF SIMULATION (exact replica of scoring bands used above)
# ─────────────────────────────────────────────────────────────────────────────

def simulate_whatif_adjustments(
    current_e:          float,
    current_s:          float,
    current_g:          float,
    ghg_intensity:      float,
    renewables_pct:     float,
    sector:             str,
    employee_scale:     float,
    centrality_penalty: float,
    adjustments:        dict,
) -> dict:
    """
    Compute the ESG score that would result from the given What-If adjustments
    using the exact same scoring bands as calculate_pillar_scores.

    Args:
        current_e / s / g   : current pillar scores (0-100)
        ghg_intensity        : current tCO2e per (revenue / 1M MYR)
        renewables_pct       : current % of fuel energy from renewables (0-100)
        sector               : SME sector string (drives pillar weights)
        employee_scale       : scaling factor already applied in baseline
        centrality_penalty   : supplier bottleneck penalty already applied in baseline
        adjustments          : dict with keys:
                               energy_efficiency_pct  — % reduction in fuel/nonrenewable energy
                               carbon_reduction_pct   — % direct reduction in total GHG emissions
                               revenue_increase_pct   — % revenue growth (shrinks intensity denominator)

    Returns:
        dict with new_e, new_s, new_g, new_esg, delta_esg (all rounded to 1 dp)
    """
    energy_eff  = float(adjustments.get("energy_efficiency_pct", 0)) / 100.0
    carbon_red  = float(adjustments.get("carbon_reduction_pct",  0)) / 100.0
    revenue_inc = float(adjustments.get("revenue_increase_pct",  0)) / 100.0

    # Energy efficiency reduces nonrenewable fuel consumption (and therefore scope-1 emissions).
    # Carbon reduction directly cuts total GHG output (scope-1 + scope-2).
    # Combined effect as a fraction of remaining emissions:
    emissions_factor = (1.0 - energy_eff * 0.7) * (1.0 - carbon_red)
    new_intensity    = ghg_intensity * emissions_factor / (1.0 + revenue_inc)

    # Apply the same stepped scoring bands as calculate_pillar_scores
    if new_intensity < 5:
        new_e = 85
    elif new_intensity < 15:
        new_e = 70
    elif new_intensity < 30:
        new_e = 55
    else:
        new_e = 35

    # Renewables bonus: energy efficiency reduces nonrenewable share,
    # shifting the renewables percentage upward.
    nonrenew_before = 100.0 - renewables_pct
    nonrenew_after  = nonrenew_before * (1.0 - energy_eff * 0.7)
    new_total       = nonrenew_after + renewables_pct
    new_renew_pct   = (renewables_pct / new_total * 100.0) if new_total > 0 else renewables_pct

    if new_renew_pct > 60 or renewables_pct > 60:
        new_e += 15

    new_e = min(100, new_e)

    # Social and Governance pillars are not affected by these sliders
    new_s = current_s
    new_g = current_g

    # Re-compute overall ESG using the exact same formula
    weights = calculate_sector_weights(sector)

    old_base   = current_e * weights["E"] + current_s * weights["S"] + current_g * weights["G"]
    new_base   = new_e     * weights["E"] + new_s     * weights["S"] + new_g     * weights["G"]

    old_scaled = min(100.0, old_base * employee_scale)
    new_scaled = min(100.0, new_base * employee_scale)

    old_esg    = max(0.0, old_scaled - centrality_penalty)
    new_esg    = max(0.0, new_scaled - centrality_penalty)

    return {
        "new_e":     round(new_e,            1),
        "new_s":     round(new_s,            1),
        "new_g":     round(new_g,            1),
        "new_esg":   round(new_esg,          1),
        "delta_esg": round(new_esg - old_esg, 1),
    }


# ─────────────────────────────────────────────────────────────────────────────
# ORCHESTRATOR NODE
# ─────────────────────────────────────────────────────────────────────────────

def run_sedg_assessor(state: SwarmState):
    """
    LangGraph node for baseline SEDG assessment.

    Args:
        state: Shared swarm state.
    Returns:
        Dict update with key `sedg_output`.
    """
    G = state["graph"]
    payload = state["graph_payload"]

    sme = payload.get("sme", {})
    metrics = payload.get("esg_metrics", {}) or {}
    loan_rates = payload.get("loan_rates", [])

    # STEP 1) Resolve graph references and compute deterministic ESG output.
    sme_id = sme.get("sme_id", "sme_0")

    result = compute_overall_esg(sme, metrics, G)

    # STEP 2) Map ESG to loan tier and write score back to payload/graph.
    loan = map_esg_to_loan_tier(result["overall_esg_score"], loan_rates)

    payload["sme"]["esg_score"] = result["overall_esg_score"]

    if G.has_node(sme_id):
        G.nodes[sme_id]["esg_score"] = result["overall_esg_score"]

    # STEP 3) Return output payload used by later agents.
    return {
        "sedg_output": {
            **result,
            "loan_tier": loan.get("tier_name"),
            "loan_product": loan.get("product_name"),
            "interest_rate": loan.get("interest_rate"),
            "bottleneck_summary": result["bottlenecks"].get("summary", "")
        }
    }