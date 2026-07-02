import logging
from typing import Any, Dict, List

from openai import OpenAI

from app.core.config import settings
from app.services.vector.search_service import VectorSearchService

logger = logging.getLogger(__name__)


def _get_client() -> OpenAI:
    api_key = settings.ACCOUNTS_OPENROUTER_API_KEY or settings.OPENROUTER_API_KEY
    if not api_key:
        raise ValueError("ACCOUNTS_OPENROUTER_API_KEY is not configured")
    return OpenAI(
        api_key=api_key,
        base_url=settings.OPENROUTER_BASE_URL,
        default_headers={
            "HTTP-Referer": "https://business-suite.local",
            "X-Title": "Business Suite - Accounts Assistant",
        },
    )


def _build_context_text(results: List[Dict[str, Any]]) -> str:
    if not results:
        return "No relevant accounting documents were found."

    lines: List[str] = []
    for item in results[:8]:
        content = (item.get("content") or "").strip()
        if not content:
            continue
        metadata = item.get("metadata") or {}
        source = metadata.get("source_table") or item.get("source_table") or "accounts"
        lines.append(f"- Source: {source}\n{content}")
    return "\n\n".join(lines)


def _build_prompt(message: str, history: List[Dict[str, Any]], context_text: str) -> str:
    history_text = ""
    for h in history[-8:]:
        role = "User" if h.get("role") == "user" else "Assistant"
        history_text += f"{role}: {h.get('content', '')}\n"

    return f"""You are a helpful Accounts assistant for Business Suite.
You answer questions using only the accounting data from the supplied context.
If the answer is not present in the supplied context, say that you do not have enough information and suggest checking the Accounts records.

Context:
{context_text}

Conversation history:
{history_text}

User: {message}

Answer briefly and clearly. If the user asks for a list, keep it concise.
Assistant:"""


def accounts_chatbot(message: str, history: List[Dict[str, Any]]) -> str:
    try:
        search_service = VectorSearchService()
        results = search_service.search_similar(message, limit=8)
        context_text = _build_context_text(results)
        prompt = _build_prompt(message, history, context_text)

        client = _get_client()
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You answer accounting questions based on the provided context."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=700,
        )
        text = response.choices[0].message.content or ""
        if text.strip():
            return text.strip()[:2000]
    except Exception as exc:
        logger.warning("Accounts chatbot failed: %s", exc)

    return (
        "I’m unable to answer that with the current Accounts knowledge base. "
        "Please check the Accounts records or try a more specific question."
    )
