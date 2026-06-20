import uuid
import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.modules.tasks.db_models import Task, Priority, Status
from app.modules.tasks.schemas import TaskCreate, TaskUpdate

logger = logging.getLogger(__name__)


def _enrich_tasks_with_employees(db: Session, tasks: list[Task]) -> list[Task]:
    """Batch-load employee details for a list of tasks to avoid N+1 queries.

    Collects all unique assignee_ids, queries the HR employees table once,
    and attaches the details to each task.
    """
    # Collect unique assignee IDs
    assignee_ids = list({t.assignee_id for t in tasks if t.assignee_id is not None})
    if not assignee_ids:
        return tasks

    try:
        from app.modules.hr.db_models import Employee
        from app.modules.auth.db_models import User as UserDB
        from sqlalchemy.orm import joinedload

        employees = (
            db.query(Employee)
            .options(joinedload(Employee.user), joinedload(Employee.department), joinedload(Employee.role))
            .filter(Employee.id.in_(assignee_ids))
            .all()
        )

        # Build lookup: employee_id -> (name, email, department, designation)
        lookup = {}
        for emp in employees:
            lookup[emp.id] = (
                emp.user.full_name if emp.user else None,
                emp.user.email if emp.user else None,
                emp.department.name if emp.department else None,
                emp.role.name if emp.role else None,
            )

        # Attach to each task
        for task in tasks:
            if task.assignee_id in lookup:
                task.assignee_name, task.assignee_email, task.assignee_department, task.assignee_designation = lookup[task.assignee_id]
            else:
                task.assignee_name = task.assignee_email = task.assignee_department = task.assignee_designation = None
    except Exception as e:
        logger.warning("Failed to enrich tasks with employee data: %s", e)

    return tasks


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
        proof_attachment=task_data.proof_attachment,
        due_date=task_data.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    results = _enrich_tasks_with_employees(db, [task])
    return results[0] if results else task


def get_tasks(
    db: Session,
    status: Optional[Status] = None,
    priority: Optional[Priority] = None,
    assignee_id: Optional[int] = None,
    search: Optional[str] = None,
    employee_id: Optional[int] = None,
) -> list[Task]:
    """List tasks with optional filters.

    If employee_id is provided, only tasks assigned to that employee are returned.
    """
    query = db.query(Task)

    if status is not None:
        query = query.filter(Task.status == status)
    if priority is not None:
        query = query.filter(Task.priority == priority)
    if assignee_id is not None:
        query = query.filter(Task.assignee_id == assignee_id)
    if employee_id is not None:
        query = query.filter(Task.assignee_id == employee_id)
    if search:
        query = query.filter(Task.title.ilike(f"%{search}%"))

    tasks = query.order_by(Task.due_date.asc()).all()
    return _enrich_tasks_with_employees(db, tasks)


def get_task(db: Session, task_id: uuid.UUID) -> Optional[Task]:
    """Fetch a single task by ID."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if task:
        results = _enrich_tasks_with_employees(db, [task])
        return results[0] if results else task
    return task


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
    results = _enrich_tasks_with_employees(db, [task])
    return results[0] if results else task


def delete_task(db: Session, task_id: uuid.UUID) -> bool:
    """Delete a task by ID. Returns True if deleted, False if not found."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return False
    db.delete(task)
    db.commit()
    return True
