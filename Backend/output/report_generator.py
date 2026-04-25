"""
sedg_pdf_generator.py  (v5 — disclosure tables only, layout fixed)
====================================================================
Layout:
  Page 1  — Cover block (report title + declaration) + General Information
  Page 2+ — Environmental / Social / Governance disclosure tables

Fixes applied vs v4:
  - Removed duplicate title block inside _build_sedg_disclosures
  - Cover block + General Information on page 1 via KeepTogether
  - Section banners kept together with their first table (no orphan headers)
  - topMargin increased to 28 mm to clear the 16 mm green header bar
  - Header text drawn at 6 mm from top edge — well inside the bar
"""

from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)


# ─────────────────────────────────────────────
# COLOUR PALETTE
# ─────────────────────────────────────────────
SC_GREEN   = colors.HexColor("#1a5d1a")
GREY_LIGHT = colors.HexColor("#f5f5f5")
GREY_MID   = colors.HexColor("#e0e0e0")
GREY_DARK  = colors.HexColor("#616161")
WHITE      = colors.white
BLACK      = colors.black


# ─────────────────────────────────────────────
# VALUE FORMATTERS
# ─────────────────────────────────────────────
def _val(d, key, default="Not disclosed", unit=""):
    v = d.get(key)
    if v is None or v == "" or v == []:
        return default
    if isinstance(v, bool):
        return "Yes" if v else "No"
    if unit:
        return f"{v:,} {unit}" if isinstance(v, (int, float)) else f"{v} {unit}"
    if isinstance(v, float):
        return f"{v:,.3f}"
    if isinstance(v, int):
        return f"{v:,}"
    return str(v)

def _pct(d, key):
    v = d.get(key)
    if v is None:
        return "Not disclosed"
    return f"{float(v):.1f}%"

def _bool(d, key):
    return "Yes" if d.get(key) else "No"

def _rm(value, default="N/A"):
    if value is None:
        return default
    try:
        return f"RM {float(value):,.2f}"
    except (TypeError, ValueError):
        return str(value)


# ─────────────────────────────────────────────
# STYLE REGISTRY
# ─────────────────────────────────────────────
def _build_styles():
    return {
        "report_title": ParagraphStyle(
            "report_title", fontSize=18, fontName="Helvetica-Bold",
            textColor=SC_GREEN, spaceAfter=20, spaceBefore=0,
            alignment=TA_LEFT),
        "report_subtitle": ParagraphStyle(
            "report_subtitle", fontSize=8.5, fontName="Helvetica",
            textColor=GREY_DARK, spaceAfter=4, leading=13),
        "section_header": ParagraphStyle(
            "section_header", fontSize=10, fontName="Helvetica-Bold",
            textColor=WHITE, spaceAfter=0, spaceBefore=0, leftIndent=6),
        "pillar_header": ParagraphStyle(
            "pillar_header", fontSize=10, fontName="Helvetica-Bold",
            textColor=SC_GREEN, spaceBefore=8, spaceAfter=3),
        "indicator_label": ParagraphStyle(
            "indicator_label", fontSize=8.5, fontName="Helvetica-Bold",
            textColor=BLACK, spaceAfter=1),
        "cell_normal": ParagraphStyle(
            "cell_normal", fontSize=8.5, fontName="Helvetica",
            textColor=BLACK, leading=12),
        "cell_bold": ParagraphStyle(
            "cell_bold", fontSize=8.5, fontName="Helvetica-Bold",
            textColor=BLACK),
        "declaration": ParagraphStyle(
            "declaration", fontSize=8.5, fontName="Helvetica-Oblique",
            textColor=GREY_DARK, spaceAfter=4, leading=13),
        "footer": ParagraphStyle(
            "footer", fontSize=7.5, fontName="Helvetica",
            textColor=GREY_DARK, alignment=TA_CENTER),
    }


# ─────────────────────────────────────────────
# SHARED TABLE BUILDERS
# ─────────────────────────────────────────────
def _section_banner(text, styles):
    t = Table([[Paragraph(text, styles["section_header"])]], colWidths=[180 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), SC_GREEN),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    return t

def _info_table(rows, styles, col_widths=None):
    if col_widths is None:
        col_widths = [70 * mm, 100 * mm]
    data = [
        [Paragraph(str(k), styles["cell_bold"]),
         Paragraph(str(v), styles["cell_normal"])]
        for k, v in rows
    ]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("GRID",           (0, 0), (-1, -1), 0.4, GREY_MID),
        ("VALIGN",         (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",    (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 6),
        ("TOPPADDING",     (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, GREY_LIGHT]),
    ]))
    return t


# ─────────────────────────────────────────────
# PAGE TEMPLATE  (header bar + footer)
# ─────────────────────────────────────────────
def _on_page(canvas, doc, sme_name, today):
    canvas.saveState()
    w, h = A4

    # Top green bar — 16 mm tall
    canvas.setFillColor(SC_GREEN)
    canvas.rect(0, h - 16 * mm, w, 16 * mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 9)
    # Draw text 10 mm from top edge = 6 mm inside the 16 mm bar
    canvas.drawString(15 * mm, h - 10 * mm, "SEDG Basic Disclosure Report")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w - 15 * mm, h - 10 * mm, sme_name)

    # Bottom footer bar
    canvas.setFillColor(GREY_LIGHT)
    canvas.rect(0, 0, w, 10 * mm, fill=1, stroke=0)
    canvas.setFillColor(GREY_DARK)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(15 * mm, 3.5 * mm,
        "SEDG v2  |  CMM / Securities Commission Malaysia  |  Disclosure Level: BASIC")
    canvas.drawRightString(w - 15 * mm, 3.5 * mm,
                           f"Page {doc.page}  |  {today}")
    canvas.restoreState()


# ─────────────────────────────────────────────
# COVER BLOCK
# Single KeepTogether so the title never lands
# at the very bottom of a page.
# ─────────────────────────────────────────────
def _cover_block(name, today, fy, styles):
    return KeepTogether([
        Paragraph(f"ESG Disclosure Report — {name}", styles["report_title"]),
        Paragraph(
            "Simplified ESG Disclosure Guide (SEDG) for SMEs in Supply Chains — Version 2<br/>"
            "Framework: Capital Markets Malaysia (CMM) / Securities Commission Malaysia (SC)<br/>"
            f"Disclosure Level: <b>BASIC</b>  |  Generated: {today}",
            styles["report_subtitle"]
        ),
        HRFlowable(width="100%", thickness=2, color=SC_GREEN, spaceAfter=5),
        Paragraph(
            "This data report represents our company's disclosures as guided by the "
            "Simplified ESG Disclosure Guide (SEDG). It contains information that is "
            "true to the best of our knowledge at the time of publication.",
            styles["declaration"]
        ),
        Spacer(1, 4 * mm),
    ])


# ─────────────────────────────────────────────
# SEDG DISCLOSURE TABLES  (E / S / G)
# Does NOT include the cover or General Info —
# those live on page 1 in generate_sedg_pdf.
# ─────────────────────────────────────────────
def _build_sedg_disclosures(sme, styles, fy, today):
    story = []
    P = Paragraph

    # ── Derived metrics ───────────────────────────────────────────────
    scope1    = sme.get("sedg_e1_1_scope1_ghg_tco2e") or 0
    scope2    = sme.get("sedg_e1_2_scope2_ghg_tco2e") or 0
    total_ghg = scope1 + scope2

    renew    = sme.get("sedg_e2_1_renewable_fuel_wh",    0) or 0
    nonrenew = sme.get("sedg_e2_1_nonrenewable_fuel_wh", 0) or 0
    elec     = sme.get("sedg_e2_1_electricity_wh",       0) or 0
    total_energy = renew + nonrenew + elec
    renew_pct    = round(renew / total_energy * 100, 1) if total_energy else 0

    purchased_water = sme.get("sedg_e3_1_purchased_water_litres") or 0

    wgen = sme.get("sedg_e4_1_waste_generated_mt") or 0
    wdiv = sme.get("sedg_e4_1_waste_diverted_mt")  or 0
    wdir = sme.get("sedg_e4_1_waste_directed_mt")  or 0
    recycle_pct = round(wdiv / wgen * 100, 1) if wgen else 0

    policies = []
    if sme.get("sedg_g2_1_code_of_conduct"):        policies.append("Code of Conduct")
    if sme.get("sedg_g2_1_anti_corruption_policy"): policies.append("Anti-Corruption Policy")
    if sme.get("sedg_g2_1_whistleblowing_policy"):  policies.append("Whistleblowing Policy")
    if sme.get("sedg_g2_1_health_safety_policy"):   policies.append("Health and Safety Policy")
    policies_str = ", ".join(policies) if policies else "Not disclosed"

    name = sme.get("name", "Unknown SME")

    # ══════════════════════════════════════════
    # ENVIRONMENTAL  — force onto page 2
    # ══════════════════════════════════════════
    story.append(PageBreak())

    story.append(KeepTogether([
        _section_banner("  ENVIRONMENTAL DISCLOSURES  |  Level: Basic", styles),
        Spacer(1, 3 * mm),
        P("SEDG-E1 : EMISSIONS", styles["pillar_header"]),
        P("E1.1  Total Scope 1 (direct) GHG emissions", styles["indicator_label"]),
        _info_table([
            ("Indicator Code",       "SEDG-E1.1"),
            ("Disclosure Level",     "Basic"),
            ("Unit",                 "Metric tonnes CO2e"),
            ("Scope 1 GHG emissions",
             f"{scope1:,.3f} tCO2e" if scope1 else "Not disclosed"),
            ("Source / Activity",    "Fleet diesel combustion (mobile sources)"),
            ("Methodology",
             "GHG Protocol Corporate Standard; Malaysia Ministry of NRECC emission factors"),
            ("Reporting Boundary",   "Operational control approach"),
        ], styles),
    ]))
    story.append(Spacer(1, 3 * mm))

    story.append(KeepTogether([
        P("E1.2  Total Scope 2 (indirect) GHG emissions", styles["indicator_label"]),
        _info_table([
            ("Indicator Code",       "SEDG-E1.2"),
            ("Disclosure Level",     "Basic"),
            ("Unit",                 "Metric tonnes CO2e"),
            ("Scope 2 GHG emissions",
             f"{scope2:,.3f} tCO2e" if scope2 else "Not disclosed"),
            ("Source",               "Purchased electricity (Tenaga Nasional Berhad)"),
            ("Grid emission factor", "0.690 kgCO2e/kWh (Malaysia, 2023)"),
            ("Method",               "Location-based"),
            ("Total Scope 1 + 2",    f"{total_ghg:,.3f} tCO2e"),
        ], styles),
    ]))
    story.append(Spacer(1, 4 * mm))

    story.append(KeepTogether([
        P("SEDG-E2 : ENERGY", styles["pillar_header"]),
        P("E2.1  Energy consumption (in watt-hours)", styles["indicator_label"]),
        _info_table([
            ("Indicator Code",             "SEDG-E2.1"),
            ("Disclosure Level",           "Basic"),
            ("Unit",                       "Watt-hours (Wh)"),
            ("Renewable fuel sources",      f"{renew:,.0f} Wh"),
            ("Non-renewable fuel sources",  f"{nonrenew:,.0f} Wh  (diesel — fleet vehicles)"),
            ("Purchased electricity",       f"{elec:,.0f} Wh"),
            ("Heating / Cooling / Steam",   "Not applicable"),
            ("TOTAL Energy Consumption",    f"{total_energy:,.0f} Wh"),
            ("Renewable energy share",      f"{renew_pct:.1f}% of total energy"),
            ("Methodology",                 "Meter readings + fuel receipts (GRI 302-1 aligned)"),
        ], styles),
    ]))
    story.append(Spacer(1, 4 * mm))

    story.append(KeepTogether([
        P("SEDG-E3 : WATER", styles["pillar_header"]),
        P("E3.1  Total water withdrawn (in litres)", styles["indicator_label"]),
        _info_table([
            ("Indicator Code",              "SEDG-E3.1"),
            ("Disclosure Level",            "Basic"),
            ("Unit",                        "Litres"),
            ("Purchased / municipal water", f"{purchased_water:,.0f} litres"),
            ("Surface water",               "Not applicable"),
            ("Groundwater",                 "Not applicable"),
            ("Seawater / Produced water",   "Not applicable"),
            ("TOTAL Water Withdrawn",       f"{purchased_water:,.0f} litres"),
            ("Methodology",                 "Utility bills (water meter readings)"),
        ], styles),
    ]))
    story.append(Spacer(1, 4 * mm))

    story.append(KeepTogether([
        P("SEDG-E4 : WASTE", styles["pillar_header"]),
        P("E4.1  Total waste generated (in metric tonnes)", styles["indicator_label"]),
        _info_table([
            ("Indicator Code",             "SEDG-E4.1"),
            ("Disclosure Level",           "Basic"),
            ("Unit",                       "Metric tonnes (mt)"),
            ("Waste generated",             f"{wgen:,.3f} mt"),
            ("Diverted from disposal",
             f"{wdiv:,.3f} mt  (recycling: paper, cardboard, plastic)"),
            ("Directed to disposal",
             f"{wdir:,.3f} mt  (landfill via licensed contractor)"),
            ("Recycling / diversion rate",  f"{recycle_pct:.1f}% of generated"),
            ("Methodology",                 "Waste contractor manifests + internal tracking"),
        ], styles),
    ]))
    story.append(Spacer(1, 4 * mm))

    story.append(KeepTogether([
        P("SEDG-E5 : MATERIALS", styles["pillar_header"]),
        P("E5.1  Materials used to produce and package primary products / services",
          styles["indicator_label"]),
        _info_table([
            ("Indicator Code",   "SEDG-E5.1"),
            ("Disclosure Level", "Basic"),
            ("Materials used",    sme.get("sedg_e5_1_materials_used") or "Not disclosed"),
        ], styles),
    ]))
    story.append(Spacer(1, 6 * mm))

    # ══════════════════════════════════════════
    # SOCIAL
    # ══════════════════════════════════════════
    story.append(KeepTogether([
        _section_banner("  SOCIAL DISCLOSURES  |  Level: Basic", styles),
        Spacer(1, 3 * mm),
        P("SEDG-S1 : HUMAN RIGHTS AND LABOUR PRACTICES", styles["pillar_header"]),
        P("S1.1  Child labour and forced labour incidents", styles["indicator_label"]),
        _info_table([
            ("Indicator Code",         "SEDG-S1.1"),
            ("Disclosure Level",       "Basic"),
            ("Child labour incidents",  _val(sme, "sedg_s1_1_child_labour_count")),
            ("Nature (child labour)",   sme.get("sedg_s1_1_child_labour_nature") or "Not applicable"),
            ("Forced labour incidents", _val(sme, "sedg_s1_1_forced_labour_count")),
            ("Nature (forced labour)",  sme.get("sedg_s1_1_forced_labour_nature") or "Not applicable"),
            ("Methodology",            "Internal HR audit; supplier contracts reviewed annually"),
        ], styles),
    ]))
    story.append(Spacer(1, 4 * mm))

    story.append(KeepTogether([
        P("SEDG-S2 : EMPLOYEE MANAGEMENT", styles["pillar_header"]),
        P("S2.1  Average hours of training per employee", styles["indicator_label"]),
        _info_table([
            ("Indicator Code",                   "SEDG-S2.1"),
            ("Disclosure Level",                 "Basic"),
            ("Average training hours / employee", _val(sme, "sedg_s2_1_avg_training_hrs", unit="hours")),
            ("Total employees",                   _val(sme, "employee_count")),
            ("Methodology",
             "Total training hrs ÷ total employees (GRI 404-1 aligned)"),
        ], styles),
        Spacer(1, 3 * mm),
        P("S2.3  Percentage of employees at or above minimum wage",
          styles["indicator_label"]),
        _info_table([
            ("Indicator Code",                     "SEDG-S2.3"),
            ("Disclosure Level",                   "Basic"),
            ("Applicable minimum wage (2024)",      "RM 1,500 / month (Peninsular Malaysia)"),
            ("Employees at or above minimum wage",  _pct(sme, "sedg_s2_3_min_wage_compliant_pct")),
            ("Methodology",                        "Payroll system audit — all permanent employees"),
        ], styles),
    ]))
    story.append(Spacer(1, 4 * mm))

    story.append(KeepTogether([
        P("SEDG-S3 : DIVERSITY, EQUITY AND INCLUSION", styles["pillar_header"]),
        P("S3.1  Percentage of employees by gender and age group",
          styles["indicator_label"]),
        _info_table([
            ("Indicator Code",   "SEDG-S3.1"),
            ("Disclosure Level", "Basic"),
            ("Male employees",   _pct(sme, "sedg_s3_1_male_pct")),
            ("Female employees", _pct(sme, "sedg_s3_1_female_pct")),
            ("Age: Under 30",    _pct(sme, "sedg_s3_1_age_under30_pct")),
            ("Age: 30 – 50",     _pct(sme, "sedg_s3_1_age_30to50_pct")),
            ("Age: Over 50",     _pct(sme, "sedg_s3_1_age_over50_pct")),
            ("Methodology",     "HR headcount records as at 31 December"),
        ], styles),
    ]))
    story.append(Spacer(1, 4 * mm))

    story.append(KeepTogether([
        P("SEDG-S4 : OCCUPATIONAL HEALTH AND SAFETY", styles["pillar_header"]),
        P("S4.1  Fatalities and recordable injuries", styles["indicator_label"]),
        _info_table([
            ("Indicator Code",               "SEDG-S4.1"),
            ("Disclosure Level",             "Basic"),
            ("Number of fatalities",          _val(sme, "sedg_s4_1_fatalities")),
            ("Number of recordable injuries", _val(sme, "sedg_s4_1_injuries")),
            ("Methodology",
             "DOSH reporting (Jabatan Keselamatan dan Kesihatan Pekerjaan); incident register"),
        ], styles),
    ]))
    story.append(Spacer(1, 4 * mm))

    story.append(KeepTogether([
        P("SEDG-S5 : COMMUNITY ENGAGEMENT", styles["pillar_header"]),
        P("S5.1  Total community investments and donations", styles["indicator_label"]),
        _info_table([
            ("Indicator Code",         "SEDG-S5.1"),
            ("Disclosure Level",       "Basic"),
            ("Total community investment",
             f"RM {sme.get('sedg_s5_1_community_investment_myr', 0) or 0:,.2f}"),
            ("Nature of investment",    sme.get("sedg_s5_1_community_nature") or
             "Charitable donations; local sponsorships"),
            ("Methodology",            "Finance records — payment vouchers and receipts"),
        ], styles),
    ]))
    story.append(Spacer(1, 6 * mm))

    # ══════════════════════════════════════════
    # GOVERNANCE
    # ══════════════════════════════════════════
    story.append(KeepTogether([
        _section_banner("  GOVERNANCE DISCLOSURES  |  Level: Basic", styles),
        Spacer(1, 3 * mm),
        P("SEDG-G1 : GOVERNANCE STRUCTURE", styles["pillar_header"]),
        P("G1.1  Number of directors", styles["indicator_label"]),
        _info_table([
            ("Indicator Code",     "SEDG-G1.1"),
            ("Disclosure Level",   "Basic"),
            ("Number of directors", _val(sme, "sedg_g1_1_director_count")),
            ("Board independence",  sme.get("sedg_g1_1_board_independence", "Not disclosed")),
            ("Methodology",        "SSM company records; board resolution register"),
        ], styles),
    ]))
    story.append(Spacer(1, 4 * mm))

    story.append(KeepTogether([
        P("SEDG-G2 : POLICY COMMITMENTS", styles["pillar_header"]),
        P("G2.1  Corporate policies in place", styles["indicator_label"]),
        _info_table([
            ("Indicator Code",          "SEDG-G2.1"),
            ("Disclosure Level",        "Basic"),
            ("Code of Conduct",          _bool(sme, "sedg_g2_1_code_of_conduct")),
            ("Anti-Corruption Policy",   _bool(sme, "sedg_g2_1_anti_corruption_policy")),
            ("Whistleblowing Policy",    _bool(sme, "sedg_g2_1_whistleblowing_policy")),
            ("Health and Safety Policy", _bool(sme, "sedg_g2_1_health_safety_policy")),
            ("Policies in force",        policies_str),
            ("Methodology",
             "Management self-declaration; document register reviewed annually"),
        ], styles),
    ]))
    story.append(Spacer(1, 4 * mm))

    story.append(KeepTogether([
        P("SEDG-G3 : RISK MANAGEMENT AND REPORTING", styles["pillar_header"]),
        P("G3.1  Year of last submitted audited financial report",
          styles["indicator_label"]),
        _info_table([
            ("Indicator Code",               "SEDG-G3.1"),
            ("Disclosure Level",             "Basic"),
            ("Last audited financial report", f"FY {_val(sme, 'sedg_g3_1_last_audit_year')}"),
            ("Filing body",                  "SSM (Suruhanjaya Syarikat Malaysia)"),
            ("External auditor engaged",     _bool(sme, "sedg_g3_1_external_auditor")),
        ], styles),
    ]))
    story.append(Spacer(1, 4 * mm))

    story.append(KeepTogether([
        P("SEDG-G4 : ANTI-CORRUPTION", styles["pillar_header"]),
        P("G4.1  Confirmed incidents of corruption", styles["indicator_label"]),
        _info_table([
            ("Indicator Code",     "SEDG-G4.1"),
            ("Disclosure Level",   "Basic"),
            ("Confirmed incidents", _val(sme, "sedg_g4_1_corruption_incidents")),
            ("Nature of incidents", sme.get("sedg_g4_1_corruption_nature") or "Not applicable"),
            ("Actions taken",       sme.get("sedg_g4_1_actions_taken") or
             "N/A — no incidents reported"),
            ("Methodology",        "Internal audit; MACC reporting obligations"),
        ], styles),
    ]))
    story.append(Spacer(1, 8 * mm))

    # ── Declaration ───────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=SC_GREEN, spaceAfter=6))
    story.append(KeepTogether([
        P("DECLARATION", styles["pillar_header"]),
        P(
            f"This report represents the Basic-level disclosures of <b>{name}</b> as guided by "
            "the Simplified ESG Disclosure Guide (SEDG) Version 2 for SMEs in Supply Chains, "
            "published by Capital Markets Malaysia (CMM), an affiliate of the Securities "
            "Commission Malaysia (SC). The data contained herein is accurate to the best of "
            "management's knowledge at the time of publication.",
            styles["declaration"]
        ),
        _info_table([
            ("Disclosure level",  "Basic"),
            ("Report prepared by","Management"),
            ("Date",              today),
            ("Next review",       str(date.today().year + 1)),
            ("SEDG Framework",    "Version 2 (CMM / SC Malaysia)"),
        ], styles, col_widths=[60 * mm, 110 * mm]),
    ]))

    return story


# ─────────────────────────────────────────────
# PRIMARY ENTRY POINT
# ─────────────────────────────────────────────
def generate_sedg_pdf(final_state: dict, sme_name: str = None,
                      output_path: str = None) -> str:
    sme     = final_state.get("graph_payload", {}).get("sme", {}) or {}
    metrics = final_state.get("graph_payload", {}).get("esg_metrics", {}) or {}
    sme_merged = {**sme, **metrics}

    name  = sme_name or sme.get("name", "Unknown SME")
    fy    = sme_merged.get("sedg_g3_1_last_audit_year", date.today().year)
    today = date.today().strftime("%d %B %Y")

    if output_path is None:
        output_path = f"SEDG_Report_{name.replace(' ', '_')}_FY{fy}.pdf"

    styles = _build_styles()
    story  = []

    # ── Page 1: cover block + General Information ─────────────────────
    story.append(_cover_block(name, today, fy, styles))
    story.append(KeepTogether([
        _section_banner("  GENERAL INFORMATION", styles),
        Spacer(1, 2 * mm),
        _info_table([
            ("Name of Organisation",     name),
            ("Date of Disclosure",       today),
            ("Disclosure Period",
             f"Financial Year {fy} (1 January {fy} – 31 December {fy})"),
            ("Sector",                   sme_merged.get("sector", "Unknown")),
            ("Number of Employees",      _val(sme_merged, "employee_count")),
            ("Annual Revenue",           _rm(sme_merged.get("revenue"))),
            ("Location of Headquarters", sme_merged.get("location", "Selangor, Malaysia")),
            ("Entities Included",        f"{name} (primary entity)"),
            ("Locations Included",       "Selangor, Malaysia"),
        ], styles),
    ]))

    # ── Pages 2+: E / S / G tables ───────────────────────────────────
    story.extend(_build_sedg_disclosures(sme_merged, styles, fy, today))

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=28 * mm,   # clears 16 mm green bar + 12 mm breathing room
        bottomMargin=18 * mm,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        title=f"SEDG Basic Disclosure — {name}",
        author="GreenTrust Pulse",
    )
    doc.build(
        story,
        onFirstPage=lambda c, d: _on_page(c, d, name, today),
        onLaterPages=lambda c, d: _on_page(c, d, name, today),
    )

    print(f"[SEDG] PDF generated: {output_path}")
    return output_path


# ─────────────────────────────────────────────
# LEGACY ENTRY POINT
# ─────────────────────────────────────────────
def generate_sedg_pdf_from_dict(sme: dict) -> str:
    minimal_state = {"graph_payload": {"sme": sme, "esg_metrics": sme}}
    return generate_sedg_pdf(minimal_state, sme_name=sme.get("name"))


# ─────────────────────────────────────────────
# QUICK TEST
# ─────────────────────────────────────────────
if __name__ == "__main__":
    mock_state = {
        "graph_payload": {
            "sme": {
                "name": "TriforceTech Logistic",
                "sector": "Logistics",
                "employee_count": 25,
                "revenue": 1_800_000,
            },
            "esg_metrics": {
                "sedg_e1_1_scope1_ghg_tco2e":         49.414,
                "sedg_e1_2_scope2_ghg_tco2e":         28.98,
                "sedg_e2_1_renewable_fuel_wh":         8_000,
                "sedg_e2_1_nonrenewable_fuel_wh":      201_695,
                "sedg_e2_1_electricity_wh":            42_000,
                "sedg_e3_1_purchased_water_litres":    180_000,
                "sedg_e4_1_waste_generated_mt":        3.2,
                "sedg_e4_1_waste_diverted_mt":         0.96,
                "sedg_e4_1_waste_directed_mt":         2.24,
                "sedg_e5_1_materials_used":            "Cardboard packaging, stretch wrap (plastic), diesel fuel",
                "sedg_s1_1_child_labour_count":        0,
                "sedg_s1_1_forced_labour_count":       0,
                "sedg_s2_1_avg_training_hrs":          6.0,
                "sedg_s2_3_min_wage_compliant_pct":    100.0,
                "sedg_s3_1_male_pct":                  76.0,
                "sedg_s3_1_female_pct":                24.0,
                "sedg_s3_1_age_under30_pct":           32.0,
                "sedg_s3_1_age_30to50_pct":            56.0,
                "sedg_s3_1_age_over50_pct":            12.0,
                "sedg_s4_1_fatalities":                0,
                "sedg_s4_1_injuries":                  1,
                "sedg_s5_1_community_investment_myr":  2_500.00,
                "sedg_g1_1_director_count":            2,
                "sedg_g2_1_code_of_conduct":           True,
                "sedg_g2_1_anti_corruption_policy":    True,
                "sedg_g2_1_whistleblowing_policy":     False,
                "sedg_g2_1_health_safety_policy":      True,
                "sedg_g3_1_last_audit_year":           2024,
                "sedg_g4_1_corruption_incidents":      0,
            }
        }
    }

    generate_sedg_pdf(mock_state, sme_name="TriforceTech Logistic",
                      output_path="/mnt/user-data/outputs/SEDG_TriforceTech_v5.pdf")