from typing import Literal, Union
from pydantic import BaseModel


class ProviderConfig(BaseModel):
    provider: Literal["openai", "anthropic", "ollama", "custom"]
    api_key: str = ""
    base_url: str = ""
    model: str
    custom_style: Literal["openai", "anthropic"] = "openai"


class Message(BaseModel):
    role: str
    content: str


class DoubtRequest(BaseModel):
    subject_id: int
    question: str
    provider_config: ProviderConfig
    note_ids: list[int] | None = None   # None = whole subject index, [] = no notes
    history: list[Message] | None = None


class ExplainRequest(BaseModel):
    subject_id: int
    topic: str
    learning_style: str
    provider_config: ProviderConfig
    note_ids: list[int] | None = None
    history: list[Message] | None = None


class TriviaRequest(BaseModel):
    subject_id: int
    provider_config: ProviderConfig
    note_ids: list[int] | None = None
    quiz_type: Literal["mcq", "short_answer"] = "mcq"
    num_questions: int = 5


class TriviaQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str
    explanation: str


class ShortAnswerQuestion(BaseModel):
    question: str
    answer: str
    explanation: str


class TriviaResponse(BaseModel):
    questions: list[TriviaQuestion]


class ShortAnswerResponse(BaseModel):
    questions: list[ShortAnswerQuestion]
