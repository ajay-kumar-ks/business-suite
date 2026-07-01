import re
from typing import List


def chunk_document(text: str, max_tokens: int = 700, overlap_tokens: int = 100) -> List[str]:
    """Create semantic-ish chunks from markdown-like text without splitting mid-sentence."""
    if not text or not text.strip():
        return []

    normalized = text.replace("\r\n", "\n").strip()
    blocks = re.split(r"\n\s*\n+", normalized)
    chunks: List[str] = []
    current: List[str] = []
    current_tokens = 0

    for block in blocks:
        if not block.strip():
            continue

        block = block.strip()
        if re.match(r"^(#|##|###|[-*+]\s|\d+\.\s)", block):
            if current:
                chunks.append("\n\n".join(current).strip())
                current = []
                current_tokens = 0
            current.append(block)
            current_tokens += len(block.split())
            continue

        block_tokens = len(block.split())
        if current and current_tokens + block_tokens > max_tokens:
            chunks.append("\n\n".join(current).strip())
            current = [block]
            current_tokens = block_tokens
        else:
            current.append(block)
            current_tokens += block_tokens

    if current:
        chunks.append("\n\n".join(current).strip())

    if overlap_tokens > 0 and len(chunks) > 1:
        overlapped: List[str] = []
        for idx, chunk in enumerate(chunks):
            if idx == 0:
                overlapped.append(chunk)
                continue
            prev_chunk = chunks[idx - 1]
            prev_tail = " ".join(prev_chunk.split()[-overlap_tokens:])
            overlapped.append(f"{prev_tail} {chunk}".strip())
        return overlapped

    return chunks
