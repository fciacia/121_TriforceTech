from typing import TypedDict


# ─────────────────────────────────────────────────────────────────────────────
# SWARM STATE
# ─────────────────────────────────────────────────────────────────────────────
class SwarmState(TypedDict):
    graph_payload:    dict   # raw SME / supplier / contract data
    graph:            object # live NetworkX graph (mutated by agents)

    sedg_output:      dict
    fraud_output:     dict
    auditor_output:   dict
    cfo_output:       dict
    arbitrage_output: dict

    impact_analysis:  dict

    # Retry bookkeeping for CFO → Auditor loop
    auditor_retry_count: int
    cfo_reject_reason:   str