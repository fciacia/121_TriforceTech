import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


def _build_supabase_client():
    # Lazy import keeps startup fast and avoids heavy import chain until needed.
    from supabase import create_client, ClientOptions
    import httpx

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY in environment")

    http_client = httpx.Client(transport=httpx.HTTPTransport(http2=False))
    client = create_client(
        SUPABASE_URL,
        SUPABASE_KEY,
        options=ClientOptions(httpx_client=http_client)
    )
    print("✅ Supabase connected")
    return client


class _LazySupabaseClient:
    def __init__(self):
        self._client = None

    def _get(self):
        if self._client is None:
            self._client = _build_supabase_client()
        return self._client

    def __getattr__(self, name):
        return getattr(self._get(), name)


supabase = _LazySupabaseClient()