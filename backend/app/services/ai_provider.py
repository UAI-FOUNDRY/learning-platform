"""Talks to the AI model. AI_PROVIDER=disabled | anthropic | fake (tests)."""
import logging
from dataclasses import dataclass
from typing import List, Optional

import httpx

from app.config.settings import settings

logger = logging.getLogger(__name__)

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


class AIUnavailable(Exception):
    """The AI model cannot be reached or is not configured."""


@dataclass
class AIReply:
    text: str
    model: str
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None


class DisabledProvider:
    name = "disabled"

    def complete(self, system: str, messages: List[dict]) -> AIReply:
        raise AIUnavailable("The AI assistant is not set up on this server")


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, transport: Optional[httpx.BaseTransport] = None) -> None:
        self._transport = transport

    def complete(self, system: str, messages: List[dict]) -> AIReply:
        if not settings.ANTHROPIC_API_KEY:
            raise AIUnavailable("ANTHROPIC_API_KEY is not set")
        payload = {"model": settings.AI_MODEL, "max_tokens": settings.AI_MAX_OUTPUT_TOKENS, "system": system,
                   "messages": messages}
        headers = {"x-api-key": settings.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01",
                   "content-type": "application/json"}
        try:
            with httpx.Client(timeout=60, transport=self._transport) as client:
                response = client.post(ANTHROPIC_URL, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            logger.error("AI request failed: %s", exc)
            raise AIUnavailable("The AI assistant could not be reached. Try again in a moment.")
        if response.status_code == 429:
            raise AIUnavailable("The AI assistant is busy. Try again in a moment.")
        if response.status_code >= 300:
            logger.error("AI error %s: %s", response.status_code, response.text[:300])
            raise AIUnavailable("The AI assistant had a problem. Try again later.")
        data = response.json()
        text = "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text").strip()
        if not text:
            raise AIUnavailable("The AI assistant returned an empty answer")
        usage = data.get("usage") or {}
        return AIReply(text=text, model=data.get("model") or settings.AI_MODEL,
                       input_tokens=usage.get("input_tokens"), output_tokens=usage.get("output_tokens"))


class FakeProvider:
    """Deterministic provider for tests: echoes what it was given so tests can inspect prompts."""
    name = "fake"
    calls: List[dict] = []

    def complete(self, system: str, messages: List[dict]) -> AIReply:
        FakeProvider.calls.append({"system": system, "messages": messages})
        return AIReply(text=f"echo: {messages[-1]['content']}", model="fake-model", input_tokens=10, output_tokens=5)


class AIProviderFacade:
    backend = None   # tests may assign a stub

    def _current(self):
        if self.backend is not None:
            return self.backend
        mode = (settings.AI_PROVIDER or "disabled").lower()
        if mode == "anthropic":
            return AnthropicProvider()
        if mode == "fake":
            return FakeProvider()
        return DisabledProvider()

    @property
    def name(self) -> str:
        return self._current().name

    def available(self) -> bool:
        return self._current().name != "disabled"

    def complete(self, system: str, messages: List[dict]) -> AIReply:
        return self._current().complete(system, messages)


ai_provider = AIProviderFacade()
