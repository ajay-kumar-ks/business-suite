# Task Management Module — Implementation Plan

> **Your scope:** `backend/app/modules/tasks/` and `frontend/src/modules/tasks/`  
> **Stack:** FastAPI + SQLAlchemy (backend) · React 18 + Axios (frontend)  
> **Architecture:** Event bus for cross-module communication

---

## Overview

| Phase | Area | What you build |
|-------|------|----------------|
| 1 | Backend | Database model & Pydantic schemas |
| 2 | Backend | CRUD API endpoints |
| 3 | Backend | Overdue scheduler |
| 4 | Backend | Event bus wiring |
| 5 | Frontend | React components & API service |

---

## Phase 1 — Database Model & Schemas

### Files to create

| File | Purpose |
|------|---------|
| `tasks/db_models.py` | SQLAlchemy `Task` model |
| `tasks/schemas.py` | Pydantic request/response schemas + enums |

### Task model fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key, auto-generated |
| `title` | String | Required |
| `description` | Text | Optional |
| `assignee_id` | FK → auth_users | The employee assigned |
| `created_by` | FK → auth_users | Admin/manager who created it |
| `priority` | Enum | LOW, MEDIUM, HIGH, URGENT |
| `status` | Enum | TODO, ON_PROGRESS, ON_HOLD, ON_REVIEW, COMPLETED, OVERDUE |
| `reason_note` | Text | Nullable — filled when changing status |
| `due_date` | DateTime | Required |
| `created_at` | DateTime | Inherited from `BaseModel` mixin |
| `updated_at` | DateTime | Inherited from `BaseModel` mixin |

### Schemas to define (schemas.py)

- `Priority` enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `Status` enum: `TODO`, `ON_PROGRESS`, `ON_HOLD`, `ON_REVIEW`, `COMPLETED`, `OVERDUE`
- `TaskCreate` — fields required on creation
- `TaskUpdate` — all fields optional (for PATCH)
- `TaskResponse` — full task shape returned to the frontend

### Notes

- Import `Task` inside `init_db.py` so SQLAlchemy picks up the table on startup
- Inherit `created_at` / `updated_at` from the existing `BaseModel` mixin in `app/core/base.py`
- Run `seed_db.py` or `init_db.py` after adding the model to create the table

---

## Phase 2 — API Endpoints

### Files to create

| File | Purpose |
|------|---------|
| `tasks/routers.py` | Replace stub with full CRUD routes |
| `tasks/crud.py` | DB helper functions — keeps routers clean |

### Endpoints

| Method | Route | Who can call | Purpose |
|--------|-------|-------------|---------|
| `GET` | `/api/tasks/` | All | List tasks (filterable by status, priority, assignee) |
| `POST` | `/api/tasks/` | Admin / Manager | Create a new task |
| `GET` | `/api/tasks/{id}` | All | Fetch a single task |
| `PATCH` | `/api/tasks/{id}` | All (assignee + admin) | Update status, reason_note, or any field |
| `DELETE` | `/api/tasks/{id}` | Admin / Manager | Delete a task |

### crud.py functions

- `create_task(db, task_data, created_by)` → Task
- `get_tasks(db, filters)` → list[Task]
- `get_task(db, task_id)` → Task
- `update_task(db, task_id, update_data)` → Task
- `delete_task(db, task_id)` → None

### Notes

- Use `Depends(get_current_user)` from the existing auth module to protect every route
- Check `current_user.role` to enforce admin-only restrictions on POST and DELETE
- Fire the relevant event bus event after every DB write (see Phase 4)

---

## Phase 3 — Overdue Scheduler

### File to create

| File | Purpose |
|------|---------|
| `tasks/scheduler.py` | Background loop that detects and flags overdue tasks |

### Logic

```
every 60 seconds:
    query tasks where due_date < now AND status NOT IN (COMPLETED, OVERDUE)
    for each result:
        set status = OVERDUE
        publish task.overdue event to event bus
        (notification sent to frontend via this event)
```

### Wiring into main.py

Inside the existing `startup` lifecycle hook in `app/main.py`:

```python
import asyncio
from app.modules.tasks.scheduler import run_overdue_scheduler

@app.on_event("startup")
async def startup():
    # ... existing startup code ...
    asyncio.create_task(run_overdue_scheduler())
```

### Notes

- Use `asyncio.create_task()` — no extra libraries needed
- Keep the loop lightweight: one DB query per minute, bulk update, then publish events

---

## Phase 4 — Event Bus Wiring

The event bus singleton already exists at `app/core/event_bus.py`. Just import and use it.

### Events your module publishes

| Event name | When fired | Payload |
|------------|-----------|---------|
| `task.created` | After POST | `{ task_id, title, assignee_id, due_date }` |
| `task.status_changed` | After any PATCH that changes status | `{ task_id, old_status, new_status, reason_note }` |
| `task.completed` | Special case of status_changed when new status = COMPLETED | same as above |
| `task.overdue` | From scheduler loop | `{ task_id, assignee_id, due_date }` |

### Events your module listens for

| Event name | From | How you use it |
|------------|------|---------------|
| `hr.employee_list` | HR module | Populate the assignee dropdown in the frontend |

### Usage pattern

```python
from app.core.event_bus import event_bus

# Publish
event_bus.publish("task.created", { "task_id": str(task.id), "title": task.title })

# Subscribe
event_bus.subscribe("hr.employee_list", handle_employee_list)
```

---

## Phase 5 — Frontend Components

### Files to create / replace

| File | Purpose |
|------|---------|
| `tasks/services/taskApi.js` | All Axios calls for tasks — imports the existing `api.js` client |
| `tasks/pages/TasksPage.jsx` | Main page — composes all components |
| `tasks/components/TaskBoard.jsx` | 6-column Kanban board |
| `tasks/components/TaskCard.jsx` | Individual task card |
| `tasks/components/TaskModal.jsx` | Create / edit modal |
| `tasks/components/TaskFilters.jsx` | Filter bar (status, priority, assignee, search) |

### taskApi.js — functions to implement

```
getTasks(filters)       → GET /api/tasks/
createTask(data)        → POST /api/tasks/
getTask(id)             → GET /api/tasks/{id}
updateTask(id, data)    → PATCH /api/tasks/{id}
deleteTask(id)          → DELETE /api/tasks/{id}
```

Import `api` from `../../services/api.js` — Bearer token is auto-injected by the existing interceptor.

### TaskBoard.jsx — Kanban layout

6 columns, one per status (static order):

1. Todo
2. On Progress
3. On Hold
4. On Review
5. Completed
6. Overdue

### TaskCard.jsx — card content

- Task title (bold)
- Assignee avatar (reuse `Avatar` from `components/ui/`)
- Priority badge — color by priority:
  - LOW → green
  - MEDIUM → amber
  - HIGH → coral / orange
  - URGENT → red
- Due date
- Status badge
- Truncated `reason_note` snippet (if set)

### TaskModal.jsx — create / edit

All task fields plus a **contextual reason text box** whose label changes based on status:

| Status selected | Text box label |
|----------------|---------------|
| On Hold | Reason for hold |
| On Review | Review notes / rejection reason |
| Pending | Reason for pending |
| Overdue | (auto-set by system, read-only) |

Reuse `Button`, `Input`, `Card`, `Loader` from `components/ui/`.

### TaskFilters.jsx

- Dropdown: filter by status
- Dropdown: filter by priority
- Dropdown: filter by assignee (populated from `hr.employee_list` event)
- Text input: search by title

### Notification — Overdue alert

When a `task.overdue` event is received:

- Show a red dot / badge on the bell icon in `Navbar.jsx`
- Store overdue count in React context or local state inside `TasksPage`
- The Navbar bell icon already exists — just add the badge on top

### Build order for Phase 5

1. `taskApi.js`
2. `TaskCard.jsx`
3. `TaskBoard.jsx`
4. `TaskModal.jsx`
5. `TaskFilters.jsx`
6. Wire everything into `TasksPage.jsx`

---

## File Tree — Final State

```
backend/app/modules/tasks/
├── routers.py        ← replace stub with full CRUD + event publishing
├── db_models.py      ← new: SQLAlchemy Task model
├── schemas.py        ← new: Pydantic schemas + enums
├── crud.py           ← new: DB helper functions
└── scheduler.py      ← new: overdue detection loop

frontend/src/modules/tasks/
├── pages/
│   └── TasksPage.jsx          ← replace placeholder
└── components/
    ├── TaskBoard.jsx           ← replace placeholder
    ├── TaskCard.jsx            ← new
    ├── TaskModal.jsx           ← new
    └── TaskFilters.jsx         ← new

frontend/src/modules/tasks/services/
└── taskApi.js                  ← new
```

---

## Cross-Module Boundaries

You only touch files inside your two folders above. Everything else is read-only for you:

| What you need | Where it lives | How you use it |
|--------------|---------------|---------------|
| JWT auth / current user | `auth/utils.py` | `Depends(get_current_user)` in routers |
| Event bus | `core/event_bus.py` | Import the singleton, call `.publish()` / `.subscribe()` |
| Axios client | `services/api.js` | Import in `taskApi.js` |
| UI primitives | `components/ui/` | Import `Button`, `Card`, `Input`, `Avatar`, `Loader` |
| Base DB model | `core/base.py` | Inherit in `db_models.py` |

---

## Implementation Checklist

> **Legend:** `⬜` = Not started · `🔄` = In progress · `✅` = Completed  

### Backend

| # | Task | Status |
|---|------|--------|
| 1 | Create `db_models.py` with `Task` model and enums | ✅ |
| 2 | Create `schemas.py` with `TaskCreate`, `TaskUpdate`, `TaskResponse` | ✅ |
| 3 | Add Task import to `init_db.py`, run to create table | ✅ |
| 4 | Create `crud.py` with all DB helpers | ✅ |
| 5 | Replace `routers.py` stub with full CRUD + auth checks | ✅ |
| 6 | Create `scheduler.py` with overdue detection loop | ✅ |
| 7 | Register scheduler in `main.py` startup hook | ✅ |
| 8 | Add event bus publish calls in routers and scheduler | ✅ |
| 9 | Add event bus subscribe for `hr.employee_list` | ✅ |

### Frontend

| # | Task | Status |
|---|------|--------|
| 1 | Create `taskApi.js` with all API calls | ✅ |
| 2 | Build `TaskCard.jsx` with priority badges and status colors | ✅ |
| 3 | Build `TaskBoard.jsx` with 6 Kanban columns | ✅ |
| 4 | Build `TaskModal.jsx` with contextual reason text box | ✅ |
| 5 | Build `TaskFilters.jsx` with status/priority/assignee filters | ✅ |
| 6 | Wire all components into `TasksPage.jsx` | ✅ |
| 7 | Add overdue notification badge to Navbar bell icon | ✅ |
