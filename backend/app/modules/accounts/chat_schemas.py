from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class AccountsChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class AccountsChatResponse(BaseModel):
    reply: str
