import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.event_bus import event_bus
from app.modules.auth.models import User
from app.modules.auth.routers import get_current_user
from app.modules.tasks.crud import create_task, get_tasks, get_task, update_task, delete_task
from app.modules.tasks.schemas import TaskCreate, TaskUpdate, TaskResponse, Priority, Status

# Define the status progression order (higher = later in workflow)
STATUS_ORDER = {
    Status.TODO: 0,
    Status.ON_PROGRESS: 1,
    Status.ON_HOLD: 2,
    Status.ON_REVIEW: 3,
    Status.COMPLETED: 4,
    Status.OVERDUE: 5,
}

router = APIRouter()


def _get_employee_by_user_id(db: Session, user_id: int):
    """Look up an employee record by the auth user's ID."""
    try:
        from app.modules.hr.db_models import Employee
        return db.query(Employee).filter(Employee.user_id == user_id).first()
    except Exception:
        return None


def _get_employee_id(db: Session, current_user: User) -> Optional[int]:
    """Get the employee ID for the current user, if they have an employee record."""
    employee = _get_employee_by_user_id(db, current_user.id)
    return employee.id if employee else None


# ──────────────────────────────────────────────
# Employees — fetch from HR module for assignee dropdown
# ──────────────────────────────────────────────


@router.get("/employees", response_model=list[dict])
async def list_employees(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return employees from the HR module for the assignee dropdown.

    Queries the HR employees table directly, joining with users and departments.
    All authenticated users can access this (for dropdown rendering).
    """
    try:
        from app.modules.hr.db_models import Employee, EmployeeStatus
        from app.modules.auth.db_models import User as UserDB

        query = (
            db.query(Employee)
            .join(UserDB, Employee.user_id == UserDB.id)
            .options(joinedload(Employee.user), joinedload(Employee.department), joinedload(Employee.role))
            .filter(Employee.status == EmployeeStatus.ACTIVE)
        )

        if search:
            query = query.filter(
                UserDB.full_name.ilike(f"%{search}%")
            )

        employees = query.order_by(UserDB.full_name).all()

        return [
            {
                "id": emp.id,
                "user_id": emp.user_id,
                "employee_code": emp.employee_code,
                "name": emp.user.full_name if emp.user else None,
                "email": emp.user.email if emp.user else None,
                "department": emp.department.name if emp.department else None,
                "department_id": emp.department_id,
                "designation": emp.role.name if emp.role else None,
                "role_id": emp.role_id,
                "status": emp.status.value if emp.status else None,
            }
            for emp in employees
        ]
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(
            "Failed to query HR employees table, falling back to event-bus cache: %s", e
        )
        # Fall back to the deprecated event-bus cache if HR tables don't exist
        from app.modules.tasks.event_handlers import get_employees as get_cached_employees
        return get_cached_employees()


# ──────────────────────────────────────────────
# Task CRUD
# ──────────────────────────────────────────────


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    status_filter: Optional[Status] = Query(None, alias="status"),
    priority: Optional[Priority] = Query(None),
    assignee_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List tasks.

    Admins see all tasks (with optional filters).
    Non-admin employees see only tasks assigned to them.
    """
    # Auto-filter for non-admin users
    employee_id = None
    if not current_user.is_admin:
        employee_id = _get_employee_id(db, current_user)
        if employee_id is None:
            # User has no employee record — return empty
            return []

    tasks = get_tasks(
        db,
        status=status_filter,
        priority=priority,
        assignee_id=assignee_id,
        search=search,
        employee_id=employee_id,
    )
    return tasks


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_new_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new task. Admin only."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create tasks",
        )

    task = create_task(db, task_data, created_by=current_user.id)

    event_bus.publish("task.created", {
        "task_id": str(task.id),
        "title": task.title,
        "assignee_id": task.assignee_id,
        "due_date": task.due_date.isoformat(),
    })

    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task_by_id(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch a single task by ID.

    Employees can only access tasks assigned to them.
    """
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Non-admin users can only view their own tasks
    if not current_user.is_admin:
        employee_id = _get_employee_id(db, current_user)
        if employee_id is None or task.assignee_id != employee_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view tasks assigned to you",
            )

    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task_by_id(
    task_id: uuid.UUID,
    update_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a task.

    Admins can update any field.
    Assignee employees can only update status, reason_note, and proof_attachment.
    """
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Permission checks
    employee_id = _get_employee_id(db, current_user)
    is_assignee = employee_id is not None and task.assignee_id == employee_id

    if not current_user.is_admin and not is_assignee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assignee or an admin can update this task",
        )

    # Non-admin employees can only change status, reason_note, and proof_attachment
    if not current_user.is_admin:
        allowed_fields = {"status", "reason_note", "proof_attachment"}
        update_fields = set(update_data.model_dump(exclude_unset=True).keys())
        disallowed = update_fields - allowed_fields
        if disallowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Employees can only update status, reason_note, and proof_attachment. Cannot update: {', '.join(sorted(disallowed))}",
            )

    # Validate status transitions
    if update_data.status is not None and update_data.status != task.status:
        current_order = STATUS_ORDER.get(task.status, -1)
        new_order = STATUS_ORDER.get(update_data.status, -1)

        # Allowed transitions that go backward:
        #   OVERDUE  → ON_REVIEW    (overdue task completed, send for review)
        #   ON_HOLD  → ON_PROGRESS  (resume a held task)
        is_allowed_backward = (
            (task.status == Status.OVERDUE and update_data.status == Status.ON_REVIEW)
            or (task.status == Status.ON_HOLD and update_data.status == Status.ON_PROGRESS)
        )

        if new_order <= current_order and not is_allowed_backward:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot move from {task.status.value} back to {update_data.status.value}. Status can only move forward.",
            )

    # Cannot manually set to OVERDUE (only the auto-scheduler can)
    if update_data.status is not None and update_data.status == Status.OVERDUE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Overdue status is automatically assigned by the system when a task's deadline passes.",
        )

    # Require proof_attachment only when moving to COMPLETED
    if update_data.status is not None and update_data.status == Status.COMPLETED:
        if not update_data.proof_attachment or not update_data.proof_attachment.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Proof attachment is required when marking a task as completed",
            )

    old_status = task.status
    updated = update_task(db, task_id, update_data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Publish status change event if status changed
    if update_data.status is not None and update_data.status != old_status:
        event_bus.publish("task.status_changed", {
            "task_id": str(task_id),
            "old_status": old_status.value,
            "new_status": update_data.status.value,
            "reason_note": update_data.reason_note,
        })

        if update_data.status == Status.COMPLETED:
            event_bus.publish("task.completed", {
                "task_id": str(task_id),
                "assignee_id": task.assignee_id,
            })

    return updated


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_by_id(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a task. Admin only."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete tasks",
        )

    deleted = delete_task(db, task_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
