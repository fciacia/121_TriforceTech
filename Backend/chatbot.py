"""
ESG What-If Chatbot Backend — FastAPI + Socket.IO + SSE Streaming
AI provider: GLM (ilmu.ai)
"""

import os
import sys
import re
import json
import asyncio
import httpx
import socketio
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import AsyncGenerator, Optional

load_dotenv()

# Ensure Backend directory is on the path so swarm imports work
sys.path.insert(0, os.path.dirname(__file__))

app = FastAPI(title="ESG What-If Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# SOCKET.IO SERVER
# Wrap FastAPI with socketio so both HTTP routes
# and WebSocket connections share port 8000.
# Run with: uvicorn chatbot:socket_app --reload
# ─────────────────────────────────────────────
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


@sio.event
async def connect(sid, environ):
    print(f"[WS] Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"[WS] Client disconnected: {sid}")

# ─────────────────────────────────────────────
# CONFIG — GLM
# ─────────────────────────────────────────────
ILMU_API_KEY = os.getenv("ILMU_API_KEY")
ILMU_URL = "https://api.ilmu.ai/v1/chat/completions"

if not ILMU_API_KEY:
    print("WARNING: ILMU_API_KEY is missing!")

# ─────────────────────────────────────────────
# SYSTEM PROMPT
# ─────────────────────────────────────────────
WHATIF_SYSTEM_PROMPT = """You are an ESG What-If Impact Analyzer for SME green loan assessments.

Return ONLY valid JSON:
{
  "summary": "...",
  "esg_new": 0,
  "env_new": 0,
  "soc_new": 0,
  "gov_new": 0,
  "approval_new": 0,
  "esg_delta": 0,
  "primary_driver": "...",
  "risk": "low",
  "timeframe": "3-6 months",
  "financial_note": "...",
  "chips": ["...", "...", "..."]
}
"""


# ─────────────────────────────────────────────
# REQUEST MODEL
# ─────────────────────────────────────────────
class WhatIfRequest(BaseModel):
    question: str
    current_scores: dict
    company_context: dict = {}


# ─────────────────────────────────────────────
# GLM CALL
# ─────────────────────────────────────────────
def call_glm(system_prompt: str, user_content: str) -> dict:
    payload = {
        "model": "ilmu-glm-5.1",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0,
    }

    try:
        with httpx.Client(timeout=60) as client:
            r = client.post(
                ILMU_URL,
                headers={
                    "Authorization": f"Bearer {ILMU_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        print("GLM STATUS:", r.status_code)
        print("GLM RAW:", r.text)

        r.raise_for_status()

        raw_text = r.json()["choices"][0]["message"]["content"]
        return parse_json(raw_text)

    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────
# SAFE JSON PARSER
# ─────────────────────────────────────────────
def parse_json(text: str) -> dict:
    clean = re.sub(r"```json|```", "", text).strip()
    match = re.search(r"\{.*\}", clean, re.DOTALL)

    if not match:
        return {"error": "No JSON found", "raw": text[:300]}

    try:
        return json.loads(match.group(0))
    except Exception:
        return {"error": "Invalid JSON", "raw": match.group(0)[:300]}


# ─────────────────────────────────────────────
# SSE STREAM
# ─────────────────────────────────────────────
async def stream_whatif(req: WhatIfRequest) -> AsyncGenerator[str, None]:

    yield f"data: {json.dumps({'event': 'status', 'message': 'Analyzing...'})}\n\n"

    user_content = json.dumps({
        "question": req.question,
        "current_scores": req.current_scores,
        "company_context": req.company_context,
    })

    try:
        result = await asyncio.to_thread(
            call_glm,
            WHATIF_SYSTEM_PROMPT,
            user_content
        )

        if "error" in result:
            yield f"data: {json.dumps({'event': 'error', 'message': result['error']})}\n\n"
        else:
            yield f"data: {json.dumps({'event': 'result', 'data': result})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"

    yield f"data: {json.dumps({'event': '__done__'})}\n\n"


# ─────────────────────────────────────────────
# ENDPOINT (IMPORTANT FIX HERE)
# ─────────────────────────────────────────────
@app.post("/whatif/stream")
async def whatif_stream(req: WhatIfRequest = Body(...)):
    return StreamingResponse(
        stream_whatif(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model": "ilmu-glm-5.1"}


# ─────────────────────────────────────────────
# WHAT-IF SLIDER ENDPOINT
# Uses the exact same ESG scoring bands as esg_math.py.
# Fallback to local math never needed — this IS the model.
# ─────────────────────────────────────────────
class WhatIfSliderRequest(BaseModel):
    baseline:    dict   # env, soc, gov, ghg_intensity, renewables_pct, sector, employee_scale, centrality_penalty, current_esg, approval_prob
    adjustments: dict   # energy_efficiency_pct, carbon_reduction_pct, revenue_increase_pct


@app.post("/whatif")
async def whatif_slider(req: WhatIfSliderRequest = Body(...)):
    from logic.esg_math import simulate_whatif_adjustments

    b = req.baseline

    result = simulate_whatif_adjustments(
        current_e          = float(b.get("env",               60)),
        current_s          = float(b.get("soc",               65)),
        current_g          = float(b.get("gov",               80)),
        ghg_intensity      = float(b.get("ghg_intensity") or 15.0),
        renewables_pct     = float(b.get("renewables_pct") or  0.0),
        sector             = str(b.get("sector",              "")),
        employee_scale     = float(b.get("employee_scale") or  1.0),
        centrality_penalty = float(b.get("centrality_penalty") or 0.0),
        adjustments        = req.adjustments,
    )

    current_esg  = float(b.get("current_esg",  result["new_esg"]))
    base_approval = float(b.get("approval_prob", 62.0))

    # Approval probability: linear approximation around loan tier thresholds.
    # Each ESG point gained ≈ +1.5% approval probability (empirically derived from tier bands).
    delta        = result["new_esg"] - current_esg
    new_approval = round(min(99.0, max(1.0, base_approval + delta * 1.5)), 1)

    return {
        "new_esg_score":     result["new_esg"],
        "new_approval_prob": new_approval,
        "delta_esg":         result["delta_esg"],
        "new_e":             result["new_e"],
        "new_s":             result["new_s"],
        "new_g":             result["new_g"],
        "message": (
            f"ESG: {current_esg} → {result['new_esg']} "
            f"({'+' if result['delta_esg'] >= 0 else ''}{result['delta_esg']} pts)  "
            f"· Approval: {base_approval}% → {new_approval}%"
        ),
        "source": "backend",
    }


# ─────────────────────────────────────────────
# SWARM RUN ENDPOINT
# Triggers the full LangGraph pipeline and emits
# socket.io events as each agent finishes.
# ─────────────────────────────────────────────
class RunAnalysisRequest(BaseModel):
    sme_id: Optional[str] = None


# ─────────────────────────────────────────────
# EXECUTE PIVOT ENDPOINT
# Records the arbitrage pivot decision and notifies all connected clients.
# ─────────────────────────────────────────────
class ExecutePivotRequest(BaseModel):
    sme_name:         str
    final_action:     str
    confidence_score: float
    current_esg:      float
    conditions:       list   # [{ action, action_type, financial_impact, esg_impact, reason }]


@app.post("/execute-pivot")
async def execute_pivot(req: ExecutePivotRequest = Body(...)):
    from datetime import datetime, timezone

    executed_at  = datetime.now(timezone.utc).isoformat()
    total_esg_impact = sum(float(c.get("esg_impact", 0)) for c in req.conditions)
    new_esg      = min(100.0, max(0.0, req.current_esg + total_esg_impact))

    # ── Persist to Supabase (best-effort — fails silently if not configured) ──
    pivot_id = None
    try:
        from utils.supabase_client import supabase
        record = {
            "sme_name":          req.sme_name,
            "final_action":      req.final_action,
            "confidence_score":  req.confidence_score,
            "current_esg":       req.current_esg,
            "projected_new_esg": new_esg,
            "total_esg_impact":  total_esg_impact,
            "conditions":        req.conditions,
            "executed_at":       executed_at,
        }
        result  = supabase.table("pivot_actions").insert(record).execute()
        pivot_id = result.data[0].get("id") if result.data else None
    except Exception as exc:
        # Supabase unavailable or table not yet created — log and continue
        print(f"[pivot] Supabase persist skipped: {exc}")

    # ── Broadcast to all Socket.IO clients ──
    await sio.emit("pivot_executed", {
        "sme_name":         req.sme_name,
        "final_action":     req.final_action,
        "total_esg_impact": total_esg_impact,
        "new_esg":          round(new_esg, 1),
        "executed_at":      executed_at,
        "pivot_id":         pivot_id,
    })

    return {
        "success":          True,
        "executed_at":      executed_at,
        "pivot_id":         pivot_id,
        "total_esg_impact": round(total_esg_impact, 1),
        "new_esg":          round(new_esg, 1),
    }


@app.post("/run-analysis")
async def run_analysis(req: RunAnalysisRequest = Body(...)):
    """
    Fire-and-forget: starts the swarm in the background.
    Results arrive via socket.io events:
      - swarm_status   { status: "starting" }
      - agent_update   { node, message }       (one per agent)
      - swarm_complete { status: "complete" }
    """
    asyncio.create_task(_run_swarm_and_emit(req.sme_id))
    return {"status": "started"}


def _extract_agent_message(node_name: str, node_output: dict) -> str | None:
    """Extract the human-readable reasoning text from a node's output delta."""
    if node_name == "fraud_detector":
        return node_output.get("fraud_output", {}).get("summary", "")

    if node_name == "auditor":
        aud = node_output.get("auditor_output", {})
        rationale = (aud.get("decision") or {}).get("rationale", "")
        summary   = aud.get("improvement_summary") or {}
        reasoning = summary.get("reasoning_trace", "") if isinstance(summary, dict) else ""
        return rationale or reasoning or "ESG audit complete."

    if node_name == "cfo":
        cfo    = node_output.get("cfo_output", {})
        summary = cfo.get("action_summary") or {}
        trace  = summary.get("reasoning_trace", "") if isinstance(summary, dict) else ""
        return trace or cfo.get("reject_reason", "") or "Financial analysis complete."

    if node_name == "arbitrageur":
        arb = node_output.get("arbitrage_output", {})
        return arb.get("reasoning_trace", "") or arb.get("final_recommendation", "Final decision reached.")

    return None


async def _run_swarm_and_emit(sme_id: str | None):
    """
    Run the full swarm pipeline in a thread pool.
    Uses asyncio.Queue to bridge the sync streaming loop
    with async socket.io emits.
    """
    from ingestion import build_payload
    from helpers.graph_engine import build_graph
    from helpers.claim_helper import _extract_claims, _extract_evidence
    from swarm import swarmapp
    from output.output_generator import generate_all_outputs
    from output.report_generator import generate_sedg_pdf

    await sio.emit("swarm_status", {"status": "starting"})

    queue: asyncio.Queue = asyncio.Queue()
    loop  = asyncio.get_running_loop()

    def _stream_pipeline():
        """Blocking function: builds payload, streams swarm, puts events onto the queue."""
        try:
            payload = build_payload(sme_id=sme_id)
            G       = build_graph(payload)

            graph_summary = {
                "claims":           _extract_claims(payload),
                "evidence_corpus":  _extract_evidence(payload),
                "sme":              payload["sme"],
                "esg_metrics":      payload["esg_metrics"],
                "suppliers":        payload["suppliers"],
                "contracts":        payload["contracts"],
                "loan_rates":       payload["loan_rates"],
                "news":             payload.get("news", []),
                "regulations":      payload.get("regulations", []),
            }

            initial_state = {
                "graph_payload":       graph_summary,
                "graph":               G,
                "auditor_retry_count": 0,
                "cfo_reject_reason":   "",
            }

            # Accumulate state across all node deltas so we have a
            # complete final_state for output generation.
            accumulated = dict(initial_state)

            for chunk in swarmapp.stream(initial_state, stream_mode="updates"):
                for node_name, node_output in chunk.items():
                    accumulated.update(node_output)

                    msg = _extract_agent_message(node_name, node_output)
                    if msg:
                        loop.call_soon_threadsafe(
                            queue.put_nowait,
                            ("agent_update", node_name, msg),
                        )

            # Emit via queue so the async side generates outputs
            loop.call_soon_threadsafe(queue.put_nowait, ("generate", accumulated))

        except Exception as exc:
            loop.call_soon_threadsafe(queue.put_nowait, ("error", str(exc)))

    # Start the blocking pipeline in a thread
    loop.run_in_executor(None, _stream_pipeline)

    # Process queue events asynchronously
    while True:
        item = await queue.get()
        kind = item[0]

        if kind == "agent_update":
            _, node_name, msg = item
            await sio.emit("agent_update", {"node": node_name, "message": msg})

        elif kind == "generate":
            _, accumulated = item
            try:
                sme_name = accumulated.get("graph_payload", {}).get("sme", {}).get("name", "SME")
                await asyncio.to_thread(generate_all_outputs, accumulated, sme_name)
                await asyncio.to_thread(generate_sedg_pdf, accumulated, sme_name)
            except Exception as exc:
                print(f"[run-analysis] Output generation error: {exc}")
            await sio.emit("swarm_complete", {"status": "complete"})
            break

        elif kind == "error":
            print(f"[run-analysis] Pipeline error: {item[1]}")
            await sio.emit("swarm_error", {"message": item[1]})
            break