"""
graph_engine.py
===============
Knowledge graph builder.

Purpose:
- Convert payload entities into a directed graph used by swarm agents.
- Attach key node/edge attributes for ESG, risk, and financial traversal tools.
"""

import networkx as nx

print("✅ graph_engine.py LOADED - CONTRACTS_WITH VERSION")

def build_graph(payload):
    """
    Build directed supply-risk graph from payload.

    Args:
        payload: Ingested SME/suppliers/contracts/news/regulations/loan_rates payload.
    Returns:
        NetworkX DiGraph with typed nodes and relations.
    """
    # STEP 1) Initialize directed graph and add SME node.
    G = nx.DiGraph()

    # =========================
    # 1. SME NODE
    # =========================
    sme = payload.get("sme", {})
    print("🔥 SME DATA USED:", sme)

    sme_attr = {
        "name":      sme.get("name", "Unknown"),
        "sector":    sme.get("sector", "Unknown"),
        "revenue":   sme.get("revenue", 0),
        "esg_score": sme.get("esg_score", 50),
        "has_risk":  False
    }
    metrics = payload.get("esg_metrics") or {}

    print("✅ FINAL SME ATTR:", sme_attr)
    print("✅ FINAL ESG METRICS:", metrics)

    G.add_node(sme.get("sme_id"), type="company", **sme_attr, esg_metrics=metrics)

    # STEP 2) Add supplier nodes and contract availability edges.
    contracted_ids = {
        c["supplier_id"]: c for c in payload.get("contracts", [])
    }

    print("✅ CONTRACTED SUPPLIERS:", set(contracted_ids.keys()))

    for supplier in payload.get("suppliers", []):
        sid = supplier["supplier_id"]

        # ── Add supplier node ──
        G.add_node(
            sid,
            type="supplier",
            name=supplier["name"],
            esg_score=supplier.get("esg_score", 0),
            unit_cost=supplier.get("unit_cost", 0),
            violation_count=supplier.get("violation_count", 0),
            news_sentiment=supplier.get("news_sentiment", 0),
            cert_status=supplier.get("cert_status", "none"),
            regulatory_violation=supplier.get("violation_count", 0) > 0,
            has_risk=False  
        )

        # ── Add edge ──
        if sid in contracted_ids:
            c = contracted_ids[sid]
            weight = c.get("annual_cogs") or 1.0

            G.add_edge(
                sme.get("sme_id"),
                sid,
                relation="contracts_with",
                annual_cogs=c.get("annual_cogs", 0),
                weight=weight
            )
        
        else:
            G.add_edge(
                sme.get("sme_id"),
                sid,
                relation="available_to",
                weight=0.1
            )

    # STEP 3) Add news event nodes and affects edges.
    for i, news in enumerate(payload.get("news", [])):
        news_id = f"NEWS_{i}"

        G.add_node(
            news_id,
            type="event",
            event=news["event"],
            severity=news.get("severity", 0)
        )

        entity = news.get("entity")

        # Flag high-severity contracted supplier risks directly on graph.
        if news.get("severity", 0) >= 7 and entity and G.has_node(entity):
            if entity in contracted_ids:  # ← only flag contracted suppliers
                G.nodes[entity]["has_risk"] = True
                G.nodes[entity]["risk_reason"] = "high_severity_news"
            else:
                print(f"  ⚠️  News entity '{entity}' not contracted — skipping risk flag")

        # Add event-to-entity edge only when target exists.
        if entity and G.has_node(entity):
            G.add_edge(news_id, entity, relation="affects")

    # STEP 4) Add regulation nodes and governance edges.
    for rule in payload.get("regulations", []):
        G.add_node(
            rule["rule_id"],
            type="regulation",
            name=rule["rule_name"],
            penalty=rule["esg_penalty"]
        )
        G.add_edge(rule["rule_id"], sme.get("sme_id"), relation="governs")

    # STEP 5) Add loan tier nodes and SME eligibility edges.
    for tier in payload.get("loan_rates", []):
        G.add_node(
            tier["tier_name"],
            type="loan_tier",
            interest=tier["interest_rate"],
            min_score=tier["min_esg_score"]
        )
        G.add_edge(sme.get("sme_id"), tier["tier_name"], relation="eligible_for")

    print("DEBUG graph node IDs:", list(G.nodes())[:10])
    print("DEBUG graph edges sample:", list(G.edges(data=True))[:5])


    return G