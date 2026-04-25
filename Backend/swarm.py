"""
swarm.py (Graph Intelligence Engine for Supply Chain Risk Assessment)
======================================================================

Sequential LangGraph workflow for ESG + supply chain risk analysis.

Key idea:
- Shared state + graph
- Sequential agent execution for deterministic results
- Controlled retry loop for audit refinement

Execution order:
1) SEDG Assessor       -> computes baseline ESG and bottleneck penalties
2) Impact Analysis     -> computes risk summary, loan change, and ripple impact
3) Fraud Detector      -> evaluates greenwashing + supplier-chain fraud signals
4) ESG Auditor         -> proposes remediation supplier switch & ESG actions
5) CFO                 -> evaluates financial viability and may request retry
6) Arbitrageur         -> final loan decision synthesis
"""

from __future__ import annotations
from langgraph.graph import StateGraph, END

from state.swarm_state import SwarmState
from logic.impact import build_impact_analysis
from logic.esg_math import run_sedg_assessor
from agents.fraud_detector import run_fraud_detector
from agents.auditor import run_esg_auditor
from agents.cfo import run_cfo, cfo_decision_router, increment_retry
from agents.arbitrageur import run_arbitrageur


# ─────────────────────────────────────────────────────────────────────────────
# Workflow definition
# ─────────────────────────────────────────────────────────────────────────────

# Shared mutable state schema passed between all nodes.
workflow = StateGraph(SwarmState)

# Core nodes (business logic).
workflow.add_node("sedg_assessor", run_sedg_assessor)
workflow.add_node("impact_analysis", build_impact_analysis)
workflow.add_node("fraud_detector", run_fraud_detector)
workflow.add_node("auditor", run_esg_auditor)
workflow.add_node("cfo", run_cfo)

# Retry control node increments retry counter used by auditor/cfo loop.
workflow.add_node("retry_increment", increment_retry)

# Final decision node.
workflow.add_node("arbitrageur", run_arbitrageur)


# ─────────────────────────────────────────────────────────────────────────────
# Linear execution chain
# ─────────────────────────────────────────────────────────────────────────────

# Entry point consumes `graph_payload` + `graph` from main.py.
workflow.set_entry_point("sedg_assessor")
workflow.add_edge("sedg_assessor", "impact_analysis")
workflow.add_edge("impact_analysis", "fraud_detector")
workflow.add_edge("fraud_detector", "auditor")


# ─────────────────────────────────────────────────────────────────────────────
# CFO decision loop (retry or proceed)
# ─────────────────────────────────────────────────────────────────────────────

workflow.add_edge("auditor", "cfo")

workflow.add_conditional_edges(
    "cfo",
    cfo_decision_router,
    {
        "retry_auditor": "retry_increment",
        "continue_to_arbitrageur": "arbitrageur",
    },
)

# Retry returns to auditor
workflow.add_edge("retry_increment", "auditor")


# ─────────────────────────────────────────────────────────────────────────────
# Final output
# ─────────────────────────────────────────────────────────────────────────────

workflow.add_edge("arbitrageur", END)

swarmapp = workflow.compile()