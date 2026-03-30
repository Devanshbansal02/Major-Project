# VeerPreps Student Learning Dashboard — Design Document

**Date:** 2026-03-28
**Status:** Approved for implementation
**Author:** Devansh

---

## 1. Overview

A student-facing learning support dashboard that connects to the VeerPreps notes API, processes those notes through a document pipeline, and exposes an AI-powered interface for asking doubts, taking trivia quizzes, and getting personalised re-explanations of topics using a Feynman-technique-aware learning model.

**Prototype scope:** Student dashboard only. No teacher dashboard. No authentication. Six hardcoded subjects.

---

## 2. System Architecture

```
┌─────────────────────────────────┐        ┌──────────────────────────────────────┐
│   Frontend (React + Vite + TS)  │  HTTP  │       Backend (FastAPI, Python)       │
│                                 │◄──────►│                                      │
│  - Subject Dashboard            │        │  - Notes ingestion & processing       │
│  - Notes Viewer                 │        │  - RAG pipeline (notebooklm-py)       │
│  - Ask Doubt (chat)             │        │  - LLM compatibility layer            │
│  - Trivia Quiz                  │        │  - Streaming chat completions         │
│  - Explain Again                │        │  - Provider model listing             │
│  - Settings (LLM config)        │        │                                      │
└─────────────────────────────────┘        └──────────────────────────────────────┘
                                                         │
                    ┌────────────────────┬───────────────┼───────────────┐
                    │                    │               │               │
             Tesseract CLI      opendataloader-pdf   python-pptx   notebooklm-py
             (handwritten OCR)  (typed PDF parse)    (PPTX parse)   (RAG index)
```

Two independent deployable units:

- `frontend/` — React + Vite + TypeScript SPA
- `backend/` — FastAPI Python server

They communicate via REST + Server-Sent Events (SSE) for streaming responses.

---

## 3. Subject Configuration

Six subjects are hardcoded in a config file. The `subjectId` values come from the VeerPreps API. Edit this file to change which subjects are displayed.

**File:** `backend/config.py`

```python
SUBJECTS = [
    {"id": 30,  "name": "Object Oriented Programming",   "code": "OOP",  "color": "#6366f1"},
    {"id": 32,  "name": "Database Management Systems",    "code": "DBMS", "color": "#0ea5e9"},
    {"id": 36,  "name": "Computer Networks",              "code": "CN",   "color": "#10b981"},
    {"id": 41,  "name": "Design & Analysis of Algorithms","code": "DAA",  "color": "#f59e0b"},
    {"id": 44,  "name": "Operating Systems",              "code": "OS",   "color": "#ef4444"},
    {"id": 222, "name": "AI & Machine Learning",          "code": "AIML", "color": "#a855f7"},
]

NOTES_API_URL = "https://veer-preps-api.vercel.app/api/notes/"
DATA_DIR = "./data"          # where processed notes and index live
INDEX_DIR = "./data/index"   # notebooklm-py index output
```

> **Note:** These subject IDs are representative. Update them to match the actual enrolled semester before running.

---

## 4. Backend (FastAPI)

### 4.1 Project Structure

```
backend/
├── main.py                  # FastAPI app, route registration
├── config.py                # Subject config, constants
├── requirements.txt
│
├── routers/
│   ├── notes.py             # GET /notes, GET /notes/{subject_id}
│   ├── chat.py              # POST /chat/doubt, POST /chat/explain, POST /chat/trivia
│   └── providers.py         # GET /providers/models
│
├── services/
│   ├── notes_service.py     # Fetch + cache notes from API
│   ├── processor.py         # File type detection + dispatch to CLI tools
│   ├── rag_service.py       # notebooklm-py index build + query
│   └── llm_service.py       # LLM compatibility layer (see §4.3)
│
└── models/
    ├── note.py              # Pydantic models: Note, Subject
    └── chat.py              # ChatRequest, ChatResponse, TriviaQuestion
```

### 4.2 API Routes

#### Notes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/notes` | All notes grouped by subject_id (filtered to configured 6) |
| `GET` | `/api/notes/{subject_id}` | Notes for a single subject |
| `POST` | `/api/notes/ingest` | Download + process all notes, build RAG index |

#### Chat (all stream SSE)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat/doubt` | Ask a question about a subject's notes |
| `POST` | `/api/chat/explain` | Re-explain a topic with learning style |
| `POST` | `/api/chat/trivia` | Generate trivia questions for a subject |

**Request body for `/api/chat/doubt`:**

```json
{
  "subject_id": 32,
  "question": "What is normalisation?",
  "provider_config": { "provider": "anthropic", "api_key": "...", "model": "claude-3-5-haiku-20241022" }
}
```

**Request body for `/api/chat/explain`:**

```json
{
  "subject_id": 32,
  "topic": "ACID properties",
  "learning_style": "Actively learning something new, slow down and go chunk by chunk...",
  "provider_config": { ... }
}
```

**Request body for `/api/chat/trivia`:**

```json
{
  "subject_id": 32,
  "provider_config": { ... }
}
```

**Response for trivia (JSON, not streamed):**

```json
{
  "questions": [
    {
      "question": "Which normal form eliminates transitive dependencies?",
      "options": ["1NF", "2NF", "3NF", "BCNF"],
      "answer": "3NF",
      "explanation": "3NF removes transitive functional dependencies..."
    }
  ]
}
```

#### Providers

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/providers/models?provider=openai&api_key=...&base_url=` | List available models |

### 4.3 LLM Compatibility Layer (`services/llm_service.py`)

Normalises all providers behind a single `get_completion(messages, stream, provider_config)` function.

**Provider config schema:**

```python
class ProviderConfig(BaseModel):
    provider: Literal["openai", "anthropic", "ollama", "custom"]
    api_key: str = ""
    base_url: str = ""      # required only for "custom"
    model: str
```

**Routing logic:**

| Provider | SDK Used | Notes |
|----------|----------|-------|
| `openai` | `openai` Python SDK | `base_url=https://api.openai.com/v1` |
| `anthropic` | `anthropic` Python SDK | Native Anthropic messages API |
| `ollama` | `openai` SDK | `base_url=http://localhost:11434/v1`, `api_key="ollama"` |
| `custom` | `openai` SDK | `base_url=<user input>`, user-provided key |

The function wraps both SDKs so callers never need to know which is active. For streaming, it yields SSE chunks uniformly.

**Model listing logic (`/api/providers/models`):**

| Provider | How models are fetched |
|----------|------------------------|
| `openai` | `GET https://api.openai.com/v1/models` |
| `anthropic` | Hardcoded curated list (Anthropic has no public list API) |
| `ollama` | `GET http://localhost:11434/api/tags` |
| `custom` | `GET {base_url}/models` (OpenAI-compatible assumed) |

**Hardcoded Anthropic models list:**

```python
ANTHROPIC_MODELS = [
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
]
```

### 4.4 Notes Processing Pipeline (`services/processor.py`)

Triggered by `POST /api/notes/ingest`. Downloads and processes all notes for the 6 configured subjects.

**File type detection:**

| Condition | Processor |
|-----------|-----------|
| URL ends with `.pptx` | `python-pptx` library |
| URL ends with `.pdf` AND filename contains "handwritten" (case-insensitive) | Tesseract CLI (after converting PDF pages to images via `pdf2image`) |
| URL ends with `.pdf` (all others) | `opendataloader-pdf` CLI |

**Processing flow per note:**

1. Download file to `./data/raw/{notes_id}.{ext}`
2. Detect file type
3. Extract text to `./data/processed/{notes_id}.txt`
4. On completion of all notes for a subject, append all `.txt` files into `./data/subjects/{subject_id}.txt`

**CLI invocations:**

```bash
# opendataloader-pdf
opendataloader-pdf ./data/raw/{notes_id}.pdf --output ./data/processed/{notes_id}.txt

# Tesseract (after pdf2image conversion to PNG pages)
tesseract ./data/raw/{notes_id}_page_1.png stdout >> ./data/processed/{notes_id}.txt

# notebooklm-py (index build — run once after all subjects processed)
notebooklm-py index --input ./data/subjects/ --output ./data/index/
```

### 4.5 RAG Service (`services/rag_service.py`)

Wraps `notebooklm-py` CLI for querying.

```bash
# Query example
notebooklm-py query --index ./data/index/ --subject {subject_id} --query "{question}" --top-k 5
```

Returns retrieved chunks as a list of strings. These chunks are injected into the LLM prompt as context.

**Doubt answering prompt template:**

```
You are a helpful teaching assistant. Answer the student's question using only the provided notes context.
If the answer is not in the context, say so honestly.

Context from notes:
{retrieved_chunks}

Student question: {question}
```

**Explain again prompt template:**

```
You are a teaching assistant. Re-explain the following topic to a student.

Learning style instructions:
{learning_style}

Topic: {topic}

Relevant notes context:
{retrieved_chunks}
```

**Trivia generation prompt:**

```
Based on the following notes, generate 5 multiple choice questions to test understanding.
Return ONLY a JSON array with objects: {question, options: [4 items], answer, explanation}.

Notes context:
{retrieved_chunks}
```

---

## 5. Frontend (React + Vite + TypeScript)

### 5.1 Project Structure

```
frontend/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
│
└── src/
    ├── main.tsx
    ├── App.tsx
    │
    ├── api/
    │   └── client.ts          # Typed API functions, SSE streaming helper
    │
    ├── store/
    │   └── settings.ts        # Zustand store: provider config, learning style
    │
    ├── pages/
    │   ├── Dashboard.tsx       # Subject grid (6 cards)
    │   ├── SubjectView.tsx     # Notes list + 3 action buttons per subject
    │   ├── ChatView.tsx        # Ask Doubt + Explain Again chat interface
    │   ├── TriviaView.tsx      # Quiz interface
    │   └── Settings.tsx        # LLM provider config
    │
    ├── components/
    │   ├── SubjectCard.tsx     # Subject card with colour, code, name
    │   ├── NoteItem.tsx        # Single note row with title + link
    │   ├── ChatMessage.tsx     # User/assistant message bubble with markdown
    │   ├── TriviaQuestion.tsx  # MCQ card with answer reveal
    │   ├── LearningStyleEditor.tsx  # Textarea with default prompt + reset button
    │   └── ProviderSelector.tsx    # Provider + API key + model dropdown form
    │
    └── types/
        └── index.ts            # Shared TypeScript types
```

### 5.2 Routing

```
/                   → Dashboard (6 subject cards)
/subject/:id        → SubjectView (notes + actions)
/subject/:id/chat   → ChatView (doubt or explain mode, via ?mode=doubt|explain&topic=...)
/subject/:id/trivia → TriviaView
/settings           → Settings page
```

Use `react-router-dom` v6.

### 5.3 State Management

Use **Zustand** for global state (lightweight, no boilerplate).

**`settings.ts` store:**

```typescript
interface SettingsStore {
  provider: "openai" | "anthropic" | "ollama" | "custom"
  apiKey: string
  baseUrl: string      // for custom
  model: string
  learningStyle: string  // defaults to Feynman/ADHD prompt
  setProvider: (p: string) => void
  setApiKey: (k: string) => void
  setModel: (m: string) => void
  setBaseUrl: (u: string) => void
  setLearningStyle: (s: string) => void
}
```

State is **persisted to `localStorage`** so provider config survives refresh.

**Default learning style:**

```
Actively learning something new, slow down and go chunk by chunk. Build the mental model before moving to the next piece. Invite him to explain things back, the Feynman technique works, and catching a misunderstanding early is worth more than speed. Don't move on until the current concept is actually solid. Adapt to his pace; assume he has ADHD and learns better in short focused bursts than long marathon sessions.
```

### 5.4 Page Specs

#### Dashboard (`/`)

- 2×3 grid of `SubjectCard` components
- Each card: subject name, code badge, accent colour strip, note count
- Click → navigates to `/subject/:id`
- Top-right: gear icon → `/settings`

#### SubjectView (`/subject/:id`)

- Subject header (name, colour, code)
- Notes list: each `NoteItem` shows title + "Open PDF" icon link
- Three action buttons at bottom:
  - **Ask a Doubt** → `/subject/:id/chat?mode=doubt`
  - **Explain Again** → `/subject/:id/chat?mode=explain`
  - **Take Trivia** → `/subject/:id/trivia`

#### ChatView (`/subject/:id/chat`)

- Reads `?mode=doubt|explain` and `?topic=` from URL
- For `explain` mode: shows topic input field if no `?topic` param, then renders chat
- Chat messages rendered with `react-markdown`
- Input box at bottom, send on Enter
- Streams response via SSE — shows typing indicator while streaming
- "Clear chat" button

#### TriviaView (`/subject/:id/trivia`)

- "Generate Quiz" button triggers `/api/chat/trivia`
- Loading state while generating
- Shows questions one at a time: question text + 4 option buttons
- After selection: reveals correct answer + explanation with colour feedback (green/red)
- Progress indicator: "Question 2 of 5"
- "Next" button to advance, "Restart" at end

#### Settings (`/settings`)

- `ProviderSelector` component:
  - Provider radio/select: Anthropic / OpenAI / Ollama / Custom
  - API Key field (hidden input, not shown for Ollama)
  - Base URL field (shown only for Custom)
  - Model dropdown: populated by `GET /api/providers/models`; shows "Fetching models..." while loading
  - "Save & Test" button — fires a simple test completion to validate config
- `LearningStyleEditor` component:
  - Large textarea (min 4 rows)
  - "Reset to default" button
  - Saves to Zustand store → localStorage on blur

### 5.5 API Client (`api/client.ts`)

Typed wrappers around `fetch`. Backend assumed at `http://localhost:8000`.

```typescript
// SSE streaming helper
async function* streamChat(endpoint: string, body: object): AsyncGenerator<string>

// REST helpers
getNotes(subjectId?: number): Promise<Note[]>
getModels(provider: string, apiKey: string, baseUrl?: string): Promise<string[]>
getTriviaQuestions(subjectId: number, providerConfig: ProviderConfig): Promise<TriviaQuestion[]>
triggerIngest(): Promise<{ status: string }>
```

### 5.6 Shared Types (`types/index.ts`)

```typescript
interface Note {
  notes_id: number
  subjectId: number
  link: string
  notesname: string
}

interface Subject {
  id: number
  name: string
  code: string
  color: string
  noteCount: number
}

interface ProviderConfig {
  provider: "openai" | "anthropic" | "ollama" | "custom"
  apiKey: string
  baseUrl: string
  model: string
}

interface TriviaQuestion {
  question: string
  options: string[]
  answer: string
  explanation: string
}
```

---

## 6. Data Flow — End to End

### Notes Ingestion (one-time setup)

```
User clicks "Ingest Notes" (or dev runs script)
  → POST /api/notes/ingest
  → backend fetches https://veer-preps-api.vercel.app/api/notes/
  → filters to 6 configured subject IDs
  → for each note:
      download file → detect type → extract text → save to ./data/processed/
  → merge per subject → ./data/subjects/{id}.txt
  → notebooklm-py index --input ./data/subjects/ --output ./data/index/
  → respond { status: "done", notes_processed: N }
```

### Ask Doubt

```
Student types question in ChatView
  → POST /api/chat/doubt { subject_id, question, provider_config }
  → rag_service queries notebooklm-py index for top-5 chunks
  → chunks + question injected into LLM prompt
  → llm_service streams completion via SSE
  → frontend renders streaming tokens in ChatMessage
```

### Model Listing

```
User opens Settings, selects provider
  → GET /api/providers/models?provider=...&api_key=...
  → backend queries provider's model endpoint
  → returns string[] of model names
  → frontend populates dropdown
```

---

## 7. Key Dependencies

### Backend

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `httpx` | Async HTTP (notes API fetch) |
| `openai` | OpenAI + Ollama + Custom provider SDK |
| `anthropic` | Anthropic provider SDK |
| `python-pptx` | PPTX text extraction |
| `pdf2image` | PDF → image for Tesseract |
| `pydantic` | Request/response validation |

**CLI tools (must be installed and on PATH):**

- `tesseract` — Tesseract OCR
- `opendataloader-pdf` — PDF text extraction CLI
- `notebooklm-py` — RAG index + query CLI

### Frontend

| Package | Purpose |
|---------|---------|
| `react-router-dom` | Client-side routing |
| `zustand` | Global state |
| `react-markdown` | Render LLM markdown output |
| `axios` or native `fetch` | HTTP client (use native fetch) |

No UI component library — build components from scratch with CSS.

---

## 8. Implementation Order

Build in this sequence. Each step is independently shippable.

1. **Backend scaffold** — FastAPI app, config, subject routes returning hardcoded data
2. **Notes API integration** — fetch + filter notes from VeerPreps API, `/api/notes`
3. **Frontend scaffold** — Vite + React + router, Dashboard page with hardcoded subjects
4. **SubjectView** — notes list fetched from backend, PDF links working
5. **Settings page** — provider config, model listing endpoint + dropdown
6. **LLM layer** — compatibility layer working for all 4 providers
7. **Notes processing** — ingestion pipeline, CLI integrations, text output files
8. **RAG indexing** — notebooklm-py index build wired to ingest endpoint
9. **Ask Doubt** — RAG query → LLM prompt → SSE streaming → ChatView
10. **Explain Again** — learning style prompt + RAG context → ChatView (explain mode)
11. **Trivia** — generation prompt → JSON parse → TriviaView quiz UI

---

## 9. Not In Scope (Prototype)

- Teacher dashboard
- User authentication or session management
- Multiple student profiles
- Persistent chat history (chat clears on page refresh is fine)
- Mobile responsive design (desktop-first is fine)
- Deployment / production build
- Database (filesystem is the data store for the prototype)
