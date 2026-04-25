import os
import re
import json
import httpx
from dotenv import load_dotenv
from json_repair import repair_json

load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
# AI CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
CF_API_TOKEN  = os.getenv("CF_API_TOKEN")
CF_MODEL      = "@cf/meta/llama-3.1-8b-instruct"
ILMU_API_KEY  = os.getenv("ILMU_API_KEY")


# ─────────────────────────────────────────────────────────────────────────────
# AI CALLER
# ─────────────────────────────────────────────────────────────────────────────
# def call_ai(system_prompt: str, user_content: str) -> dict:
#     """Call AI and return parsed JSON dict."""
#     url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/{CF_MODEL}"

#     headers = {
#         "Authorization": f"Bearer {CF_API_TOKEN}",
#         "Content-Type": "application/json",
#     }

#     payload = {
#         "messages": [
#             {"role": "system", "content": system_prompt},
#             {"role": "user", "content": user_content},
#         ],
#         "stream": False,
#         "max_tokens": 1024,
#         "temperature": 0,
#     }

#     with httpx.Client(timeout=60) as client:
#         r = client.post(url, headers=headers, json=payload)
#         r.raise_for_status()
#         data = r.json()

#     raw_text = data["result"]["response"]
#     return parse_json_response(raw_text)


# ─────────────────────────────────────────────
# GLM  
# ─────────────────────────────────────────────
def call_ai(system_prompt: str, user_content: str) -> dict:
    """Call GLM AI and return parsed JSON dict."""

    url = "https://api.ilmu.ai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {ILMU_API_KEY}",  
        "Content-Type": "application/json",
    }

    payload = {
        "model": "ilmu-glm-5.1",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0,
    }

    with httpx.Client(timeout=60) as client:
        r = client.post(url, headers=headers, json=payload)

        print("DEBUG:", r.status_code, r.text)  

        r.raise_for_status()
        data = r.json()

    raw_text = data["choices"][0]["message"]["content"]
    return parse_json_response(raw_text)

# ─────────────────────────────────────────────────────────────────────────────
# JSON PARSER
# ─────────────────────────────────────────────────────────────────────────────
def parse_json_response(text):
    clean_text = re.sub(r"```json|```", "", text).strip()
    match = re.search(r"\{.*\}", clean_text, re.DOTALL)
    
    if not match:
        return {"error": "No JSON found"}

    content = match.group(0)
    
    # Pre-parse math cleaner: Replace "number + number" with the first number
    # This is a 'dirty' fix to prevent the BinOp crash
    content = re.sub(r"(\d+\.?\d*)\s*[\+\-\*/]\s*\d+\.?\d*", r"\1", content)

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Fallback: if it's still messy, return an error key
        return {"error": "Malformed JSON logic"}