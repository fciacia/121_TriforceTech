from Backend.utils.supabase_client import supabase

def get_regulation_keywords_dynamic():
    """
    Build regulation keywords dynamically from Supabase regulatory_rules table
    instead of hardcoding them
    """
    rules = supabase.table("regulatory_rules").select("*").execute().data

    regulation_keywords = {}
    for rule in rules:
        rule_name = rule["rule_name"]
        # Auto-generate keywords from the rule name itself
        words = rule_name.lower().split()
        # Add both English and Malay variants
        keywords = words.copy()

        # Add full rule name as a keyword
        keywords.append(rule_name.lower())

        # Add Malay translations based on common words
        malay_map = {
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

        for word in words:
            if word in malay_map:
                keywords.extend(malay_map[word])

        regulation_keywords[rule_name] = list(set(keywords))
        print(f"✅ DYNAMIC RULE LOADED: {rule_name} → {keywords}")

    return regulation_keywords