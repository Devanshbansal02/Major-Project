import json
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from backend.models.chat import DoubtRequest, ExplainRequest, TriviaRequest, TriviaResponse, TriviaQuestion
from backend.services import rag_service, llm_service

router = APIRouter()

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
    chunks = await rag_service.query(req.subject_id, req.question)
    context = _chunks_to_context(chunks)
    prompt = DOUBT_PROMPT.format(context=context, question=req.question)
    messages = [
        {"role": "system", "content": "You are a helpful teaching assistant."},
        {"role": "user", "content": prompt},
    ]

    async def event_generator():
        gen = await llm_service.get_completion(messages, stream=True, provider_config=req.provider_config)
        async for token in gen:
            yield {"data": json.dumps({"type": "token", "content": token})}
        yield {"data": json.dumps({"type": "done"})}

    return EventSourceResponse(event_generator())


@router.post("/chat/explain")
async def chat_explain(req: ExplainRequest):
    chunks = await rag_service.query(req.subject_id, req.topic)
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
        gen = await llm_service.get_completion(messages, stream=True, provider_config=req.provider_config)
        async for token in gen:
            yield {"data": json.dumps({"type": "token", "content": token})}
        yield {"data": json.dumps({"type": "done"})}

    return EventSourceResponse(event_generator())


@router.post("/chat/trivia")
async def chat_trivia(req: TriviaRequest):
    chunks = await rag_service.query(req.subject_id, "general overview concepts", top_k=10)
    context = _chunks_to_context(chunks)
    prompt = TRIVIA_PROMPT.format(context=context)
    messages = [
        {"role": "system", "content": "You are a quiz generator. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]

    gen = await llm_service.get_completion(messages, stream=False, provider_config=req.provider_config)
    full = ""
    async for chunk in gen:
        full += chunk

    # Strip markdown fences if present
    stripped = full.strip()
    if stripped.startswith("```"):
        lines = stripped.split("\n")
        stripped = "\n".join(lines[1:-1]) if len(lines) > 2 else stripped

    try:
        raw_questions = json.loads(stripped)
        questions = [TriviaQuestion(**q) for q in raw_questions]
    except Exception:
        return JSONResponse({"questions": [], "error": "Failed to parse trivia JSON"}, status_code=500)

    return TriviaResponse(questions=questions)
