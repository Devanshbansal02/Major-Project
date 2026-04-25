import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI
import anthropic as _anthropic
from backend.models.chat import ProviderConfig

logger = logging.getLogger(__name__)


async def get_completion(
    messages: list[dict],
    stream: bool,
    provider_config: ProviderConfig,
) -> AsyncGenerator[str, None]:
    """
    Yields string chunks if stream=True.
    Yields a single full-string chunk if stream=False.
    """
    provider = provider_config.provider
    api_key = provider_config.api_key
    model = provider_config.model

    logger.info(
        "LLM completion: provider=%s model=%s stream=%s messages=%d",
        provider, model, stream, len(messages),
    )

    # --- Anthropic ---
    if provider == "anthropic":
        logger.debug("Using Anthropic SDK")
        client = _anthropic.AsyncAnthropic(api_key=api_key)
        return _anthropic_gen(client, model, messages, stream)

    # --- Custom provider with Anthropic-style API ---
    if provider == "custom" and provider_config.custom_style == "anthropic":
        raw_url = (provider_config.base_url or "").rstrip("/")
        # The Anthropic SDK appends /v1/... to base_url, so strip a trailing /v1 to avoid doubling
        if raw_url.endswith("/v1"):
            raw_url = raw_url[:-3]
        logger.debug("Using Anthropic SDK for custom Anthropic-compatible endpoint: %s", raw_url or "(default)")
        client = _anthropic.AsyncAnthropic(
            api_key=api_key,
            base_url=raw_url or None,
        )
        return _anthropic_gen(client, model, messages, stream)

    # --- OpenAI-compatible providers (openai, ollama, custom/openai) ---
    if provider == "openai":
        base_url = "https://api.openai.com/v1"
    elif provider == "ollama":
        from backend.config import OLLAMA_BASE_URL
        base_url = f"{OLLAMA_BASE_URL}/v1"
        api_key = api_key or "ollama"
    else:
        # custom with openai style
        base_url = provider_config.base_url

    logger.debug("Using OpenAI-compatible SDK: base_url=%s", base_url)
    client = AsyncOpenAI(api_key=api_key or "none", base_url=base_url)
    return _openai_gen(client, model, messages, stream)


async def _anthropic_gen(
    client: _anthropic.AsyncAnthropic,
    model: str,
    messages: list[dict],
    stream: bool,
) -> AsyncGenerator[str, None]:
    """Separate system prompt from user/assistant turns, then call Anthropic."""
    system: str | _anthropic.NotGiven = _anthropic.NOT_GIVEN
    anthro_messages = []
    for m in messages:
        if m["role"] == "system":
            if m["content"].strip():
                system = m["content"]
        else:
            anthro_messages.append({"role": m["role"], "content": m["content"]})

    kwargs: dict = dict(model=model, max_tokens=2048, messages=anthro_messages)
    if system is not _anthropic.NOT_GIVEN:
        kwargs["system"] = system

    if stream:
        logger.debug("Anthropic: streaming response")
        try:
            async with client.messages.stream(**kwargs) as s:
                async for text in s.text_stream:
                    yield text
        except Exception as e:
            logger.error("Anthropic streaming error: %s", e, exc_info=True)
            yield f"\n\n[Error: {e}]"
    else:
        logger.debug("Anthropic: non-streaming response")
        try:
            resp = await client.messages.create(**kwargs)
            yield resp.content[0].text
        except Exception as e:
            logger.error("Anthropic completion error: %s", e, exc_info=True)
            yield f"[Error: {e}]"


async def _openai_gen(
    client: AsyncOpenAI,
    model: str,
    messages: list[dict],
    stream: bool,
) -> AsyncGenerator[str, None]:
    """Call OpenAI-compatible API."""
    if stream:
        logger.debug("OpenAI-compat: streaming response")
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
            )
            async for chunk in response:
                if chunk.choices:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        yield delta
        except Exception as e:
            logger.error("OpenAI streaming error: %s", e, exc_info=True)
            yield f"\n\n[Error: {e}]"
    else:
        logger.debug("OpenAI-compat: non-streaming response")
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=False,
            )
            yield resp.choices[0].message.content or ""
        except Exception as e:
            logger.error("OpenAI completion error: %s", e, exc_info=True)
            yield f"[Error: {e}]"
