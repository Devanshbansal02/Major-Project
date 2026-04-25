from typing import Literal
from pydantic import BaseModel


class ProviderConfig(BaseModel):
    provider: Literal["openai", "anthropic", "ollama", "custom"]
    api_key: str = ""
    base_url: str = ""
    model: str
    custom_style: Literal["openai", "anthropic"] = "openai"


class DoubtRequest(BaseModel):
    subject_id: int
    question: str
    provider_config: ProviderConfig
    note_ids: list[int] = []   # empty = whole subject index


class ExplainRequest(BaseModel):
    subject_id: int
    topic: str
    learning_style: str
    provider_config: ProviderConfig
    note_ids: list[int] = []


class TriviaRequest(BaseModel):
    subject_id: int
    provider_config: ProviderConfig
    note_ids: list[int] = []


class TriviaQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str
    explanation: str


class TriviaResponse(BaseModel):
    questions: list[TriviaQuestion]
