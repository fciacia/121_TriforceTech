def _extract_claims(payload: dict) -> list:
    reports = payload.get("esg_reports") or []
    metrics = payload.get("esg_metrics") or {}
    # Get IDs of active suppliers only
    contracted_ids = {c["supplier_id"] for c in payload.get("contracts", [])}
    claims = []

    # ─────────────────────────────────────────────
    # 1. Narrative ESG reports (split dynamically)
    # ─────────────────────────────────────────────
    for r in reports:
        text = r.get("report_text", "")
        sentences = [s.strip() for s in text.split(".") if s.strip()]
        for i, s in enumerate(sentences):
            claims.append(f"Report {r.get('report_id')} - Statement {i+1}: {s}")

    # ─────────────────────────────────────────────
    # 2. Computed SEDG metrics (facts, not opinions)
    # ─────────────────────────────────────────────

    if metrics.get("sedg_e1_1_scope1_ghg_tco2e") is not None:
        claims.append(
            f"Scope 1 emissions: {metrics['sedg_e1_1_scope1_ghg_tco2e']} tCO2e"
        )

    if metrics.get("sedg_e1_2_scope2_ghg_tco2e") is not None:
        claims.append(
            f"Scope 2 emissions: {metrics['sedg_e1_2_scope2_ghg_tco2e']} tCO2e"
        )

    if metrics.get("sedg_e2_1_renewable_fuel_wh") is not None:
        claims.append(
            f"Renewable energy usage: {metrics['sedg_e2_1_renewable_fuel_wh']} Wh"
        )

    if metrics.get("sedg_e2_1_nonrenewable_fuel_wh") is not None:
        claims.append(
            f"Non-renewable energy usage: {metrics['sedg_e2_1_nonrenewable_fuel_wh']} Wh"
        )

    if metrics.get("sedg_e2_1_electricity_wh") is not None:
        claims.append(
            f"Grid electricity consumption: {metrics['sedg_e2_1_electricity_wh']} Wh"
        )

    # Governance policies
    if metrics.get("sedg_g2_1_code_of_conduct"):
        claims.append("Code of Conduct policy is in place")

    if metrics.get("sedg_g2_1_anti_corruption_policy"):
        claims.append("Anti-corruption policy is in place")

    # Safety
    if metrics.get("sedg_s4_1_fatalities") == 0:
        claims.append("Zero workplace fatalities reported")

    # ─────────────────────────────────────────────
    # 3. Supplier signals 
    # ─────────────────────────────────────────────
    for s in payload.get("suppliers", []):
        sid = s.get("supplier_id")
        # ONLY count claims from contracted suppliers
        if sid in contracted_ids:
            if s.get("cert_status") and s["cert_status"] != "none":
                claims.append(
                    f"Contracted Supplier {sid} ({s.get('name')}) certified as {s['cert_status']}"
                )

    return claims


def _extract_evidence(payload: dict) -> list:
    evidence = []
    contracted_ids = {c["supplier_id"] for c in payload.get("contracts", [])}
    sme_name = payload.get("sme", {}).get("name", "")

    # ─────────────────────────────────────────────
    # 1. NEWS EVIDENCE (external signals)
    # ─────────────────────────────────────────────
    for item in payload.get("news", []):
        entity = item.get("entity", "")
        # Only include if it affects the SME directly or a contracted supplier
        if entity == "SME" or entity == sme_name or entity in contracted_ids:
            evidence.append({
                "source": item.get("source", "news"),
                "headline": item.get("headline") or item.get("event"),
                "entity": entity,
                "severity": item.get("severity", 0),
            })

    # ─────────────────────────────────────────────
    # 2. SUPPLIER RISK EVIDENCE
    # ─────────────────────────────────────────────
    for s in payload.get("suppliers", []):
        sid = s.get("supplier_id")
        if sid not in contracted_ids:
            continue # Ignore available but non-contracted suppliers

        # ── violations ──
        violation_count = s.get("violation_count", 0)
        if violation_count > 0:
            evidence.append({
                "source": "supplier_registry",
                "headline": f"Contracted Supplier {sid} has {violation_count} violations",
                "entity": s.get("name"),
                "severity": violation_count * 3,
            })

        # ── negative sentiment ──
        sentiment = s.get("news_sentiment")
        if sentiment is not None and sentiment < 0:
            evidence.append({
                "source": "news_sentiment",
                "headline": (
                    f"Supplier {sid} has negative news sentiment "
                    f"score: {sentiment}"
                ),
                "entity": s.get("name"),
                "severity": round(abs(sentiment) * 10),
            })

        # ── certification issues ──
        cert_status = str(s.get("cert_status", "")).upper()
        if cert_status and cert_status in ["NONE"]:
            evidence.append({
                "source": "cert_registry",
                "headline": (
                    f"Supplier {sid} certification status: {s.get('cert_status')}"
                ),
                "entity": s.get("name"),
                "severity": 5,
            })

    # ─────────────────────────────────────────────
    # 3. ESG REPORT RISK EVIDENCE
    # ─────────────────────────────────────────────
    report = payload.get("esg_report")

    if report:
        report_id = report.get("report_id", "unknown")

        # verification risk
        if not report.get("verified", False):
            evidence.append({
                "source": "esg_reports",
                "headline": f"ESG report {report_id} is NOT third-party verified",
                "entity": report.get("sme_id", ""),
                "severity": 6,
            })

    return evidence