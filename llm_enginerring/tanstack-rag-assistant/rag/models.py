"""Pydantic models shared by every stage."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class AppError(Exception):
    """A failure of the app (model, network, index), as opposed to 'no evidence'.

    kind: index | embedding | rerank | generation | no_evidence
    """

    def __init__(self, kind: str, message: str):
        super().__init__(message)
        self.kind = kind


class Chunk(BaseModel):
    """One retrievable piece of a page, with the metadata every consumer relies on."""

    chunk_id: str
    source_url: str
    source_path: str
    title: str
    heading_path: list[str]
    section_anchor: str
    version: str
    has_code: bool
    token_count: int
    text: str

    @property
    def section(self) -> str:
        """Section label used by the eval set: '<source_path>#<section_anchor>'."""
        return f"{self.source_path}#{self.section_anchor}"

    def meta(self) -> dict:
        """Flat metadata (Chroma values must be str/int/float/bool, so the heading path is joined)."""
        return {
            **self.model_dump(exclude={"text", "heading_path"}),
            "heading_path": " > ".join(self.heading_path),
        }


class Hit(BaseModel):
    """One retrieved chunk; the single result shape used by every retriever and consumer."""

    chunk_id: str
    text: str
    meta: dict
    score: float
    rank: int          # 1-based position in the list this hit came from
    retriever: str     # e.g. "vector", "bm25", "hybrid", "hybrid+rerank"

    @property
    def section(self) -> str:
        return f"{self.meta['source_path']}#{self.meta['section_anchor']}"


class EvalCase(BaseModel):
    id: str
    split: Literal["dev", "heldout"]
    category: str
    question: str
    expected_behavior: Literal["answer", "clarify", "abstain"]
    relevant_sections: list[str]
    evidence_phrases: list[str]
    expected_facts: list[str]
    must_not_claim: list[str]
    answerable: bool
    reviewed: bool


class RankOrder(BaseModel):
    order: list[int] = Field(description="Chunk numbers from most to least useful, each exactly once")


class Verdict(BaseModel):
    facts_covered: int = Field(description="How many of the expected facts the answer clearly states (0..N).")
    contradicts: bool = Field(description="True if the answer states anything listed in must_not_claim, or contradicts an expected fact.")
    faithful: bool = Field(description="True if every factual claim in the answer is supported by the evidence passages. False if any claim is not in them (even if true in general). If no evidence was given, answer False.")
    behavior_ok: bool = Field(description="answer: it gives a real answer instead of refusing. clarify: it asks a clarifying question instead of guessing. abstain: it says the docs do not cover this and does not invent an answer.")
    reason: str = Field(description="One short sentence explaining the verdict, naming any missing fact or unsupported claim.")


class Citation(BaseModel):
    chunk_id: str
    url: str
    heading: str


class ErrorInfo(BaseModel):
    kind: str
    message: str


class AnswerResult(BaseModel):
    """Result of answer_question; failures set `error` instead of raising."""

    question: str
    config: dict
    retrieved: list[Hit] = Field(default_factory=list)
    retrieval_s: float = 0.0
    generation_s: float = 0.0
    answer: Optional[str] = None
    citations: list[Citation] = Field(default_factory=list)
    unknown_citations: list[str] = Field(default_factory=list)
    missing_citations: bool = False
    total_s: float = 0.0
    error: Optional[ErrorInfo] = None
