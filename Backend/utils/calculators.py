"""
calculators.py
==============
Converts raw SME inputs (what they know) into SEDG computed metrics.
Returns the dict for the swarm.

Emission factors:
  Diesel  : 2.66155 kgCO2e/litre
            (UK Department for Environment, Food & Rural Affairs (DEFRA) 2025)
  Petrol  : 2.33984 kgCO2e/litre
            (UK Department for Environment, Food & Rural Affairs (DEFRA) 2025)
  Grid    : 0.5465  kgCO2e/kWh
            (Malaysia TNB 2023)

Energy conversion:
  Diesel  : 10.9 kWh/litre (UK Government GHG Conversion Factors for Company Reporting)
  Petrol  : 9.6  kWh/litre (UK Government GHG Conversion Factors for Company Reporting)

SEDG Unit Alignment:
  E1 Emissions : metric tonnes CO2 equivalent (tCO2e)  → SEDG-E1.1, E1.2
  E2 Energy    : watthours (Wh)                        → SEDG-E2.1
  E3 Water     : litres                                → SEDG-E3.1
  E4 Waste     : metric tonnes (mt)                    → SEDG-E4.1
  E5 Materials : listed by weight (metric tonnes)      → SEDG-E5.1
"""

from utils.supabase_client import supabase

# ─────────────────────────────────────────────
# EMISSION & CONVERSION FACTORS
# ─────────────────────────────────────────────
DIESEL_CO2E_KG_PER_LITRE  = 2.66155   # kgCO2e per litre (DEFRA 2025)
PETROL_CO2E_KG_PER_LITRE  = 2.33984   # kgCO2e per litre (DEFRA 2025)
GRID_CO2E_KG_PER_KWH      = 0.5465    # kgCO2e per kWh   (Malaysia TNB 2023)

DIESEL_KWH_PER_LITRE      = 10.9      # kWh per litre
PETROL_KWH_PER_LITRE      = 9.6       # kWh per litre

KG_TO_MT                  = 0.001     # kg → metric tonnes
M3_TO_LITRES              = 1000      # m³ → litres
KWH_TO_WH                 = 1000      # kWh → Wh (SEDG E2 requires watthours)


# ─────────────────────────────────────────────
# MAIN CALCULATOR
# ─────────────────────────────────────────────
def calculate_metrics(inputs: dict) -> dict:
    """
    Convert raw sme_inputs dict → SEDG esg_metrics dict.
    All output units are aligned to SEDG Version 2 template requirements.
    Returns the computed metrics dict.
    """

    # ── E1: GHG Emissions (SEDG-E1.1, E1.2) ──────────────────────────────────
    # Unit: metric tonnes CO2 equivalent (tCO2e)
    # Scope 1 = direct emissions from diesel & petrol combustion
    scope1_kg     = (
        inputs.get("diesel_litres", 0) * DIESEL_CO2E_KG_PER_LITRE +
        inputs.get("petrol_litres", 0) * PETROL_CO2E_KG_PER_LITRE
    )
    scope1_tco2e  = round(scope1_kg * KG_TO_MT, 3)

    # Scope 2 = indirect emissions from purchased electricity
    scope2_kg     = inputs.get("electricity_kwh", 0) * GRID_CO2E_KG_PER_KWH
    scope2_tco2e  = round(scope2_kg * KG_TO_MT, 3)

    # ── E2: Energy Consumption (SEDG-E2.1) ───────────────────────────────────
    # Unit: watthours (Wh) — SEDG template requires joules or watthours
    # Inputs are collected in kWh, converted to Wh for SEDG compliance
    # Non-renewable: fuel combustion from diesel & petrol
    nonrenewable_wh = (
        inputs.get("diesel_litres", 0) * DIESEL_KWH_PER_LITRE +
        inputs.get("petrol_litres", 0) * PETROL_KWH_PER_LITRE
    ) * KWH_TO_WH
    # Renewable: self-generated solar energy
    renewable_wh    = inputs.get("solar_kwh", 0) * KWH_TO_WH
    # Electricity: purchased from grid
    electricity_wh  = inputs.get("electricity_kwh", 0) * KWH_TO_WH

    # ── E3: Water Withdrawal (SEDG-E3.1) ─────────────────────────────────────
    # Unit: litres
    # Input collected in m³, converted to litres for SEDG compliance
    purchased_water_litres = inputs.get("water_m3", 0) * M3_TO_LITRES

    # ── E4: Waste (SEDG-E4.1) ────────────────────────────────────────────────
    # Unit: metric tonnes (mt)
    # Input collected in kg, converted to metric tonnes for SEDG compliance
    waste_generated_mt = round(inputs.get("waste_total_kg",    0) * KG_TO_MT, 3)
    waste_diverted_mt  = round(inputs.get("waste_recycled_kg", 0) * KG_TO_MT, 3)
    waste_directed_mt  = round(waste_generated_mt - waste_diverted_mt, 3)

    # ── S2: Training (SEDG-S2.1) ─────────────────────────────────────────────
    # Unit: hours per employee
    employee_count = inputs.get("male_employees", 0) + inputs.get("female_employees", 0)
    total_training = inputs.get("training_hours_total", 0)
    avg_training_hrs = round(total_training / employee_count, 1)

    # ── S3: Gender & Age Diversity (SEDG-S3.1) ───────────────────────────────
    # Unit: percentage (%)
    male   = inputs.get("male_employees",   0)
    female = inputs.get("female_employees", 0)
    gender_total = male + female or 1
    male_pct     = round(male   / gender_total * 100, 1)
    female_pct   = round(female / gender_total * 100, 1)

    # Age bands as per SEDG: under 30 / 30–50 / over 50
    age_u30  = inputs.get("age_under30", 0)
    age_3050 = inputs.get("age_30to50",  0)
    age_o50  = inputs.get("age_over50",  0)
    age_total    = age_u30 + age_3050 + age_o50 or 1
    age_u30_pct  = round(age_u30  / age_total * 100, 1)
    age_3050_pct = round(age_3050 / age_total * 100, 1)
    age_o50_pct  = round(age_o50  / age_total * 100, 1)

    # ── Build metrics dict ────────────────────────────────────────────────────
    metrics = {
        "report_id": inputs.get("report_id"),

        # ── ENVIRONMENTAL PILLAR ──────────────────────────────────────────────

        # E1: GHG Emissions — unit: tCO2e (SEDG-E1.1, E1.2)
        "sedg_e1_1_scope1_ghg_tco2e":           scope1_tco2e,
        "sedg_e1_2_scope2_ghg_tco2e":           scope2_tco2e,

        # E2: Energy Consumption — unit: Wh (SEDG-E2.1)
        # Converted from kWh input → Wh to match SEDG template (joules or watthours)
        "sedg_e2_1_renewable_fuel_wh":          renewable_wh,
        "sedg_e2_1_nonrenewable_fuel_wh":       nonrenewable_wh,
        "sedg_e2_1_electricity_wh":             electricity_wh,

        # E3: Water Withdrawal — unit: litres (SEDG-E3.1)
        "sedg_e3_1_purchased_water_litres":     purchased_water_litres,
        "sedg_e3_1_surface_water_litres":       0,   # not collected; disclose as 0
        "sedg_e3_1_groundwater_litres":         0,   # not collected; disclose as 0

        # E4: Waste — unit: metric tonnes (SEDG-E4.1)
        "sedg_e4_1_waste_generated_mt":         waste_generated_mt,
        "sedg_e4_1_waste_diverted_mt":          waste_diverted_mt,
        "sedg_e4_1_waste_directed_mt":          waste_directed_mt,

        # E5: Materials — qualitative list (SEDG-E5.1)
        "sedg_e5_1_materials_used":             inputs.get("materials_used"),

        # ── SOCIAL PILLAR ─────────────────────────────────────────────────────

        # S1: Human Rights & Labour (SEDG-S1.1)
        "sedg_s1_1_child_labour_count":         inputs.get("child_labour_count",  0),
        "sedg_s1_1_child_labour_nature":        inputs.get("child_labour_nature"),
        "sedg_s1_1_forced_labour_count":        inputs.get("forced_labour_count", 0),
        "sedg_s1_1_forced_labour_nature":       inputs.get("forced_labour_nature"),

        # S2: Employee Management — unit: hours/employee & % (SEDG-S2.1, S2.3)
        "sedg_s2_1_avg_training_hrs":           avg_training_hrs,
        "sedg_s2_3_min_wage_compliant_pct":     inputs.get("min_wage_compliant_pct", 0),

        # S3: Diversity, Equity & Inclusion — unit: % (SEDG-S3.1)
        "sedg_s3_1_male_pct":                   male_pct,
        "sedg_s3_1_female_pct":                 female_pct,
        "sedg_s3_1_age_under30_pct":            age_u30_pct,
        "sedg_s3_1_age_30to50_pct":             age_3050_pct,
        "sedg_s3_1_age_over50_pct":             age_o50_pct,

        # S4: Occupational Health & Safety — unit: count (SEDG-S4.1)
        "sedg_s4_1_fatalities":                 inputs.get("fatalities", 0),
        "sedg_s4_1_injuries":                   inputs.get("injuries",   0),

        # S5: Community Engagement — unit: MYR (SEDG-S5.1)
        "sedg_s5_1_community_investment_myr":   inputs.get("community_investment_myr", 0),

        # ── GOVERNANCE PILLAR ─────────────────────────────────────────────────

        # G1: Governance Structure — unit: count (SEDG-G1.1)
        "sedg_g1_1_director_count":             inputs.get("director_count", 0),

        # G2: Policy Commitments — unit: boolean (SEDG-G2.1)
        "sedg_g2_1_code_of_conduct":            inputs.get("code_of_conduct",        False),
        "sedg_g2_1_anti_corruption_policy":     inputs.get("anti_corruption_policy", False),
        "sedg_g2_1_whistleblowing_policy":      inputs.get("whistleblowing_policy",  False),
        "sedg_g2_1_health_safety_policy":       inputs.get("health_safety_policy",   False),

        # G3: Risk Management & Reporting — unit: year (SEDG-G3.1)
        "sedg_g3_1_last_audit_year":            inputs.get("last_audit_year"),

        # G4: Anti-Corruption — unit: count & description (SEDG-G4.1)
        "sedg_g4_1_corruption_incidents":       inputs.get("corruption_incidents", 0),
        "sedg_g4_1_corruption_nature":          inputs.get("corruption_nature"),
    }

    return metrics


# ─────────────────────────────────────────────
# FETCH + CALCULATE (called by ingestion)
# ─────────────────────────────────────────────
def get_computed_metrics(sme_id: str) -> dict:
    """
    Fetch the latest sme_inputs row for the given sme_id,
    run calculate_metrics(), and return the result.
    """
    response = (
        supabase.table("sme_inputs")
        .select("*")
        .eq("sme_id", sme_id)
        .order("fy_year", desc=True)
        .limit(1)
        .execute()
    )

    if not response.data:
        print(f"⚠️  No sme_inputs found for sme_id: {sme_id}")
        return {}

    inputs = response.data[0]
    return calculate_metrics(inputs)