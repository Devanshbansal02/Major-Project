import logging
from fastapi import APIRouter
from backend.config import ANTHROPIC_MODELS, OLLAMA_BASE_URL
import httpx

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/providers/models")
async def get_models(provider: str, api_key: str = "", base_url: str = "", custom_style: str = "openai"):
    logger.info("Model listing requested: provider=%s", provider)

    if provider == "anthropic":
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://api.anthropic.com/v1/models",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                    },
                )
                r.raise_for_status()
                models = [m["id"] for m in r.json().get("data", [])]
                if models:
                    logger.debug("Anthropic models fetched dynamically: %s", models)
                    return models
        except Exception as e:
            logger.warning("Failed to fetch Anthropic models dynamically: %s", e)
        logger.debug("Falling back to hardcoded Anthropic model list")
        return ANTHROPIC_MODELS

    if provider == "ollama":
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
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
        # Anthropic-style custom endpoint — try dynamic fetch, fall back to hardcoded list
        if custom_style == "anthropic":
            try:
                stripped = base_url.rstrip("/")
                # Check if base_url already contains a version prefix
                if "/v1" in stripped or "/v2" in stripped:
                    url = f"{stripped}/models"
                else:
                    url = f"{stripped}/v1/models"
                logger.debug("Fetching custom Anthropic-style models from: %s", url)
                async with httpx.AsyncClient(timeout=10) as client:
                    r = await client.get(
                        url,
                        headers={
                            "x-api-key": api_key,
                            "anthropic-version": "2023-06-01",
                        },
                    )
                    r.raise_for_status()
                    models = [m["id"] for m in r.json().get("data", [])]
                    if models:
                        logger.debug("Custom Anthropic-style models fetched: %s", models)
                        return models
            except Exception as e:
                logger.warning("Failed to fetch custom Anthropic-style models: %s", e)
            logger.debug("Custom Anthropic-style endpoint: falling back to hardcoded model list")
            return ANTHROPIC_MODELS

        # OpenAI-style custom endpoint → fetch from /v1/models (or /models if base_url already has v1)
        try:
            stripped = base_url.rstrip("/")
            if "/v1" in stripped or "/v2" in stripped:
                url = f"{stripped}/models"
            else:
                url = f"{stripped}/v1/models"
            logger.debug("Fetching custom OpenAI-style models from: %s", url)
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
