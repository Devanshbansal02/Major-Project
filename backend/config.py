import os

SUBJECTS = [
    {"id": 30,  "name": "Object Oriented Programming",    "code": "OOP",  "color": "#6366f1"},
    {"id": 32,  "name": "Database Management Systems",    "code": "DBMS", "color": "#0ea5e9"},
    {"id": 36,  "name": "Computer Networks",              "code": "CN",   "color": "#10b981"},
    {"id": 41,  "name": "Design & Analysis of Algorithms","code": "DAA",  "color": "#f59e0b"},
    {"id": 44,  "name": "Operating Systems",              "code": "OS",   "color": "#ef4444"},
    {"id": 222, "name": "AI & Machine Learning",          "code": "AIML", "color": "#a855f7"},
]

SUBJECT_IDS = {s["id"] for s in SUBJECTS}

NOTES_API_URL = "https://veer-preps-api.vercel.app/api/notes/"
DATA_DIR = os.getenv("DATA_DIR", "./data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
INDEX_DIR = os.path.join(DATA_DIR, "index")

# Ollama embedding config
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "embeddinggemma:latest")

ANTHROPIC_MODELS = [
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
]
