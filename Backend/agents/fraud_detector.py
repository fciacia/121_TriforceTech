"""
fraud_detector.py
=================
ESG Fraud Detector agent.
"""


import json
from utils.ai_caller import call_ai
from utils.graph_tools import get_supplier_network, flag_risk_node, get_risk_nodes
from state.swarm_state import SwarmState

# Determine if a company is "greenwashing"
# - making false or exaggerated ESG claims.
def run_fraud_detector(state: SwarmState) -> dict:
    # Graph 
    G      = state["graph"]
    sme_id = state["graph_payload"]["sme"].get("sme_id")

    print("\n" + "="*60)
    print("🔍 FRAUD DETECTOR — START")
    print("="*60)

    # ── Inputs - Graph Payload ────────────────────────────────────────────────────
    claims      = state["graph_payload"].get("claims", [])
    evidence    = state["graph_payload"].get("evidence_corpus", [])
    esg_metrics = state["graph_payload"].get("esg_metrics", {})

    # ── Contracted suppliers from graph (not payload) ─────────────
    contracted_suppliers = [
        {"supplier_id": target, **G.nodes[target]}
        for _, target, data in G.edges(sme_id, data=True)
        if data.get("relation") == "contracts_with"
    ]
    contracted_ids = {s["supplier_id"] for s in contracted_suppliers}

    print(f"📋 Claims received:          {len(claims)}")
    print(f"📋 Evidence corpus entries:  {len(evidence)}")
    print(f"📋 Contracted suppliers:     {contracted_ids}")
    print(f"📋 SME Metrics:              {esg_metrics}")

    if not claims:
        print("  ⚠️  WARNING: no claims — fraud detector has nothing to evaluate")
    if not contracted_suppliers:
        print("  ⚠️  WARNING: no contracted suppliers found in graph — check sme_id and edges")

    # ── Supplier Network Scan (hybrid: graph traversal + attribute fallback) ──
    print("\n--- Supplier Network Scan ---")
    supplier_network_insights: list[dict] = []
    is_flat_graph = True

    for node_data in contracted_suppliers:
        sid = node_data["supplier_id"]

        # ── Approach 1: graph traversal (tier-2/3 upstream edges) ─
        network      = get_supplier_network(G, sid, depth=3)
        has_upstream = network.get("dirty_factory_detected", False)
        upstream_dirty_nodes = network.get("dirty_nodes", [])
        is_flat_graph = network.get("tiers", {}) == {}

        # ── Approach 2: node attribute analysis (flat graph fallback) ─
        attr_flags = []
        if node_data.get("violation_count", 0) > 0:
            attr_flags.append(f"regulatory_violations({node_data['violation_count']})")
        if node_data.get("cert_status") == "none":
            attr_flags.append("no_certification")
        if node_data.get("news_sentiment", 0) < -0.5:
            attr_flags.append(f"negative_sentiment({node_data['news_sentiment']})")
        if node_data.get("esg_score", 100) < 60:
            attr_flags.append(f"low_esg({node_data['esg_score']})")
        attr_is_dirty = len(attr_flags) >= 2

        # ── Merge: graph wins if upstream found, else attribute fallback ──
        if has_upstream:
            is_dirty         = True
            dirty_nodes      = upstream_dirty_nodes
            detection_method = "graph_traversal"
            tier_summary     = network.get("summary", "")
        elif is_flat_graph and attr_is_dirty:
            is_dirty         = True
            dirty_nodes      = [sid]
            detection_method = "attribute_analysis"
            tier_summary     = (
                f"Flat graph — '{sid}' flagged via attributes: {', '.join(attr_flags)}"
            )
        else:
            is_dirty         = False
            dirty_nodes      = []
            detection_method = "graph_traversal" if not is_flat_graph else "attribute_analysis"
            tier_summary     = (
                network.get("summary", "")
                if not is_flat_graph
                else f"No risk signals detected for '{sid}'"
            )

        # ── Graph writeback ───────────────────────────────────────
        if is_dirty:
            for dirty_id in dirty_nodes:
                reason = (
                    "dirty_factory_chain"
                    if detection_method == "graph_traversal"
                    else ", ".join(attr_flags)
                )
                flag_risk_node(G, dirty_id, reason=reason)
                print(f"    ⚑  Flagged: {dirty_id} [{detection_method}] — {reason}")

        print(
            f"  [{sid}] method={detection_method} | dirty={is_dirty} | "
            f"attr_flags={attr_flags} | upstream_dirty={upstream_dirty_nodes}"
        )

        supplier_network_insights.append({
            "supplier_id":            sid,
            "dirty_factory_detected": is_dirty,
            "dirty_nodes":            dirty_nodes,
            "risk_flags":             attr_flags,
            "detection_method":       detection_method,
            "tier_summary":           tier_summary,
        })

    total_dirty = sum(1 for s in supplier_network_insights if s["dirty_factory_detected"])
    print(f"\n📊 Dirty suppliers detected: {total_dirty}/{len(supplier_network_insights)}")
    print(f"📊 Detection method: {'graph_traversal' if not is_flat_graph else 'attribute_analysis (flat graph)'}")

    # ── Graph risk nodes at this point ────────────────────────────
    current_risk_nodes = get_risk_nodes(G)
    print(f"📊 Graph risk nodes: {current_risk_nodes['count']}")
    for rn in current_risk_nodes["risk_nodes"]:
        print(f"    ⚑  {rn['id']} — {rn['risk_reason']}")

    # ── AI call ───────────────────────────────────────────────────
    print("\n--- Calling AI Fraud Model ---")
    print(f"  Claims sample:   {claims[:2]}")
    print(f"  Evidence sample: {evidence[:2]}")

    system = """
    You are a Financial Fraud Intelligence Officer specializing in ESG greenwashing detection and supply chain integrity.

    Tasks:
    Evaluate the alignment between an SME's ESG claims and the provided evidence/metrics. 
    Identify contradictions, missing data (vagueness), and supply chain risks (dirty-chain).
    You need to express how high your confidence is about this reasoning, and assign a greenwashing risk level (LOW, MEDIUM, HIGH) along with a penalty score.
    You need to provide detailed reasoning for each flagged claim and any dirty-chain risks, citing specific evidence, metrics, or graph insights.

    EVALUATION PROTOCOL:
    1. DOMAIN MATCHING: Only use evidence or metrics to refute a claim if they share the same domain (e.g., use 'energy' metrics for 'energy' claims). 
    2. QUANTITATIVE CROSS-REFERENCE: For claims involving percentages or numbers (e.g., "15% reduction"), cross-reference the 'esg_metrics' object. If the math does not support the claim, flag it as a CONTRADICTION in issue_type.
    3. DATA ABSENCE: If a claim is made but no relevant metrics or evidence exist in the payload, flag it as VAGUENESS in issue_type.
    4. CHAIN ANALYSIS: Identify "Dirty-Chain" risks where contracted suppliers have regulatory violations, low ESG scores, or negative sentiment. This is a supply chain risk, even if it doesn't directly disprove a specific claim.

    PENALTY RUBRIC:
    - HIGH (-10 to -20): Direct mathematical contradictions or 3+ dirty contracted suppliers.
    - MEDIUM (-5 to -9): 50%+ of claims are Vague (unsupported) or 1-2 dirty suppliers.
    - LOW (-1 to -4): Minor inconsistencies or neutral/low-severity news.

    OUTPUT FORMAT:
    Return ONLY valid JSON. No markdown blocks, no preamble.
    {
        "greenwash_risk_level": "LOW | MEDIUM | HIGH",
        "fraud_analysis": "A detailed breakdown of which specific claims were contradicted or unsupported by the evidence. Group them by theme if possible.",
        "dirty_chain_risk": "A summary identifying specific supplier IDs that pose risks and the graph insights that triggered the flag.",
        "confidence": 0-100,
        "greenwash_penalty": -int,
        "summary": "An executive summary combining the risk level and the primary reason for the score.",
    }
    """

    trimmed_claims, trimmed_evidence = _compress_payload(claims, evidence, max_evidence=8)

    user = json.dumps({
        "claims":                   trimmed_claims,
        "evidence_corpus":          trimmed_evidence,
        "esg_metrics":              esg_metrics,
        "graph_supplier_networks":  supplier_network_insights,
        "graph_flagged_risk_nodes": current_risk_nodes["risk_nodes"],
    })

    result = call_ai(system, user)

    # ── Debug AI output ───────────────────────────────────────────
    print("\n--- AI Fraud Model Output ---")
    print(f"  greenwash_risk_level: {result.get('greenwash_risk_level')}")
    print(f"  fraud_analysis:       {result.get('fraud_analysis')}")
    print(f"  dirty_chain_risk:     {result.get('dirty_chain_risk')}")
    print(f"  confidence:           {result.get('confidence')}")
    print(f"  greenwash_penalty:    {result.get('greenwash_penalty', [])}")
    print(f"  summary:              {result.get('summary', '')}")

    print("\n✅ FRAUD DETECTOR — DONE")
    print("="*60 + "\n")

    return {"fraud_output": result}


# ── Smart payload compression before AI call ──────────────────
def _compress_payload(claims: list, evidence: list, max_evidence: int = 8) -> tuple:
    """Keep only evidence whose domain/keywords overlap with the claims."""
    
    # Extract keywords from all claims (lowercase words > 4 chars)
    claim_text = " ".join(claims).lower()
    claim_keywords = set(w for w in claim_text.split() if len(w) > 4)

    scored_evidence = []
    for e in evidence:
        # Score each evidence entry by keyword overlap
        e_text = json.dumps(e).lower()
        score = sum(1 for kw in claim_keywords if kw in e_text)
        scored_evidence.append((score, e))

    # Sort by relevance, keep top N, discard score=0 only if we have enough
    scored_evidence.sort(key=lambda x: x[0], reverse=True)
    
    relevant = [e for score, e in scored_evidence if score > 0]
    fallback = [e for score, e in scored_evidence if score == 0]

    # Fill up to max_evidence: relevant first, then fallback
    trimmed_evidence = (relevant + fallback)[:max_evidence]

    return claims, trimmed_evidence