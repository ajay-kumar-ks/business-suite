import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.modules.tasks.db_models import Task, Priority, Status
from app.modules.tasks.schemas import TaskCreate, TaskUpdate


def create_task(db: Session, task_data: TaskCreate, created_by: int) -> Task:
    """Create a new task and return it."""
    task = Task(
        title=task_data.title,
        description=task_data.description,
        assignee_id=task_data.assignee_id,
        created_by=created_by,
        priority=task_data.priority,
        status=task_data.status,
        reason_note=task_data.reason_note,
        due_date=task_data.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def get_tasks(
    db: Session,
    status: Optional[Status] = None,
    priority: Optional[Priority] = None,
    assignee_id: Optional[int] = None,
    search: Optional[str] = None,
) -> list[Task]:
    """List tasks with optional filters."""
    query = db.query(Task)

    if status is not None:
        query = query.filter(Task.status == status)
    if priority is not None:
        query = query.filter(Task.priority == priority)
    if assignee_id is not None:
        query = query.filter(Task.assignee_id == assignee_id)
    if search:
        query = query.filter(Task.title.ilike(f"%{search}%"))

    return query.order_by(Task.due_date.asc()).all()


def get_task(db: Session, task_id: uuid.UUID) -> Optional[Task]:
    """Fetch a single task by ID."""
    return db.query(Task).filter(Task.id == task_id).first()


def update_task(db: Session, task_id: uuid.UUID, update_data: TaskUpdate) -> Optional[Task]:
    """Update a task with partial data and return it. Returns None if not found."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return None

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: uuid.UUID) -> bool:
    """Delete a task by ID. Returns True if deleted, False if not found."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return False
    db.delete(task)
    db.commit()
    return True
