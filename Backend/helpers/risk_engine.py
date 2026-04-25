"""
risk_engine.py
==============
Risk extraction helper.

Purpose:
- Parse news events and match them against regulatory penalty rules.
- Compute aggregate ESG penalty and loan-at-risk status.
- Suggest cleaner supplier alternatives for auditor remediation.
"""

def match_penalty(event, regulations):
    """
    Match news event to the single BEST (most severe) regulation penalty.
    Priority:
      1. Direct string containment match (most accurate)
      2. Majority keyword overlap (at least half the rule words must match)
    This prevents common words like 'illegal' from triggering weak rules.
    """
    event_lower = event.lower()
    best_penalty = 0
    best_rule = None

    for r in regulations:
        rule_lower = r["rule_name"].lower()
        rule_words = rule_lower.split()

        # Priority 1 — direct containment
        if rule_lower in event_lower or event_lower in rule_lower:
            candidate = r["esg_penalty"]
            if candidate < best_penalty:  # more negative = more severe
                best_penalty = candidate
                best_rule = r["rule_name"]

        # Priority 2 — majority keyword overlap (stricter than before)
        else:
            matched_words = [w for w in rule_words if w in event_lower]
            match_ratio = len(matched_words) / len(rule_words) if rule_words else 0

            if match_ratio >= 0.5:  # at least 50% of rule words must appear
                candidate = r["esg_penalty"]
                if candidate < best_penalty:
                    best_penalty = candidate
                    best_rule = r["rule_name"]

    print(f"✅ MATCHED RULE: {best_rule} | PENALTY: {best_penalty}")
    return best_penalty


def detect_risk(payload, G):
    """
    Detect the risk event from multiple news items, apply aggregated ESG penalties,
    and determine if the green loan is at risk.
    """
    # STEP 1) Read risk-driving inputs.
    news_items = payload.get("news", [])
    regulations = payload.get("regulations", [])
    
    # STEP 2) Process each event and aggregate penalties/entities.
    total_penalty = 0
    affected_entities = set()
    event_details = []

    for item in news_items:
        event = item.get("event")
        entity = item.get("entity")
        
        # Calculate penalty for this specific event
        penalty = match_penalty(event, regulations)
        total_penalty += penalty
        
        affected_entities.add(entity)
        event_details.append({
            "event": event,
            "entity": entity,
            "penalty": penalty
        })

    # STEP 3) Safety cap to prevent extreme one-pass score collapse.
    total_penalty = max(total_penalty, -50) 

    # STEP 4) Recompute ESG and evaluate green-loan threshold breach.
    old_score = payload["sme"]["esg_score"]
    new_score = max(0, old_score + total_penalty)

    # Explicitly find Tier1_Green threshold
    tier1 = next(
        (r for r in payload["loan_rates"] if r["tier_name"] == "Tier1_Green"),
        None
    )
    if tier1 is None:
        raise Exception("Tier1_Green not found in loan_rates")

    loan_threshold = tier1["min_esg_score"]

    # STEP 5) Select low-risk replacement suppliers for auditor.
    alternatives = [
        s["supplier_id"]
        for s in payload["suppliers"]
        if s.get("cert_status") != "none"
        and s.get("violation_count", 0) == 0
        # Check against the set of all entities found in the news
        and s["supplier_id"] not in affected_entities
    ]

    # STEP 6) Return normalized risk summary.
    print(f"--- Processing {len(news_items)} news items ---")
    print(f"✅ Total Penalty: {total_penalty}")
    print(f"✅ ESG: {old_score} → {new_score} | Loan at risk: {new_score < loan_threshold}")

    return {
        "events_processed": event_details,
        "affected_suppliers": list(affected_entities),
        "old_score": old_score,
        "new_score": new_score,
        "esg_drop": total_penalty,
        "loan_at_risk": new_score < loan_threshold,
        "alternatives": alternatives
    }