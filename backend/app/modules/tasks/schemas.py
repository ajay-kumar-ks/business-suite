import uuid
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, model_validator
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

    @model_validator(mode='after')
    def set_overdue_if_past_due(cls, values):
        if values.due_date < datetime.now(timezone.utc):
            values.status = Status.OVERDUE
        return values


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

    # Employee details (populated at query time)
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    assignee_department: Optional[str] = None
    assignee_designation: Optional[str] = None

    model_config = {"from_attributes": True}
