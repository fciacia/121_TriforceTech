"""
main.py
=======
Engine entrypoint.

Purpose:
- Ingest source data, build graph, execute swarm workflow, and export outputs.
"""

import sys
from ingestion import build_payload
from helpers.graph_engine import build_graph
from swarm import swarmapp
from output.output_generator import generate_all_outputs
from output.report_generator import generate_sedg_pdf
from helpers.claim_helper import _extract_claims, _extract_evidence


def run_engine(sme_id: str = None):
    """
    Run end-to-end GREEN-GRAPHSWARM pipeline.

    Args:
        sme_id: Optional SME id filter.
    Returns:
        final_state from compiled swarm workflow.
    """
    print("─" * 50)
    print("     GREENTRUST PULSE ENGINE STARTED")
    print("     Framework: NSRF + SEDG (Malaysia)")
    print("─" * 50)

    # STEP 1) Load payload from ingestion sources.
    payload = build_payload(sme_id=sme_id)
    sme_name = payload["sme"].get("name", "SME")
    print(f"✅ Payload loaded for: {sme_name}")

    # STEP 2) Build graph representation used by all agents.
    G = build_graph(payload)
    print(f"✅ Graph built — {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    # STEP 3) Prepare normalized graph payload for swarm state.
    graph_summary = {
        "claims":         _extract_claims(payload),
        "evidence_corpus": _extract_evidence(payload),

        "sme":            payload["sme"],
        "esg_metrics":    payload["esg_metrics"],
        "suppliers":      payload["suppliers"],
        "contracts":      payload["contracts"],

        "loan_rates":     payload["loan_rates"],

        "news":            payload.get("news", []),      
        "regulations":     payload.get("regulations", []),
    }

    # STEP 4) Execute compiled LangGraph swarm.
    print("\n🤖 LAUNCHING AGENT SWARM...")
    print("   Agent 1/6: SEDG Assessor (E/S/G pillar scoring)...")
    final_state = swarmapp.invoke({
        "graph_payload": graph_summary,
        "graph": G,
        "auditor_retry_count": 0,      
        "cfo_reject_reason":   "", 
    })
    print("✅ All 6 agents completed")

    # STEP 5) Generate machine-readable JSON and PDF report outputs.
    print("\n📦 GENERATING JSON OUTPUT...")
    generate_all_outputs(final_state, sme_name=sme_name)

    print("\n📄 GENERATING SEDG DISCLOSURE REPORT...")
    generate_sedg_pdf(final_state, sme_name=sme_name)

    print(f"\n🎉 DONE!")

    return final_state


if __name__ == "__main__":
    sme_id = sys.argv[1] if len(sys.argv) > 1 else None
    run_engine(sme_id=sme_id)