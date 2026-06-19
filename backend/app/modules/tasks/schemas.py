import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class Priority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class Status(str, Enum):
    TODO = "TODO"
    ON_PROGRESS = "ON_PROGRESS"
    ON_HOLD = "ON_HOLD"
    ON_REVIEW = "ON_REVIEW"
    COMPLETED = "COMPLETED"
    OVERDUE = "OVERDUE"


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    priority: Priority = Priority.MEDIUM
    status: Status = Status.TODO
    reason_note: Optional[str] = None
    due_date: datetime
    proof_attachment: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    priority: Optional[Priority] = None
    status: Optional[Status] = None
    reason_note: Optional[str] = None
    due_date: Optional[datetime] = None
    proof_attachment: Optional[str] = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    created_by: int
    priority: Priority
    status: Status
    reason_note: Optional[str] = None
    proof_attachment: Optional[str] = None
    due_date: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
