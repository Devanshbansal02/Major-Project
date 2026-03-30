from typing import AsyncGenerator
from openai import AsyncOpenAI
import anthropic as _anthropic
from backend.models.chat import ProviderConfig


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

    # --- OpenAI-compatible providers ---
    if provider in ("openai", "ollama", "custom"):
        use_anthropic_style = provider == "custom" and provider_config.custom_style == "anthropic"

        if use_anthropic_style:
            # Custom provider that speaks the Anthropic API
            client = _anthropic.AsyncAnthropic(api_key=api_key, base_url=provider_config.base_url or None)
            system = ""
            anthro_messages = []
            for m in messages:
                if m["role"] == "system":
                    system = m["content"]
                else:
                    anthro_messages.append({"role": m["role"], "content": m["content"]})

            if stream:
                async def _stream_custom_anthropic():
                    async with client.messages.stream(
                        model=model,
                        max_tokens=2048,
                        system=system,
                        messages=anthro_messages,
                    ) as s:
                        async for text in s.text_stream:
                            yield text
                return _stream_custom_anthropic()
            else:
                async def _complete_custom_anthropic():
                    resp = await client.messages.create(
                        model=model,
                        max_tokens=2048,
                        system=system,
                        messages=anthro_messages,
                    )
                    yield resp.content[0].text
                return _complete_custom_anthropic()

        # OpenAI-compatible path
        if provider == "openai":
            base_url = "https://api.openai.com/v1"
        elif provider == "ollama":
            base_url = "http://localhost:11434/v1"
            api_key = api_key or "ollama"
        else:
            base_url = provider_config.base_url

        client = AsyncOpenAI(api_key=api_key or "none", base_url=base_url)

        if stream:
            async def _stream_openai():
                async with client.chat.completions.stream(
                    model=model,
                    messages=messages,
                ) as s:
                    async for chunk in s:
                        delta = chunk.choices[0].delta.content if chunk.choices else None
                        if delta:
                            yield delta
            return _stream_openai()
        else:
            async def _complete_openai():
                resp = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    stream=False,
                )
                yield resp.choices[0].message.content or ""
            return _complete_openai()

    # --- Anthropic ---
    elif provider == "anthropic":
        client = _anthropic.AsyncAnthropic(api_key=api_key)

        # Separate system prompt from user messages
        system = ""
        anthro_messages = []
        for m in messages:
            if m["role"] == "system":
                system = m["content"]
            else:
                anthro_messages.append({"role": m["role"], "content": m["content"]})

        if stream:
            async def _stream_anthropic():
                async with client.messages.stream(
                    model=model,
                    max_tokens=2048,
                    system=system,
                    messages=anthro_messages,
                ) as s:
                    async for text in s.text_stream:
                        yield text
            return _stream_anthropic()
        else:
            async def _complete_anthropic():
                resp = await client.messages.create(
                    model=model,
                    max_tokens=2048,
                    system=system,
                    messages=anthro_messages,
                )
                yield resp.content[0].text
            return _complete_anthropic()

    else:
        async def _unsupported():
            yield f"Unsupported provider: {provider}"
        return _unsupported()
