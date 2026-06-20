import uuid
from enum import Enum
from sqlalchemy import Column, String, Text, Integer, DateTime, Enum as SqlEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.base import BaseModel


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


class Task(BaseModel):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assignee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("auth_users.id"), nullable=False)
    priority = Column(SqlEnum(Priority), nullable=False, default=Priority.MEDIUM)
    status = Column(SqlEnum(Status), nullable=False, default=Status.TODO)
    reason_note = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=False)
    proof_attachment = Column(Text, nullable=True)

    def __repr__(self):
        return f"<Task(id={self.id}, title={self.title}, status={self.status}, priority={self.priority})>"
