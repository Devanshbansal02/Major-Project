from fastapi import APIRouter
from backend.config import ANTHROPIC_MODELS
import httpx

router = APIRouter()


@router.get("/providers/models")
async def get_models(provider: str, api_key: str = "", base_url: str = "", custom_style: str = "openai"):
    if provider == "anthropic":
        return ANTHROPIC_MODELS

    if provider == "ollama":
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get("http://localhost:11434/api/tags")
                r.raise_for_status()
                data = r.json()
                return [m["name"] for m in data.get("models", [])]
        except Exception:
            return []

    if provider == "openai":
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                r.raise_for_status()
                models = r.json().get("data", [])
                # Filter to GPT models only, sorted
                ids = sorted(
                    [m["id"] for m in models if "gpt" in m["id"].lower()],
                    reverse=True,
                )
                return ids
        except Exception:
            return []

    if provider == "custom":
        # If the custom endpoint speaks the Anthropic API, return the hardcoded list
        if custom_style == "anthropic":
            return ANTHROPIC_MODELS
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    f"{base_url.rstrip('/')}/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                r.raise_for_status()
                models = r.json().get("data", [])
                return [m["id"] for m in models]
        except Exception:
            return []

    return []
