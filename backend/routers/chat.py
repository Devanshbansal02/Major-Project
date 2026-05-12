import json
import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from backend.models.chat import DoubtRequest, ExplainRequest, TriviaRequest, TriviaResponse, TriviaQuestion, ShortAnswerResponse, ShortAnswerQuestion
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
You are a friendly and expert teaching assistant. Your goal is to help the student understand the topic: {topic}.

Learning style instructions:
{learning_style}

Relevant notes context:
{context}

Guidelines:
1. If this is the start of the conversation, provide a clear and engaging explanation based on the context and learning style.
2. If there is a conversation history, treat the current topic as a follow-up question or response. Do NOT re-explain everything from scratch unless asked.
3. Be conversational. If the student answers a question you asked, acknowledge it and build upon it.
4. Use the provided context to ensure accuracy.
"""

TRIVIA_MCQ_PROMPT = """\
Based on the following notes, generate {num_questions} multiple choice questions to test understanding.
Return ONLY a JSON array with objects having keys: question, options (array of 4 strings), answer (one of the options), explanation.

Notes context:
{context}"""

TRIVIA_SHORT_PROMPT = """\
Based on the following notes, generate {num_questions} short-answer questions to test understanding.
Return ONLY a JSON array with objects having keys: question, answer (a concise 1-2 sentence answer), explanation (a fuller explanation).

Notes context:
{context}"""


def _chunks_to_context(chunks: list[str]) -> str:
    if not chunks:
        return "No relevant notes found."
    return "\n\n---\n\n".join(chunks)


@router.post("/chat/doubt")
async def chat_doubt(req: DoubtRequest):
    logger.info("Doubt request: subject_id=%d provider=%s model=%s", req.subject_id, req.provider_config.provider, req.provider_config.model)
    chunks = await rag_service.query(req.subject_id, req.question, note_ids=req.note_ids)
    logger.debug("RAG returned %d chunks for doubt query", len(chunks))
    context = _chunks_to_context(chunks)
    prompt = DOUBT_PROMPT.format(context=context, question=req.question)
    
    messages = []
    if req.history:
        for m in req.history:
            messages.append({"role": m.role, "content": m.content})
    else:
        messages.append({"role": "system", "content": "You are a helpful teaching assistant."})
    
    messages.append({"role": "user", "content": prompt})

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
    chunks = await rag_service.query(req.subject_id, req.topic, note_ids=req.note_ids)
    logger.debug("RAG returned %d chunks for explain query", len(chunks))
    context = _chunks_to_context(chunks)
    prompt = EXPLAIN_PROMPT.format(
        learning_style=req.learning_style,
        topic=req.topic,
        context=context,
    )
    
    messages = []
    if req.history and len(req.history) > 0:
        # If there's history, we keep the system prompt and then the history, then the new prompt
        messages.append({"role": "system", "content": "You are a teaching assistant helping a student understand concepts. Be conversational and build on previous turns."})
        for m in req.history:
            messages.append({"role": m.role, "content": m.content})
        # Add the new follow-up as a user message
        messages.append({"role": "user", "content": f"Follow-up/Answer: {req.topic}\n\n(Use the previously provided context and learning style to respond)"})
    else:
        # First turn
        messages.append({"role": "system", "content": "You are a teaching assistant helping a student understand concepts."})
        messages.append({"role": "user", "content": prompt})

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
    logger.info(
        "Trivia request: subject_id=%d type=%s num=%d provider=%s model=%s",
        req.subject_id, req.quiz_type, req.num_questions,
        req.provider_config.provider, req.provider_config.model
    )
    chunks = await rag_service.query(req.subject_id, "general overview concepts", note_ids=req.note_ids)
    logger.debug("RAG returned %d chunks for trivia", len(chunks))
    context = _chunks_to_context(chunks)

    if req.quiz_type == "short_answer":
        prompt = TRIVIA_SHORT_PROMPT.format(num_questions=req.num_questions, context=context)
    else:
        prompt = TRIVIA_MCQ_PROMPT.format(num_questions=req.num_questions, context=context)

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
        if req.quiz_type == "short_answer":
            questions = [ShortAnswerQuestion(**q) for q in raw_questions]
            logger.info("Short-answer trivia: parsed %d questions", len(questions))
            return ShortAnswerResponse(questions=questions)
        else:
            questions = [TriviaQuestion(**q) for q in raw_questions]
            logger.info("MCQ trivia: parsed %d questions", len(questions))
            return TriviaResponse(questions=questions)
    except Exception as e:
        logger.error("Failed to parse trivia JSON: %s\nRaw: %s", e, full, exc_info=True)
        return JSONResponse({"questions": [], "error": "Failed to parse trivia JSON"}, status_code=500)
