import json
import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from backend.models.chat import DoubtRequest, ExplainRequest, TriviaRequest, TriviaResponse, TriviaQuestion
from backend.services import rag_service, llm_service

router = APIRouter()
logger = logging.getLogger(__name__)

DOUBT_PROMPT = """\
You are a helpful teaching assistant. Answer the student's question using only the provided notes context.
If the answer is not in the context, say so honestly.

Context from notes:
{context}

Student question: {question}"""

EXPLAIN_PROMPT = """\
You are a teaching assistant. Re-explain the following topic to a student.

Learning style instructions:
{learning_style}

Topic: {topic}

Relevant notes context:
{context}"""

TRIVIA_PROMPT = """\
Based on the following notes, generate 5 multiple choice questions to test understanding.
Return ONLY a JSON array with objects having keys: question, options (array of 4 strings), answer (one of the options), explanation.

Notes context:
{context}"""


def _chunks_to_context(chunks: list[str]) -> str:
    if not chunks:
        return "No relevant notes found."
    return "\n\n---\n\n".join(chunks)


@router.post("/chat/doubt")
async def chat_doubt(req: DoubtRequest):
    logger.info("Doubt request: subject_id=%d provider=%s model=%s", req.subject_id, req.provider_config.provider, req.provider_config.model)
    chunks = await rag_service.query(req.subject_id, req.question)
    logger.debug("RAG returned %d chunks for doubt query", len(chunks))
    context = _chunks_to_context(chunks)
    prompt = DOUBT_PROMPT.format(context=context, question=req.question)
    messages = [
        {"role": "system", "content": "You are a helpful teaching assistant."},
        {"role": "user", "content": prompt},
    ]

    async def event_generator():
        try:
            gen = await llm_service.get_completion(messages, stream=True, provider_config=req.provider_config)
            async for token in gen:
                yield {"data": json.dumps({"type": "token", "content": token})}
        except Exception as e:
            logger.error("Doubt SSE generation error: %s", e, exc_info=True)
            yield {"data": json.dumps({"type": "token", "content": f"\n\n[Error: {e}]"})}
        yield {"data": json.dumps({"type": "done"})}

    return EventSourceResponse(event_generator())


@router.post("/chat/explain")
async def chat_explain(req: ExplainRequest):
    logger.info("Explain request: subject_id=%d topic=%r provider=%s model=%s", req.subject_id, req.topic, req.provider_config.provider, req.provider_config.model)
    chunks = await rag_service.query(req.subject_id, req.topic)
    logger.debug("RAG returned %d chunks for explain query", len(chunks))
    context = _chunks_to_context(chunks)
    prompt = EXPLAIN_PROMPT.format(
        learning_style=req.learning_style,
        topic=req.topic,
        context=context,
    )
    messages = [
        {"role": "system", "content": "You are a teaching assistant helping a student understand concepts."},
        {"role": "user", "content": prompt},
    ]

    async def event_generator():
        try:
            gen = await llm_service.get_completion(messages, stream=True, provider_config=req.provider_config)
            async for token in gen:
                yield {"data": json.dumps({"type": "token", "content": token})}
        except Exception as e:
            logger.error("Explain SSE generation error: %s", e, exc_info=True)
            yield {"data": json.dumps({"type": "token", "content": f"\n\n[Error: {e}]"})}
        yield {"data": json.dumps({"type": "done"})}

    return EventSourceResponse(event_generator())


@router.post("/chat/trivia")
async def chat_trivia(req: TriviaRequest):
    logger.info("Trivia request: subject_id=%d provider=%s model=%s", req.subject_id, req.provider_config.provider, req.provider_config.model)
    chunks = await rag_service.query(req.subject_id, "general overview concepts", top_k=10)
    logger.debug("RAG returned %d chunks for trivia", len(chunks))
    context = _chunks_to_context(chunks)
    prompt = TRIVIA_PROMPT.format(context=context)
    messages = [
        {"role": "system", "content": "You are a quiz generator. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]

    try:
        gen = await llm_service.get_completion(messages, stream=False, provider_config=req.provider_config)
        full = ""
        async for chunk in gen:
            full += chunk
    except Exception as e:
        logger.error("Trivia LLM call failed: %s", e, exc_info=True)
        return JSONResponse({"questions": [], "error": str(e)}, status_code=500)

    logger.debug("Trivia raw LLM response (%d chars): %s", len(full), full[:200])

    # Strip markdown fences if present
    stripped = full.strip()
    if stripped.startswith("```"):
        lines = stripped.split("\n")
        stripped = "\n".join(lines[1:-1]) if len(lines) > 2 else stripped

    try:
        raw_questions = json.loads(stripped)
        questions = [TriviaQuestion(**q) for q in raw_questions]
        logger.info("Trivia: parsed %d questions", len(questions))
    except Exception as e:
        logger.error("Failed to parse trivia JSON: %s\nRaw: %s", e, full, exc_info=True)
        return JSONResponse({"questions": [], "error": "Failed to parse trivia JSON"}, status_code=500)

    return TriviaResponse(questions=questions)
