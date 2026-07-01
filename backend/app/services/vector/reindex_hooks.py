import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import event
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.modules.crm.db_models import Activity, Client, Contact, Lead, Phase, Pipeline, PipelineAssignment
from app.modules.hr.db_models import Attendance, Department, Employee, LeaveRequest, Role
from app.modules.tasks.db_models import SubTask, Task, TaskActivity, TaskComment, TaskDependency, TaskNotification
from app.services.vector.chunking import chunk_document
from app.services.vector.embedding_service import EmbeddingService
from app.services.vector.search_service import VectorSearchService

ORGANIZATION_ID = os.getenv("ORGANIZATION_ID", "00000000-0000-0000-0000-000000000000")

REINDEXABLE_MODELS = {
    Contact: ("crm_contact", "contacts"),
    Activity: ("crm_activity", "activities"),
    Lead: ("crm_lead", "leads"),
    Client: ("crm_client", "clients"),
    Pipeline: ("crm_pipeline", "pipelines"),
    Phase: ("crm_phase", "phases"),
    PipelineAssignment: ("crm_pipeline_assignment", "pipeline_assignments"),
    Role: ("hr_role", "roles"),
    Department: ("hr_department", "departments"),
    Employee: ("hr_employee", "employees"),
    Attendance: ("hr_attendance", "attendance"),
    LeaveRequest: ("hr_leave_request", "leave_requests"),
    Task: ("task_task", "tasks"),
    TaskComment: ("task_comment", "task_comments"),
    TaskActivity: ("task_activity", "task_activities"),
    SubTask: ("task_subtask", "sub_tasks"),
    TaskDependency: ("task_dependency", "task_dependencies"),
    TaskNotification: ("task_notification", "task_notifications"),
}


def _normalize_uuid(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, uuid.UUID):
        return str(value)
    try:
        return str(uuid.UUID(str(value)))
    except Exception:
        return str(value)


def _make_chunk_id(entity_type: str, entity_id: Optional[str], source_table: str, chunk_index: int) -> str:
    base = f"{entity_type}:{entity_id or 'unknown'}:{source_table}:{chunk_index}"
    return str(uuid.uuid5(uuid.NAMESPACE_URL, base))


def _build_content(obj: Any) -> str:
    if isinstance(obj, Contact):
        parts = [
            f"Name: {obj.name or ''}",
            f"Email: {obj.email or ''}",
            f"Phone: {obj.phone or ''}",
            f"Company: {obj.company or ''}",
            f"Job Title: {obj.job_title or ''}",
            f"Address: {obj.address or ''}",
            f"Notes: {obj.notes or ''}",
            f"Status: {obj.status or ''}",
            f"Source: {obj.source or ''}",
        ]
        return "\n".join(part for part in parts if part.split(":", 1)[1].strip())

    if isinstance(obj, Activity):
        parts = [
            f"Activity Type: {obj.activity_type or ''}",
            f"Title: {obj.title or ''}",
            f"Description: {obj.description or ''}",
            f"Follow Up Date: {obj.follow_up_date or ''}",
        ]
        return "\n".join(part for part in parts if part.split(":", 1)[1].strip())

    if isinstance(obj, Lead):
        parts = [
            f"Title: {obj.title or ''}",
            f"Value: {obj.value or ''}",
            f"Expected Close Date: {obj.expected_close_date or ''}",
            f"Assignee: {obj.assignee or ''}",
            f"Source: {obj.source or ''}",
            f"Notes: {obj.notes or ''}",
        ]
        return "\n".join(part for part in parts if part.split(":", 1)[1].strip())

    if isinstance(obj, Client):
        parts = [
            f"Status: {obj.status or ''}",
            f"Tier: {obj.tier or ''}",
            f"Account Manager: {obj.account_manager or ''}",
            f"Renewal Date: {obj.renewal_date or ''}",
            f"Subscription Value: {obj.subscription_value or ''}",
            f"Pinned Notes: {obj.pinned_notes or ''}",
        ]
        return "\n".join(part for part in parts if part.split(":", 1)[1].strip())

    if isinstance(obj, Pipeline):
        parts = [f"Name: {obj.name or ''}", f"Description: {obj.description or ''}", f"Owner: {obj.owner or ''}"]
        return "\n".join(part for part in parts if part.split(":", 1)[1].strip())

    if isinstance(obj, Phase):
        parts = [f"Name: {obj.name or ''}", f"Creates Client: {obj.creates_client or ''}", f"Position: {obj.position or ''}"]
        return "\n".join(part for part in parts if part.split(":", 1)[1].strip())

    if isinstance(obj, PipelineAssignment):
        return f"Pipeline Assignment Config: {obj.departments_config or ''}"

    if isinstance(obj, Department):
        return f"Department: {obj.name or ''}\nDescription: {obj.description or ''}"

    if isinstance(obj, Role):
        return f"Role: {obj.name or ''}\nDescription: {obj.description or ''}"

    if isinstance(obj, Employee):
        parts = [
            f"Employee: {obj.full_name or ''}",
            f"Email: {obj.email or ''}",
            f"Phone: {obj.phone or ''}",
            f"Code: {obj.employee_code or ''}",
            f"Status: {obj.status or ''}",
            f"Department: {getattr(obj.department, 'name', '') or ''}",
        ]
        return "\n".join(part for part in parts if part.split(":", 1)[1].strip())

    if isinstance(obj, Attendance):
        return f"Attendance Date: {obj.date or ''}\nStatus: {obj.status or ''}"

    if isinstance(obj, LeaveRequest):
        return f"Leave Type: {obj.leave_type or ''}\nStatus: {obj.status or ''}\nReason: {obj.reason or ''}"

    if isinstance(obj, Task):
        parts = [
            f"Task: {obj.title or ''}",
            f"Description: {obj.description or ''}",
            f"Status: {obj.status or ''}",
            f"Priority: {obj.priority or ''}",
            f"Due Date: {obj.due_date or ''}",
            f"Reason: {obj.reason_note or ''}",
        ]
        return "\n".join(part for part in parts if part.split(":", 1)[1].strip())

    if isinstance(obj, (TaskComment, TaskActivity, SubTask, TaskDependency, TaskNotification)):
        return f"Task-related update: {getattr(obj, 'id', '')}"

    if isinstance(obj, Expense):
        return f"Expense: {obj.description or ''}\nAmount: {obj.amount or ''}\nDate: {obj.expense_date or ''}\nStatus: {obj.status or ''}"

    if isinstance(obj, Income):
        return f"Income: {obj.description or ''}\nAmount: {obj.amount or ''}\nDate: {obj.income_date or ''}\nStatus: {obj.status or ''}"

    return ""


def _entity_metadata(obj: Any) -> Dict[str, Any]:
    if isinstance(obj, Contact):
        return {"contact_name": obj.name, "company": obj.company, "status": obj.status}
    if isinstance(obj, Lead):
        return {"assignee": obj.assignee, "pipeline_id": obj.pipeline_id, "phase_id": obj.phase_id}
    if isinstance(obj, Employee):
        return {"employee_code": obj.employee_code, "department_id": obj.department_id, "status": str(obj.status)}
    if isinstance(obj, Task):
        return {"task_title": obj.title, "status": str(obj.status), "priority": str(obj.priority)}
    if isinstance(obj, Expense):
        return {"account_id": obj.account_id, "journal_id": obj.journal_id, "status": obj.status}
    if isinstance(obj, Income):
        return {"account_id": obj.account_id, "journal_id": obj.journal_id, "status": obj.status}
    return {}


def _entity_type_for_object(obj: Any) -> Optional[Tuple[str, str]]:
    for model_cls, (entity_type, source_table) in REINDEXABLE_MODELS.items():
        if isinstance(obj, model_cls):
            return entity_type, source_table
    return None


def _collect_targets(session: Session) -> List[Tuple[Any, str]]:
    targets: List[Tuple[Any, str]] = []
    for obj in list(session.new):
        entry = _entity_type_for_object(obj)
        if entry:
            targets.append((obj, "insert"))
    for obj in list(session.dirty):
        entry = _entity_type_for_object(obj)
        if entry:
            targets.append((obj, "update"))
    for obj in list(session.deleted):
        entry = _entity_type_for_object(obj)
        if entry:
            targets.append((obj, "delete"))
    return targets


def reindex_object(obj: Any, operation: str) -> None:
    entity_info = _entity_type_for_object(obj)
    if not entity_info:
        return
    entity_type, source_table = entity_info
    entity_id = _normalize_uuid(getattr(obj, "id", None))
    if operation == "delete":
        VectorSearchService(session_factory=SessionLocal).delete_embeddings(entity_type, entity_id or "", organization_id=ORGANIZATION_ID)
        return

    content = _build_content(obj)
    if not content:
        return

    chunks = chunk_document(content, max_tokens=700, overlap_tokens=100)
    if not chunks:
        return

    embedding_service = EmbeddingService()
    embeddings = embedding_service.embed_texts(chunks)
    rows = []
    for idx, chunk in enumerate(chunks):
        rows.append(
            {
                "id": _make_chunk_id(entity_type, entity_id, source_table, idx),
                "organization_id": ORGANIZATION_ID,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "source_table": source_table,
                "source_field": "content",
                "chunk_index": idx,
                "chunk_type": "semantic",
                "content": chunk,
                "metadata": {**_entity_metadata(obj), "embedding_model": "text-embedding-3-small"},
                "embedding": embeddings[idx],
            }
        )
    VectorSearchService(session_factory=SessionLocal).store_embeddings(rows)


def register_vector_reindex_hooks() -> None:
    if getattr(register_vector_reindex_hooks, "_registered", False):
        return

    @event.listens_for(Session, "before_commit")
    def before_commit(session: Session) -> None:
        session.info["vector_reindex_targets"] = _collect_targets(session)

    @event.listens_for(Session, "after_commit")
    def after_commit(session: Session) -> None:
        targets = session.info.pop("vector_reindex_targets", [])
        for obj, operation in targets:
            try:
                reindex_object(obj, operation)
            except Exception as exc:
                print(f"[WARN] Vector reindex failed for {type(obj).__name__}: {exc}")

    @event.listens_for(Session, "after_rollback")
    def after_rollback(session: Session) -> None:
        session.info.pop("vector_reindex_targets", None)

    register_vector_reindex_hooks._registered = True
