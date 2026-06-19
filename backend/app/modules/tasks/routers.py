import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.event_bus import event_bus
from app.modules.auth.models import User
from app.modules.auth.routers import get_current_user
from app.modules.tasks.crud import create_task, get_tasks, get_task, update_task, delete_task
from app.modules.tasks.schemas import TaskCreate, TaskUpdate, TaskResponse, Priority, Status
from app.modules.tasks.event_handlers import get_employees

router = APIRouter()


@router.get("/employees", response_model=list[dict])
async def list_employees(
    current_user: User = Depends(get_current_user),
):
    """Return the cached list of employees for the assignee dropdown."""
    return get_employees()


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    status_filter: Optional[Status] = Query(None, alias="status"),
    priority: Optional[Priority] = Query(None),
    assignee_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all tasks, optionally filtered by status, priority, assignee, or title search."""
    tasks = get_tasks(
        db,
        status=status_filter,
        priority=priority,
        assignee_id=assignee_id,
        search=search,
    )
    return tasks


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_new_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new task. Admin/manager only."""
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
    """Fetch a single task by ID."""
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task_by_id(
    task_id: uuid.UUID,
    update_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a task. Assignee and admins can update."""
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Only the assignee or an admin can update
    if task.assignee_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assignee or an admin can update this task",
        )

    # Require proof_attachment when changing status
    if update_data.status is not None and update_data.status != task.status:
        if not update_data.proof_attachment or not update_data.proof_attachment.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Proof attachment is required to change task status",
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

        # Special case: completed
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
