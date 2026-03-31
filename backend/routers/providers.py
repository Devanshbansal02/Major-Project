import logging
from fastapi import APIRouter
from backend.config import ANTHROPIC_MODELS
import httpx

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/providers/models")
async def get_models(provider: str, api_key: str = "", base_url: str = "", custom_style: str = "openai"):
    logger.info("Model listing requested: provider=%s", provider)

    if provider == "anthropic":
        logger.debug("Returning hardcoded Anthropic model list (%d models)", len(ANTHROPIC_MODELS))
        return ANTHROPIC_MODELS

    if provider == "ollama":
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get("http://localhost:11434/api/tags")
                r.raise_for_status()
                data = r.json()
                models = [m["name"] for m in data.get("models", [])]
                logger.debug("Ollama models fetched: %s", models)
                return models
        except Exception as e:
            logger.warning("Failed to fetch Ollama models: %s", e)
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
                ids = sorted(
                    [m["id"] for m in models if "gpt" in m["id"].lower()],
                    reverse=True,
                )
                logger.debug("OpenAI models fetched: %d GPT models", len(ids))
                return ids
        except Exception as e:
            logger.warning("Failed to fetch OpenAI models: %s", e)
            return []

    if provider == "custom":
        # Anthropic-style custom endpoint → return curated list (Anthropic has no public list API)
        if custom_style == "anthropic":
            logger.debug("Custom Anthropic-style endpoint: returning hardcoded model list")
            return ANTHROPIC_MODELS
        # OpenAI-style custom endpoint → fetch from /v1/models (or /models if base_url already has v1)
        try:
            stripped = base_url.rstrip("/")
            # If the base URL already contains a version segment, go straight to /models
            if "/v1" in stripped or "/v2" in stripped:
                url = f"{stripped}/models"
            else:
                url = f"{stripped}/v1/models"
            logger.debug("Fetching custom models from: %s", url)
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                r.raise_for_status()
                models = r.json().get("data", [])
                ids = [m["id"] for m in models]
                logger.debug("Custom models fetched: %s", ids)
                return ids
        except Exception as e:
            logger.warning("Failed to fetch custom provider models: %s", e)
            return []

    logger.warning("Unknown provider: %s", provider)
    return []
