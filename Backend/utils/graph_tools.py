"""
graph_tools.py
==============
Graph-Traversal Tools for the ESG Engine.

Instead of dumping raw node/edge lists into LLM prompts, each agent
calls a focused function here. The function queries the NetworkX graph
and returns a compact, structured dict — no LLM context wasted.

Tool catalogue
──────────────
get_supplier_network()          → 2nd/3rd-tier supplier map + dirty-factory flag
find_path_to_risk()             → shortest contract chain from SME to a risk node
get_financial_dependency_subgraph() → COGS / revenue nodes only (ripple scope)
get_bottleneck_suppliers()      → PageRank + betweenness centrality ranking
get_risk_nodes()                → all nodes already flagged :HAS_RISK on the graph
compute_supplier_esg_weight()   → ESG-weighted penalty for each supplier
"""

from __future__ import annotations
import networkx as nx


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _node_attr(G: nx.Graph, node: str) -> dict:
    """Safe attribute fetch — returns empty dict if node absent."""
    return dict(G.nodes[node]) if G.has_node(node) else {}


def _edge_weight(G: nx.Graph, u: str, v: str) -> float:
    data = G.get_edge_data(u, v) or G.get_edge_data(v, u) or {}
    return float(data.get("weight", data.get("annual_cogs", 1.0)))


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 1 — Supplier Network (for Fraud Detector)
# ─────────────────────────────────────────────────────────────────────────────

def get_supplier_network(
    G: nx.Graph,
    supplier_id: str,
    depth: int = 3,
) -> dict:
    """
    Walk up to `depth` hops from `supplier_id` through the graph and return
    every discovered node with its ESG attributes.

    Returns
    -------
    {
        "root": str,
        "tiers": {
            1: [{"id": ..., "name": ..., "esg_score": ..., "carbon_neutral": ..., "risk_flags": [...]}],
            2: [...],
            3: [...],
        },
        "dirty_factory_detected": bool,
        "dirty_nodes": [str],
        "summary": str,
    }
    """
    sme_id = G.graph.get("sme_id")
    if not G.has_node(supplier_id):
        return {"error": f"Node '{supplier_id}' not found in graph", "root": supplier_id}

    tiers: dict[int, list[dict]] = {}
    dirty_nodes: list[str] = []
    visited = {supplier_id}

    frontier = {supplier_id}
    for tier in range(1, depth + 1):
        next_frontier: set[str] = set()
        tier_data: list[dict] = []

        for node in frontier:
            neighbours = set()
            if hasattr(G, "predecessors"):
                neighbours.update(G.predecessors(node))
            for nb in neighbours:
                if nb == sme_id: # Don't allow the search to travel through the SME
                    continue
                if nb in visited:
                    continue
                visited.add(nb)
                next_frontier.add(nb)

                attrs = _node_attr(G, nb)
                risk_flags: list[str] = []

                if attrs.get("has_risk"):
                    risk_flags.append("graph_flagged_risk")
                if attrs.get("esg_score", 100) < 40:
                    risk_flags.append("low_esg")
                if attrs.get("carbon_neutral") is False and attrs.get("type") == "supplier":
                    risk_flags.append("not_carbon_neutral")
                if attrs.get("regulatory_violation"):
                    risk_flags.append("regulatory_violation")

                if not risk_flags:
                    continue  # only flag nodes that actually have a problem
                if attrs.get("type") not in ("supplier", "material"):
                    continue  # never flag SME, contracts, or regions as dirty factories

                if risk_flags:
                    dirty_nodes.append(nb)

                tier_data.append({
                    "id":             nb,
                    "name":           attrs.get("name", nb),
                    "type":           attrs.get("type", "unknown"),
                    "esg_score":      attrs.get("esg_score"),
                    "carbon_neutral": attrs.get("carbon_neutral"),
                    "renewable_cert": attrs.get("renewable_cert"),
                    "risk_flags":     risk_flags,
                    "edge_weight":    _edge_weight(G, node, nb),
                })

        if tier_data:
            tiers[tier] = tier_data
        frontier = next_frontier
        if not frontier:
            break

    return {
        "root":                    supplier_id,
        "tiers":                   tiers,
        "dirty_factory_detected":  bool(dirty_nodes),
        "dirty_nodes":             dirty_nodes,
        "summary": (
            f"Supplier '{supplier_id}' has {sum(len(v) for v in tiers.values())} "
            f"connected nodes across {len(tiers)} tier(s). "
            f"{'⚠ Dirty factory chain detected: ' + ', '.join(dirty_nodes) if dirty_nodes else 'No dirty-factory flags.'}"
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 2 — Path-to-Risk (for Auditor)
# ─────────────────────────────────────────────────────────────────────────────

def find_path_to_risk(
    G: nx.Graph,
    sme_id: str,
    risk_node: str,
) -> dict:
    """
    Find the shortest contract chain from the SME to a risk node.

    Returns
    -------
    {
        "path": [str],
        "path_length": int,
        "path_details": [{"node": str, "type": str, "esg_score": ...}],
        "total_cogs_at_risk": float,
        "summary": str,
    }
    """
    if not G.has_node(sme_id):
        return {"error": f"SME node '{sme_id}' not in graph"}
    if not G.has_node(risk_node):
        return {"error": f"Risk node '{risk_node}' not in graph"}

    try:
        # Try directed path first; fall back to undirected
        try:
            path = nx.shortest_path(G, source=sme_id, target=risk_node)
        except nx.NetworkXNoPath:
            path = nx.shortest_path(G.to_undirected(), source=sme_id, target=risk_node)
    except (nx.NodeNotFound, nx.NetworkXError):
        return {"path": [], "path_length": 0, "summary": "No path found between SME and risk node."}

    path_details = []
    total_cogs = 0.0
    for i, node in enumerate(path):
        attrs = _node_attr(G, node)
        cogs = 0.0
        if i < len(path) - 1:
            cogs = _edge_weight(G, node, path[i + 1])
            total_cogs += cogs
        path_details.append({
            "node":       node,
            "name":       attrs.get("name", node),
            "type":       attrs.get("type", "unknown"),
            "esg_score":  attrs.get("esg_score"),
            "has_risk":   attrs.get("has_risk", False),
            "cogs_to_next": cogs,
        })

    return {
        "path":              path,
        "path_length":       len(path) - 1,
        "path_details":      path_details,
        "total_cogs_at_risk": round(total_cogs, 2),
        "summary": (
            f"SME reaches risk node '{risk_node}' through {len(path) - 1} hop(s): "
            + " → ".join(path)
            + f". Total COGS exposure along path: RM {total_cogs:,.2f}."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 3 — Financial Dependency Subgraph (for CFO)
# ─────────────────────────────────────────────────────────────────────────────

# EXAMPLE OUTPUT:
# {
#     "sme_id": "SME3",

#     "financial_nodes": [
#         {
#             "rank": 1,
#             "supplier_id": "SUP_B",
#             "name": "Server Cooling Co",
#             "annual_cogs": 250000.0,
#             "pct_of_total": 45.2,
#             "esg_score": 72,
#             "has_risk": False
#         },
#         {
#             "rank": 2,
#             "supplier_id": "SUP_R",
#             "name": "Raw Materials Ltd",
#             "annual_cogs": 180000.0,
#             "pct_of_total": 32.5,
#             "esg_score": 50,
#             "has_risk": True
#         },
#         {
#             "rank": 3,
#             "supplier_id": "SUP_C",
#             "name": "Cloud Infrastructure Inc",
#             "annual_cogs": 90000.0,
#             "pct_of_total": 16.3,
#             "esg_score": 80,
#             "has_risk": False
#         }
#     ],

#     "total_cogs": 553000.0,

#     "top_risk_concentration": 77.7,

#     "summary": "Top 3 financially significant nodes represent RM 553,000.00 in COGS. Top-3 suppliers hold 77.7% of total spend."
# }

def get_financial_dependency_subgraph(
    G: nx.Graph,
    sme_id: str,
    top_n: int = 10,
) -> dict:
    """
    Build spend-ranked contracted supplier view for CFO/ripple analysis.

    Args:
        G: Live directed supply graph.
        sme_id: SME node id.
        top_n: Max suppliers to return.

    Returns:
        Dict with ranked financial nodes, total COGS, and concentration summary.

    NOTE: Concentration = how "focused" SME's spending is on a few suppliers
    """
    if not G.has_node(sme_id):
        return {"error": f"SME node '{sme_id}' not in graph"}

    # STEP 1) Read directly contracted suppliers (SME -> supplier edges).
    neighbours = [
        n for n in G.successors(sme_id)
        if G.edges[sme_id, n].get("relation") == "contracts_with"
    ]

    # STEP 2) Convert edges to (annual_cogs, supplier_id) tuples.
    weighted: list[tuple[float, str]] = []
    for nb in neighbours:
        attrs = _node_attr(G, nb)
        if attrs.get("type") not in ("supplier", "contract", "material"):
            continue
        # FIX: always read sme_id → nb (outgoing edge), not reverse
        edge_data = G.get_edge_data(sme_id, nb) or {}
        w = float(edge_data.get("annual_cogs", edge_data.get("weight", 1.0)))
        weighted.append((w, nb))

    # STEP 3) Sort by spend descending and compute concentration.
    weighted.sort(reverse=True)
    total_cogs = sum(w for w, _ in weighted) or 1.0

    financial_nodes = []
    for rank, (cogs, nb) in enumerate(weighted[:top_n], start=1):
        attrs = _node_attr(G, nb)
        financial_nodes.append({
            "rank":          rank,
            "supplier_id":   nb,
            "name":          attrs.get("name", nb),
            "annual_cogs":   round(cogs, 2),
            "pct_of_total":  round(cogs / total_cogs * 100, 1),
            "esg_score":     attrs.get("esg_score"),
            "has_risk":      attrs.get("has_risk", False),
        })

    top3_pct = sum(n["pct_of_total"] for n in financial_nodes[:3])

    return {
        "sme_id":                  sme_id,
        "financial_nodes":         financial_nodes,
        "total_cogs":              round(total_cogs, 2),
        "top_risk_concentration":  round(top3_pct, 1),
        "summary": (
            f"Top {min(top_n, len(financial_nodes))} financially significant nodes "
            f"represent RM {total_cogs:,.2f} in COGS. "
            f"Top-3 suppliers hold {top3_pct:.1f}% of total spend."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 4 — Bottleneck Suppliers via Centrality (for SEDG Assessor)
# ─────────────────────────────────────────────────────────────────────────────

def get_bottleneck_suppliers(G: nx.Graph, top_n: int = 5) -> dict:
    """
    Rank suppliers by PageRank (importance in supply network) and
    Betweenness Centrality (bottleneck potential).

    Returns
    -------
    {
        "bottlenecks": [
            {
                "supplier_id": str,
                "name": str,
                "pagerank": float,
                "betweenness": float,
                "esg_score": int | None,
                "risk_multiplier": float,   # how much ESG failure should be penalised
            }
        ],
        "summary": str,
    }
    """
    undirected = G.to_undirected()

    try:
        pr = nx.pagerank(undirected, weight="weight")
    except Exception:
        pr = {n: 1 / max(G.number_of_nodes(), 1) for n in G.nodes()}

    try:
        bc = nx.betweenness_centrality(undirected, normalized=True, weight="weight")
    except Exception:
        bc = {n: 0.0 for n in G.nodes()}

    supplier_nodes = [
        n for n, d in G.nodes(data=True) if d.get("type") == "supplier"
    ]

    scored = []
    for s in supplier_nodes:
        pagerank_val   = pr.get(s, 0.0)
        betweenness_val = bc.get(s, 0.0)
        # Risk multiplier: high-centrality suppliers get heavier ESG penalty
        risk_mult = round(1.0 + (pagerank_val * 5) + (betweenness_val * 3), 3)
        attrs = _node_attr(G, s)
        scored.append({
            "supplier_id":     s,
            "name":            attrs.get("name", s),
            "pagerank":        round(pagerank_val, 4),
            "betweenness":     round(betweenness_val, 4),
            "esg_score":       attrs.get("esg_score"),
            "risk_multiplier": risk_mult,
        })

    scored.sort(key=lambda x: x["pagerank"], reverse=True)

    return {
        "bottlenecks": scored[:top_n],
        "summary": (
            f"Top bottleneck supplier is '{scored[0]['supplier_id']}' "
            f"(PageRank={scored[0]['pagerank']:.4f}, "
            f"risk_multiplier={scored[0]['risk_multiplier']:.2f})."
            if scored else "No supplier nodes found in graph."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 5 — Risk Nodes (stateful graph reads)
# ─────────────────────────────────────────────────────────────────────────────

def get_risk_nodes(G: nx.Graph) -> dict:
    """
    Return all nodes that have been flagged :HAS_RISK by any agent.

    Returns
    -------
    {
        "risk_nodes": [{"id": str, "name": str, "risk_reason": str, "esg_score": ...}],
        "count": int,
        "summary": str,
    }
    """
    risk_nodes = []
    for node, attrs in G.nodes(data=True):
        if attrs.get("has_risk"):
            risk_nodes.append({
                "id":          node,
                "name":        attrs.get("name", node),
                "type":        attrs.get("type", "unknown"),
                "risk_reason": attrs.get("risk_reason", "unspecified"),
                "esg_score":   attrs.get("esg_score"),
            })

    return {
        "risk_nodes": risk_nodes,
        "count":      len(risk_nodes),
        "summary": (
            f"{len(risk_nodes)} node(s) currently flagged as risk in the graph."
            if risk_nodes else "No risk nodes flagged yet."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 6 — ESG-Weighted Supplier Penalty (for SEDG Assessor)
# ─────────────────────────────────────────────────────────────────────────────

def compute_supplier_esg_weight(
    G: nx.Graph,
    sme_id: str,
    supplier_esg_scores: dict[str, float],
) -> dict:
    """
    Weight each supplier's ESG score by their COGS share in the SME's
    supply chain. Returns a blended "supply-chain ESG drag" score.

    Parameters
    ----------
    supplier_esg_scores : {supplier_id: esg_score}
        Scores from the SEDG assessor or supplier records.

    Returns
    -------
    {
        "weighted_supply_chain_esg": float,
        "supplier_breakdown": [...],
        "worst_offender": str | None,
        "summary": str,
    }
    """
    fin = get_financial_dependency_subgraph(G, sme_id)
    if "error" in fin:
        return fin

    total_cogs  = fin["total_cogs"] or 1.0
    breakdown   = []
    weighted_sum = 0.0
    worst: tuple[float, str] = (999.0, "")

    for node_info in fin["financial_nodes"]:
        sid   = node_info["supplier_id"]
        cogs  = node_info["annual_cogs"]
        share = cogs / total_cogs
        esg   = supplier_esg_scores.get(sid, node_info.get("esg_score") or 50.0)
        contrib = share * esg
        weighted_sum += contrib

        if esg < worst[0]:
            worst = (esg, sid)

        breakdown.append({
            "supplier_id":    sid,
            "cogs_share_pct": round(share * 100, 1),
            "esg_score":      esg,
            "weighted_contribution": round(contrib, 2),
        })

    return {
        "weighted_supply_chain_esg": round(weighted_sum, 2),
        "supplier_breakdown":        breakdown,
        "worst_offender":            worst[1] or None,
        "summary": (
            f"Blended supply-chain ESG score: {weighted_sum:.1f}/100. "
            f"Worst offender: '{worst[1]}' (ESG={worst[0]:.0f})."
            if breakdown else "No financially significant suppliers found."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Stateful write-back helpers
# ─────────────────────────────────────────────────────────────────────────────

def flag_risk_node(
    G: nx.Graph,
    node_id: str,
    reason: str = "agent_detected",
    esg_score: float | None = None,
) -> None:
    """Write/overwrite node risk flag on graph for downstream agents."""
    if G.has_node(node_id):
        G.nodes[node_id]["has_risk"]    = True
        G.nodes[node_id]["risk_reason"] = reason
        if esg_score is not None:
            G.nodes[node_id]["esg_score"] = esg_score
    else:
        G.add_node(node_id, has_risk=True, risk_reason=reason, esg_score=esg_score)


def resolve_risk_node(G: nx.Graph, node_id: str) -> None:
    """Mark previously flagged node as resolved after remediation."""
    if G.has_node(node_id):
        G.nodes[node_id]["has_risk"]    = False
        G.nodes[node_id]["risk_reason"] = "resolved"


# graph_tools.py — add this function
def compute_sustainable_sourcing_pct(G, sme_id: str) -> float:
    """
    Computes percentage of sustainable suppliers in SME supply chain.

    Sustainable = NOT flagged as risk node in graph.
    """

    suppliers = [
        nbr for nbr in G.neighbors(sme_id)
        if G.get_edge_data(sme_id, nbr).get("relation") == "contracts_with"
    ]

    if not suppliers:
        return 0.0

    total = len(suppliers)
    sustainable = 0

    for s in suppliers:
        node = G.nodes.get(s, {})

        # Risk signals from your system
        is_risky = (
            node.get("risk_flag", False)
            or node.get("violation_count", 0) > 0
            or node.get("esg_score", 100) < 60
            or node.get("news_sentiment", 0) < -0.2
        )

        if not is_risky:
            sustainable += 1

    return round((sustainable / total) * 100, 2)