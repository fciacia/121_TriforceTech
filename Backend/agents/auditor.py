"""
auditor.py
==========
ESG Auditor agent.

"""


import json
from utils.ai_caller import call_ai
from utils.graph_tools import find_path_to_risk, get_risk_nodes
from state.swarm_state import SwarmState

# Ensures ESG decisions are mathematically correct, 
# graph-aware, and AI-assisted but strictly controlled.
def run_esg_auditor(state: SwarmState) -> dict:
    G = state["graph"]

    print("\n" + "="*60)
    print("📊 ESG AUDITOR — START")
    print("="*60)

    # ── Inputs - Graph Payload ────────────────────────────────────────────────────
    # STEP 1) Read deterministic inputs from previous nodes.
    sme_id         = state["graph_payload"]["sme"].get("sme_id", "sme_0")
    baseline_score = state["sedg_output"]["overall_esg_score"]
    print(f"  sme_id:         {sme_id}")
    print(f"  baseline_score: {baseline_score}")

    # STEP 2) Read fraud impact produced by fraud detector.
    fraud_report      = state.get("fraud_output", {})
    greenwash_penalty = fraud_report.get("greenwash_penalty", 0)
    fraud_summary     = fraud_report.get("summary", "No fraud detected")
    print(f"\n--- Fraud Signal ---")
    print(f"  greenwash_penalty: {greenwash_penalty}  (expected: negative int)")
    print(f"  fraud_summary:     {fraud_summary}")
    if greenwash_penalty >= 0:
        print("  ⚠️  WARNING: greenwash_penalty is 0 or positive — fraud detector may have failed")

    # STEP 3) Read news-driven risk summary from impact analysis.
    risk_summary = state["impact_analysis"]["risk_summary"]
    news_impact  = risk_summary.get("esg_drop", 0)
    events       = risk_summary.get("events_processed", [])
    affected_ids = risk_summary.get("affected_suppliers", [])
    print(f"\n--- News Signal ---")
    print(f"  esg_drop (news_impact): {news_impact}  (expected: negative or 0)")
    print(f"  events_processed:       {len(events)}")
    print(f"  affected_suppliers:     {affected_ids}")
    if news_impact > 0:
        print("  ⚠️  WARNING: esg_drop is positive — check detect_risk, penalties should be negative")

    # STEP 4) Combine ESG impacts using deterministic math.
    total_impact    = news_impact + greenwash_penalty
    projected_score = max(0, baseline_score + total_impact)
    print(f"\n--- Combined Impact ---")
    print(f"  total_impact:    {news_impact} (news) + {greenwash_penalty} (fraud) = {total_impact}")
    print(f"  projected_score: {baseline_score} + {total_impact} = {projected_score}")

    # STEP 5) Build graph exposure context (SME -> affected supplier paths).
    print(f"\n--- Graph Exposure Paths ---")
    exposure_paths = {}
    for supplier_id in affected_ids:
        path = find_path_to_risk(G, sme_id, supplier_id)
        if path and not path.get("error"):
            exposure_paths[supplier_id] = path
            print(f"  ✅ {sme_id} → {supplier_id}: {path.get('summary','')}")
        else:
            print(f"  ⚠️  No path found: {sme_id} → {supplier_id}")

    if not exposure_paths:
        print("  ⚠️  WARNING: no exposure paths found — AI auditor has no graph context")

    # STEP 6) Gather all risk flags currently written on graph.
    risk_overview = get_risk_nodes(G)
    print(f"\n--- Global Risk Nodes ---")
    print(f"  count: {risk_overview['count']}")
    for rn in risk_overview["risk_nodes"]:
        print(f"    ⚑  {rn['id']} — {rn['risk_reason']}")

    # STEP 7) Lock the target risk node in Python (LLM cannot override this).
    forced_risk_node = _select_worst_risk_node(risk_overview, G, sme_id)
    print(f"  🔒 Forcing risk_node_id = {forced_risk_node} (Python-locked, AI cannot override)")

    # STEP 8) Read retry context from previous CFO cycle, if any.
    retry_count      = state.get("auditor_retry_count", 0)
    reject_reason    = state.get("cfo_reject_reason", "")
    previous_supplier = state.get("auditor_output", {}).get("decision", {}).get("new_supplier_id")
    
    print(f"\n--- Retry Context ---")
    print(f"  retry_count:        {retry_count}")
    print(f"  reject_reason:      {reject_reason or 'none'}")
    print(f"  previous_supplier:  {previous_supplier or 'none'}")

    # STEP 9) Identify improvement opportunities across ESG pillars.
    print(f"\n--- Improvement Opportunity Scan ---")
    esg_kpis = _convert_sedg_to_esg_kpis(state["graph_payload"]["esg_metrics"])
    improvement_opportunities = _identify_improvement_opportunities(esg_kpis)
    top_gaps = improvement_opportunities[:5]   # top 5 to keep payload tight
    for opp in top_gaps:
        print(
            f"  [{opp['pillar']}] {opp['metric']}: "
            f"current={opp['current']} → target={opp['target']} "
            f"| gap={opp['gap']} | priority={opp['priority']}"
        )
    if not improvement_opportunities:
        print("  ✅ All metrics meeting thresholds")

    # STEP 10) Ask LLM for replacement supplier strategy.
    system1 = """
    You are the Chief Sustainability Officer.

    Maintain Tier-1 Green Loan status (ESG >= 85).

    IMPORTANT CONSTRAINTS:
    - "forced_risk_node_id" is LOCKED by the system. Copy it exactly into "risk_node_id". Do NOT choose a different supplier.
    - "previously_tried_supplier" must NOT be chosen as "new_supplier_id" on retry attempts.
    - Choose "new_supplier_id" only from the provided "alternatives" list.

    You receive:
    - ESG risk events (news + fraud signals)
    - Graph-based supply chain exposure paths
    - Pre-flagged risk nodes from the system graph

    Your responsibilities:
    TRACK 1 — SUPPLIER SWAP:
    1. Accept forced_risk_node_id as risk_node_id (do not change it)
    2. Choose the best replacement from the alternatives list
    3. On retry: pick a DIFFERENT alternative than previously_tried_supplier

    Output JSON:
    {
        "risk_node_id": "copy forced_risk_node_id exactly",
        "new_supplier_id": "chosen replacement ID from alternatives",
        "esg_score_before": number,
        "esg_score_after": number,
        "proposed_action": "e.g. Replacing SUP_X with SUP_Y",
        "rationale": "why this switch best balances ESG and cost",
        "improvement_summary": {
            "total_actions": 4,
            "high_effort_count": 2,
            "dominant_pillar": "S",
            "expected_esg_uplift": "+42.3 ESG points",
            "reasoning_trace": "Social governance gaps dominate ESG risk profile; improvements focus on workforce and supply chain compliance."
        }
    }

    Return ONLY valid JSON.
    Do not add extra fields.
    """

    system2 = """
    You are the Chief Sustainability Officer.

    Maintain Tier-1 Green Loan status (ESG >= 85).

    You receive:
    - A ranked list of ESG metric gaps vs. known thresholds (improvement_opportunities)
    - The SME's current ESG metrics (sme condition)

    Your responsibilities:
    TRACK 2 — METRIC IMPROVEMENTS:
    1. Review improvement_opportunities (ranked by priority)
    2. For each top gap, propose a concrete, actionable improvement step based on the sme condition
    3. Estimate the ESG score uplift each action could contribute based on SEDG proportion not the gap (+points)
    4. Rank by impact vs. effort (HIGH/MEDIUM/LOW effort)

    Output MUST be valid JSON with exactly these keys:
    {
      "improvement_actions": [
            {
                "metric":          "metric key",
                "pillar":          "E | S | G",
                "current":         number or null,
                "target":          number,
                "gap":             number,
                "action":          "specific step to close the gap",
                "estimated_uplift": "+X ESG points",
                "effort":          "LOW | MEDIUM | HIGH"
            }
        ],
    }

    Output ONLY the JSON. No markdown, no preamble.
    """

    supplier_list = state["graph_payload"]["suppliers"]

    supplier_esg = next(
        (s.get("esg_score", 0) for s in supplier_list if s.get("id") == forced_risk_node),
        0
    )

    user_payload_1 = {
        "loan_at_risk":              risk_summary.get("loan_at_risk"),
        "esg_score_before":          baseline_score + total_impact,
        "esg_score_after":           _compute_esg_after(baseline_score, total_impact, supplier_esg),
        "risk_events_breakdown": 
        [
            {
                "event": e.get("event", ""),
                "impact": e.get("impact", 0)
            }
            for e in events[:5]
        ],
        "news_impact_deduction":     news_impact,
        "fraud_summary":             fraud_summary,
        "greenwash_penalty":         greenwash_penalty, 
        "total_esg_impact":          total_impact,
        
        "graph_exposure_summary": 
        [
            {
                "supplier_id": sid,
                "risk_summary": path.get("summary", "")
            }
            for sid, path in list(exposure_paths.items())[:3]
        ],

        "global_risk_nodes": 
        [
            {
                "id": rn["id"],
                "risk_reason": rn.get("risk_reason", ""),
            }
            for rn in risk_overview["risk_nodes"][:5]
        ],
        "forced_risk_node_id":       forced_risk_node,
        "alternatives":              risk_summary.get("alternatives", [])[:5],
        
        "retry_attempt":             retry_count,
        "previously_tried_supplier": previous_supplier,
        "cfo_reject_reason":         reject_reason,
    }

    user_payload_2 = {
        "loan_at_risk":              risk_summary.get("loan_at_risk"),
        "esg_score_before":          baseline_score,
        "total_esg_impact":          total_impact,
        
        "improvement_opportunities": top_gaps, 
        "sme_condition":             state["graph_payload"]["esg_metrics"],
        
        "retry_attempt":             retry_count,
        "cfo_reject_reason":         reject_reason,
    }

    print(f"\n--- Calling AI Auditor ---")
    print(f"  loan_at_risk:             {risk_summary.get('loan_at_risk')}")
    print(f"  esg_score_before:         {baseline_score}")
    print(f"  risk_events_breakdown:    {user_payload_1['risk_events_breakdown']}")
    print(f"  news_impact_deduction:    {news_impact}")
    print(f"  fraud_summary:            {fraud_summary}")
    print(f"  greenwash_penalty:        {greenwash_penalty}")
    print(f"  total_esg_impact:         {total_impact}")

    print(f"  graph_exposure_paths:     {user_payload_1['graph_exposure_summary']}")
    print(f"  global_risk_nodes:        {user_payload_1['global_risk_nodes']}")
    print(f"  forced_risk_node_id:      {user_payload_1['forced_risk_node_id']}")
    print(f"  alternatives:             {user_payload_1['alternatives']}")

    print(f"  improvement_opportunities:{user_payload_2['improvement_opportunities']}")
    print(f"  sme_condition:            {user_payload_2['sme_condition']}")

    print(f"  retry_attempt:            {retry_count}")
    print(f"  previously_tried_supplier:{previous_supplier}")
    print(f"  cfo_reject_reason:        {reject_reason}")
    
    ai_result_1 = call_ai(system1, json.dumps(user_payload_1))

    ai_result_2 = call_ai(system2, json.dumps(user_payload_2))

    # STEP 10) Inspect model output for observability.
    print(f"\n--- AI Auditor Output ---")

    # ── 🔒 HARD ENFORCEMENT (AFTER AI) ─────────────────────────
    decision = ai_result_1

    new_supplier = decision.get("new_supplier_id")
    alternatives = risk_summary.get("alternatives", [])
    previous_supplier = state.get("auditor_output", {}).get("new_supplier_id")

    if new_supplier == previous_supplier:
        print(f"⚠️ AI reused previous supplier {new_supplier}, overriding...")

        fallback = next(
            (s for s in alternatives if s != previous_supplier),
            None
        )

        if fallback:
            decision["new_supplier_id"] = fallback
            decision["rationale"] += " (auto-corrected: avoided previously tried supplier)"


    ai_results = {
        "decision": ai_result_1,
        "improvements": ai_result_2.get("improvement_actions", []),
        "improvement_summary": ai_result_1.get("improvement_summary")
    }

    print(ai_results)

    print(f"\n✅ auditor — DONE")
    print("="*60 + "\n")

    return {
        "auditor_output": ai_results,
        "tried_suppliers": state.get("tried_suppliers", []) + [
            ai_results.get("decision", {}).get("new_supplier_id")
        ]
    }


# ── Deterministic Worst-Node Selector ──────────────────
def _select_worst_risk_node(
    risk_overview: dict,
    G,
    sme_id: str,
) -> str | None:
    """
    Rank contracted flagged suppliers by severity and return the worst one.
    Priority: violation_count (x10) > negative_sentiment (x20) > esg_gap (x1)
    Only considers nodes reachable via contracts_with edge from SME.
    """
    risk_nodes = {rn["id"]: rn for rn in risk_overview.get("risk_nodes", [])}
    if not risk_nodes:
        return None

    scored = []
    for node_id in risk_nodes:
        if not G.has_node(node_id):
            continue

        # Only contracted suppliers
        edge = G.get_edge_data(sme_id, node_id)
        if not edge or edge.get("relation") != "contracts_with":
            continue

        attrs            = G.nodes[node_id]
        violation_score  = attrs.get("violation_count", 0) * 10
        sentiment_score  = abs(min(attrs.get("news_sentiment", 0), 0)) * 20
        esg_penalty      = max(0, 60 - attrs.get("esg_score", 60))
        total            = violation_score + sentiment_score + esg_penalty
        scored.append((total, node_id))

    if not scored:
        return None

    scored.sort(reverse=True)
    worst_id = scored[0][1]
    print(f"\n  📌 Worst risk node (Python): {worst_id} "
          f"| score={scored[0][0]:.1f} "
          f"| ranking={[s[1] for s in scored]}")
    return worst_id


# ── ESG Pillar Thresholds ─────────────────────────────────────────────────────
# Each pillar defines: target, weight (importance), and unit label
ESG_PILLAR_THRESHOLDS = {
    # Environmental
    "carbon_emissions_reduction":   {"target": 20.0,  "weight": 10, "unit": "%",     "pillar": "E"},
    "renewable_energy_usage":       {"target": 50.0,  "weight": 9,  "unit": "%",     "pillar": "E"},
    "waste_recycling_rate":         {"target": 60.0,  "weight": 7,  "unit": "%",     "pillar": "E"},
    "water_usage_reduction":        {"target": 15.0,  "weight": 6,  "unit": "%",     "pillar": "E"},
    # Social
    "employee_satisfaction":        {"target": 75.0,  "weight": 8,  "unit": "score", "pillar": "S"},
    "gender_pay_gap":               {"target": 5.0,   "weight": 7,  "unit": "%",     "pillar": "S", "lower_is_better": True},
    "training_hours_per_employee":  {"target": 40.0,  "weight": 5,  "unit": "hrs",   "pillar": "S"},
    "supply_chain_audits":          {"target": 2.0,   "weight": 6,  "unit": "count", "pillar": "S"},
    # Governance
    "board_diversity":              {"target": 40.0,  "weight": 8,  "unit": "%",     "pillar": "G"},
    "esg_reporting_completeness":   {"target": 90.0,  "weight": 9,  "unit": "%",     "pillar": "G"},
    "anti_corruption_training":     {"target": 100.0, "weight": 7,  "unit": "%",     "pillar": "G"},
    "whistleblower_policy":         {"target": 1.0,   "weight": 5,  "unit": "bool",  "pillar": "G"},
}


def _convert_sedg_to_esg_kpis(sedg: dict) -> dict:
    """
    Convert raw SEDG telemetry into normalized ESG KPIs (0–100 scale).
    This layer is REQUIRED before feeding data into improvement engine or AI.
    """

    def safe_get(key, default=0.0):
        try:
            val = sedg.get(key, default)
            return float(val) if val is not None else default
        except Exception:
            return default

    # ─────────────────────────────────────────────
    # ENVIRONMENTAL KPIs
    # ─────────────────────────────────────────────

    scope1 = safe_get("sedg_e1_1_scope1_ghg_tco2e")
    scope2 = safe_get("sedg_e1_2_scope2_ghg_tco2e")

    renewable = safe_get("sedg_e2_1_renewable_fuel_wh")
    nonrenew  = safe_get("sedg_e2_1_nonrenewable_fuel_wh")
    electricity = safe_get("sedg_e2_1_electricity_wh")

    total_energy = renewable + nonrenew + electricity

    # Carbon efficiency score (lower emissions = higher score)
    carbon_intensity = scope1 + scope2
    carbon_emissions_reduction = max(
        0.0,
        min(100.0, 100 - (carbon_intensity * 1.5))  # scaled for realism
    )

    # Renewable energy usage (%)
    if total_energy > 0:
        renewable_energy_usage = (renewable / total_energy) * 100
    else:
        renewable_energy_usage = 0.0

    renewable_energy_usage = max(0.0, min(100.0, renewable_energy_usage))

    # Waste recycling proxy (if missing, assume neutral baseline)
    waste_generated = safe_get("sedg_e4_1_waste_generated_mt")
    waste_diverted  = safe_get("sedg_e4_1_waste_diverted_mt")

    if waste_generated > 0:
        waste_recycling_rate = (waste_diverted / waste_generated) * 100
    else:
        waste_recycling_rate = 50.0  # neutral fallback

    waste_recycling_rate = max(0.0, min(100.0, waste_recycling_rate))

    # Water usage reduction (heuristic: assume lower is better vs baseline)
    water = safe_get("sedg_e3_1_purchased_water_litres")
    water_usage_reduction = max(0.0, min(100.0, 100 - (water / 1000)))

    # ─────────────────────────────────────────────
    # SOCIAL KPIs
    # ─────────────────────────────────────────────

    female = safe_get("sedg_s3_1_female_pct")
    male   = safe_get("sedg_s3_1_male_pct")

    # Diversity score (closer to balance = higher score)
    gender_balance_gap = abs(50 - female)
    board_diversity = max(0.0, min(100.0, 100 - (gender_balance_gap * 2)))

    # Employee satisfaction (NOT in SEDG → derived proxy)
    training_hours_per_employee = safe_get("sedg_s2_1_avg_training_hrs")
    safety_incidents = safe_get("sedg_s4_1_injuries") + safe_get("sedg_s4_1_fatalities")

    employee_satisfaction = max(
        0.0,
        min(100.0, (training_hours_per_employee * 2) - (safety_incidents * 10) + 40)
    )

    # ─────────────────────────────────────────────
    # GOVERNANCE KPIs
    # ─────────────────────────────────────────────

    director_count = safe_get("sedg_g1_1_director_count")

    policies = [
        sedg.get("sedg_g2_1_code_of_conduct", False),
        sedg.get("sedg_g2_1_anti_corruption_policy", False),
        sedg.get("sedg_g2_1_whistleblowing_policy", False),
        sedg.get("sedg_g2_1_health_safety_policy", False),
    ]

    policy_score = (sum(1 for p in policies if p) / len(policies)) * 100

    audit_year = sedg.get("sedg_g3_1_last_audit_year")
    audit_score = 100 if audit_year == 2025 else 70 if audit_year == 2024 else 40

    corruption = safe_get("sedg_g4_1_corruption_incidents")
    anti_corruption_training = max(0.0, 100 - (corruption * 20))

    # ─────────────────────────────────────────────
    # FINAL KPI OUTPUT
    # ─────────────────────────────────────────────

    return {
        # Environmental
        "carbon_emissions_reduction": round(carbon_emissions_reduction, 2),
        "renewable_energy_usage": round(renewable_energy_usage, 2),
        "waste_recycling_rate": round(waste_recycling_rate, 2),
        "water_usage_reduction": round(water_usage_reduction, 2),

        # Social
        "training_hours_per_employee": round(training_hours_per_employee, 2), 
        "employee_satisfaction": round(employee_satisfaction, 2),
        "board_diversity": round(board_diversity, 2),

        # Governance
        "esg_reporting_completeness": round(policy_score, 2),
        "anti_corruption_training": round(anti_corruption_training, 2),
        "whistleblower_policy": 100.0 if sedg.get("sedg_g2_1_whistleblowing_policy") else 0.0,
    }


# ── Helper: Improvement Opportunity Scanner ───────────────────────────────────
def _identify_improvement_opportunities(esg_metrics: dict) -> list[dict]:
    """
    ESG KPI-based improvement scanner (0–100 normalized inputs only).
    """

    opportunities = []

    for metric, config in ESG_PILLAR_THRESHOLDS.items():
        current = esg_metrics.get(metric)
        target  = config["target"]

        # ─────────────────────────────
        # Missing data handling
        # ─────────────────────────────
        if current is None:
            opportunities.append({
                "metric": metric,
                "pillar": config["pillar"],
                "current": None,
                "target": target,
                "gap": target,
                "gap_pct": 100.0,
                "priority": config["weight"] * 5,  # reduced penalty (more stable)
                "unit": config["unit"],
                "action_hint": f"Missing KPI — implement tracking for {metric}"
            })
            continue

        current = float(current)

        # Skip already healthy metrics
        if current >= target:
            continue

        gap = target - current
        gap_pct = (gap / target) * 100 if target else 0

        # smoother priority curve (more stable for AI ranking)
        priority = round(config["weight"] * (gap_pct / 20), 2)

        action_hint = (
            f"Improve {metric.replace('_', ' ')} "
            f"from {current:.1f} → {target} "
            f"(gap {gap:.1f})"
        )

        opportunities.append({
            "metric": metric,
            "pillar": config["pillar"],
            "current": round(current, 2),
            "target": target,
            "gap": round(gap, 2),
            "gap_pct": round(gap_pct, 2),
            "priority": priority,
            "unit": config["unit"],
            "action_hint": action_hint,
        })

    return sorted(opportunities, key=lambda x: -x["priority"])

def _compute_esg_after(esg_score_before, total_esg_impact, supplier_esg_score):
    base = esg_score_before + total_esg_impact

    replacement_bonus = max(
        0,
        min(8, (60 - supplier_esg_score) / 10)
    )

    esg_after = base + replacement_bonus

    return round(max(0, min(100, esg_after)), 2)