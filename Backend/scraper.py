import requests
import xml.etree.ElementTree as ET
from utils.supabase_client import supabase

# =========================
# HEADERS
# =========================
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

MALAY_MAP = {
    "illegal":    ["haram", "menyalahi", "melanggar"],
    "chemical":   ["kimia", "bahan kimia"],
    "dumping":    ["buang", "pembuangan", "lambak"],
    "carbon":     ["karbon", "pelepasan"],
    "tax":        ["cukai", "cukai karbon"],
    "excessive":  ["berlebihan", "melampau"],
    "emission":   ["pelepasan", "emisi", "asap"],
    "water":      ["air", "sungai"],
    "pollution":  ["pencemaran", "cemar"],
    "violation":  ["pelanggaran", "melanggar", "saman"],
    "unreported": ["tidak dilaporkan", "tersembunyi", "sembunyikan"],
}

NEGATIVE_KEYWORDS = [
    "fine", "fined", "penalty", "violation", "illegal", "arrested",
    "investigated", "charged", "sued", "pollution", "damage", "destroy",
    "denda", "saman", "tangkap", "siasat", "cemar", "rosak", "salah",
    "melanggar", "didakwa", "disiasat", "dikompaun"
]

# =========================
# RSS FEED SOURCES
# =========================
RSS_SOURCES = {
    "Bernama":      "https://www.bernama.com/en/rssfeed.php",
    "Malay Mail":   "https://www.malaymail.com/feed/rss/malaysia",
    "FMT":          "https://www.freemalaysiatoday.com/feed",
    "Utusan":       "https://www.utusan.com.my/feed",
    "Malaysiakini": "https://www.malaysiakini.com/rss/en/news",
}

# =========================
# MOCK NEWS PER SME
# =========================
MOCK_NEWS_BY_SME = {
    "TriforceTech Logistic": {
        "entity":   "SUP_A",
        "event":    "Illegal Chemical Dumping investigation",
        "severity": 0.87,
        "source":   "mock"
    },
    "GreenBuild Materials": {
        "entity":   "SUP_E",
        "event":    "Excessive Carbon Emission violation detected at manufacturing plant",
        "severity": 0.85,
        "source":   "mock"
    },
    "CloudServe IT": {
        "entity":   "SUP_R",
        "event":    "Unreported Emissions from data centre cooling systems",
        "severity": 0.60,
        "source":   "mock"
    },
}

# =========================
# DYNAMIC REGULATION KEYWORDS
# =========================

def get_regulation_keywords_dynamic():
    print("\n📋 LOADING REGULATION RULES FROM SUPABASE...")
    print("-" * 50)

    rules = supabase.table("regulatory_rules").select("*").execute().data
    print(f"DEBUG RAW RULES FROM SUPABASE: {rules}")

    regulation_keywords = {}

    for rule in rules:
        rule_name   = rule["rule_name"]
        rule_id     = rule["rule_id"]
        esg_penalty = rule["esg_penalty"]

        words    = rule_name.lower().split()
        keywords = words.copy()
        keywords.append(rule_name.lower())

        for word in words:
            if word in MALAY_MAP:
                keywords.extend(MALAY_MAP[word])

        keywords = list(set(keywords))
        regulation_keywords[rule_name] = keywords

        print(f"✅ RULE LOADED: [{rule_id}] {rule_name} | penalty={esg_penalty}")
        print(f"   KEYWORDS: {keywords}")

    print(f"\n✅ TOTAL RULES LOADED: {len(regulation_keywords)}")
    print("-" * 50)
    return regulation_keywords


# =========================
# RSS PARSER
# =========================

def parse_rss(source_name, url):
    print(f"\n🌐 Fetching RSS: {source_name}...")
    headlines = []
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        print(f"   STATUS CODE: {response.status_code}")

        if response.status_code != 200:
            print(f"   ❌ Failed to fetch")
            return []

        root = ET.fromstring(response.content)

        items = root.findall(".//item")
        if not items:
            items = root.findall(".//{http://www.w3.org/2005/Atom}entry")

        for item in items:
            title = item.find("title")
            if title is None:
                title = item.find("{http://www.w3.org/2005/Atom}title")

            desc = item.find("description")
            if desc is None:
                desc = item.find("{http://www.w3.org/2005/Atom}summary")

            if title is not None and title.text:
                headlines.append(title.text.strip())
            if desc is not None and desc.text:
                headlines.append(desc.text.strip()[:200])

        print(f"   HEADLINES FOUND: {len(headlines)}")
        return headlines

    except ET.ParseError as e:
        print(f"   ❌ XML PARSE ERROR: {e}")
        return []
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        return []


# =========================
# MATCHING FUNCTIONS
# =========================

def matches_company(text, company_keywords):
    text_lower = text.lower().replace(" ", "")
    for kw in company_keywords:
        if kw.lower().replace(" ", "") in text_lower:
            return True
    return False


def matches_regulation(text, regulation_keywords):
    text_lower = text.lower()
    for rule_name, keywords in regulation_keywords.items():
        if any(kw in text_lower for kw in keywords):
            return rule_name
    return None


def is_negative(text):
    text_lower = text.lower()
    return any(kw in text_lower for kw in NEGATIVE_KEYWORDS)


def parse_to_structured(headlines, company_keywords, regulation_keywords):
    print(f"\n🔎 MATCHING {len(headlines)} headlines...")
    print(f"   COMPANY KEYWORDS: {company_keywords}")
    print("-" * 50)

    results = []
    company_count    = 0
    regulation_count = 0
    negative_count   = 0

    for headline in headlines:
        company_match    = matches_company(headline, company_keywords)
        regulation_match = matches_regulation(headline, regulation_keywords)
        negative_match   = is_negative(headline)

        if company_match:
            company_count += 1
            print(f"   🏢 COMPANY MATCH: {headline}")
        if regulation_match:
            regulation_count += 1
            print(f"   📋 REGULATION MATCH [{regulation_match}]: {headline}")
        if negative_match and not company_match:
            negative_count += 1

        if company_match and regulation_match and negative_match:
            results.append({
                "entity":   "SUP_A",
                "event":    regulation_match,
                "severity": 0.87,
                "source":   "rss_scrape",
                "headline": headline
            })
            print(f"   ✅ FULL MATCH: {headline}")

    print(f"\n📊 MATCH SUMMARY:")
    print(f"   Company matches:    {company_count}")
    print(f"   Regulation matches: {regulation_count}")
    print(f"   Negative only:      {negative_count}")
    print(f"   FULL MATCHES:       {len(results)}")
    print("-" * 50)

    return results


# =========================
# MOCK FALLBACK
# =========================

def get_mock_news(company_name):
    print("\n⚠️ NO REAL NEWS MATCHED — USING MOCK FALLBACK")
    mock = MOCK_NEWS_BY_SME.get(company_name)
    if mock:
        return [mock]
    # default fallback if company not in dict
    return [
        {
            "entity":   "SUP_A",
            "event":    "Illegal Chemical Dumping investigation",
            "severity": 0.87,
            "source":   "mock"
        }
    ]


# =========================
# MAIN FUNCTION
# =========================

def scrape_all_news(company_name, contracted_supplier_names=None):
    print(f"\n{'='*50}")
    print(f"🔍 RSS SCRAPER STARTED FOR: {company_name}")
    print(f"{'='*50}")

    regulation_keywords = get_regulation_keywords_dynamic()

    company_keywords = [
        company_name.lower(),
        company_name.lower().replace(" ", ""),
        company_name.lower().replace(" ", "-"),
    ]

    # add contracted supplier names to keywords
    if contracted_supplier_names:
        for name in contracted_supplier_names:
            company_keywords.append(name.lower())
            company_keywords.append(name.lower().replace(" ", ""))
            company_keywords.append(name.lower().replace(" ", "-"))

    print(f"\n🏢 COMPANY KEYWORDS GENERATED: {company_keywords}")

    all_headlines = []
    for source_name, url in RSS_SOURCES.items():
        all_headlines += parse_rss(source_name, url)

    before_dedup  = len(all_headlines)
    all_headlines = list(set(all_headlines))
    after_dedup   = len(all_headlines)

    print(f"\n📰 HEADLINES COLLECTED: {before_dedup}")
    print(f"📰 AFTER DEDUP:         {after_dedup}")

    structured = parse_to_structured(
        all_headlines,
        company_keywords,
        regulation_keywords
    )

    if not structured:
        return get_mock_news(company_name)  # ← pass company_name

    print(f"\n✅ RSS SCRAPER DONE — {len(structured)} news items returned")
    return structured