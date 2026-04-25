from utils.supabase_client import supabase
from scraper import scrape_all_news
from utils.calculators import get_computed_metrics

def get_sme_profile(sme_id: str = None):
    query = supabase.table("sme_profile").select("*")
    if sme_id:
        query = query.eq("sme_id", sme_id)
    response = query.limit(1).execute()
    data = response.data
    print("DEBUG SME DATA:", data)
    if not data or len(data) == 0:
        raise Exception("SME profile returned empty from Supabase")
    return data[0]

def get_suppliers():
    return supabase.table("suppliers").select("*").execute().data

def get_contracts(sme_id):
    return supabase.table("sme_contracts").select("*").eq("sme_id", sme_id).execute().data

def get_loan_rates():
    data = supabase.table("loan_rates").select("*").execute().data
    for row in data:
        row["tier_name"] = row.pop("tier")
    return data

def get_regulations():
    return supabase.table("regulatory_rules").select("*").execute().data

def get_news(sme_name, contracted_supplier_names=None):
    return scrape_all_news(sme_name, contracted_supplier_names)

def get_esg_reports(sme_id):
    return supabase.table("esg_reports") \
        .select("*") \
        .eq("sme_id", sme_id) \
        .execute() \
        .data

def build_payload(sme_id: str = None):
    sme       = get_sme_profile(sme_id)
    metrics   = get_computed_metrics(sme["sme_id"]) if sme else None
    suppliers = get_suppliers()
    contracts = get_contracts(sme["sme_id"])

    print("DEBUG metrics:", metrics)

    # get contracted supplier names to pass to scraper
    contracted_ids = {c["supplier_id"] for c in contracts}
    contracted_supplier_names = [
        s["name"] for s in suppliers
        if s["supplier_id"] in contracted_ids
    ]

    return {
        "sme":         sme,
        "esg_metrics": metrics,
        "esg_reports": get_esg_reports(sme["sme_id"]),
        "suppliers":   suppliers,
        "contracts":   contracts,
        "loan_rates":  get_loan_rates(),
        "news":        get_news(sme["name"], contracted_supplier_names),
        "regulations": get_regulations()
    }