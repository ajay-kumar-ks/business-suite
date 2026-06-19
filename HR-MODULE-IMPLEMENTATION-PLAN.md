# HR Module — Implementation Plan

## Project Context

This project is a Business Suite application built using:

### Backend

- FastAPI
- SQLAlchemy
- PostgreSQL (Nile)
- JWT Authentication
- Event Bus Architecture

### Frontend

- React 18
- Vite
- Axios
- Existing Dashboard Layout and Sidebar

### Existing Modules

| Module   | Status       |
|----------|-------------|
| Auth     | ✅ Complete |
| CRM      | ✅ Complete (teammate) |
| Tasks    | ✅ Complete (teammate) |
| Accounts | ✅ Complete (teammate) |
| **HR**   | ⏳ **In Progress (you)** |

The authentication system already exists and uses:

```python
auth_users
├── id
├── username
├── email
├── full_name
├── hashed_password
├── disabled
└── is_admin
```

> ⚠️ Do NOT redesign the authentication system.

The HR module must extend the system using separate HR tables and integrate with existing authentication.

---

## Goal

Build a complete HR Management Module that allows:

- Employee Management
- Role Tag Management
- Department Management
- Attendance Tracking
- Leave Management
- HR Dashboard
- Event Bus integration for employee assignment in other modules

---

## 🟦 Phase 1 — Employee Management (Highest Priority)

> **Backend + Frontend:** Implement employee CRUD with database models, API endpoints, and UI table/modal.

### Employee Table Schema

```text
employees
├── id             (PK, Integer)
├── user_id        (FK → auth_users.id)
├── employee_code  (String, unique)
├── phone          (String)
├── department_id  (FK → departments.id, nullable)
├── role_id        (FK → roles.id, nullable)
├── joining_date   (Date)
├── salary         (Float)
├── status         (Enum: Active / Inactive / Resigned)
├── created_at     (auto)
└── updated_at     (auto)
```

### Employee API Endpoints

| Method | Endpoint                  | Description        |
|--------|---------------------------|--------------------|
| POST   | `/api/hr/employees`       | Create employee    |
| GET    | `/api/hr/employees`       | List all employees |
| GET    | `/api/hr/employees/{id}`  | Get single employee|
| PUT    | `/api/hr/employees/{id}`  | Update employee    |
| DELETE | `/api/hr/employees/{id}`  | Delete employee    |

### Employee Table UI Columns

| Column         | Description                   |
|----------------|-------------------------------|
| Employee Code  | Unique employee identifier    |
| Name           | Linked auth user full name    |
| Department     | Assigned department           |
| Role           | Assigned role tag             |
| Phone          | Contact number                |
| Status         | Active / Inactive / Resigned  |

**Actions:** View • Edit • Delete

---

### 1.1 — Backend: Database Model

- [ ] Create `backend/app/modules/hr/db_models.py`
  - [ ] Define `Employee` model with all columns listed above
  - [ ] Define foreign keys to `auth_users`, and forward refs to `departments` & `roles`
  - [ ] Import `BaseModel` from `app.core.base`
  - [ ] Set `__tablename__ = "employees"`

### 1.2 — Backend: Pydantic Schemas

- [ ] Create `backend/app/modules/hr/schemas.py`
  - [ ] `EmployeeCreate` — fields: user_id, employee_code, phone, department_id, role_id, joining_date, salary, status
  - [ ] `EmployeeUpdate` — all fields optional
  - [ ] `EmployeeResponse` — includes id, created_at, updated_at
  - [ ] `EmployeeListResponse` — wrapper with list of employees + total count

### 1.3 — Backend: CRUD Operations

- [ ] Create `backend/app/modules/hr/crud.py`
  - [ ] `get_employees(db)` — list all with pagination
  - [ ] `get_employee(db, employee_id)` — get single
  - [ ] `create_employee(db, data)` — create with unique employee_code check
  - [ ] `update_employee(db, employee_id, data)` — update fields
  - [ ] `delete_employee(db, employee_id)` — soft or hard delete

### 1.4 — Backend: Business Logic / Services

- [ ] Create `backend/app/modules/hr/services.py`
  - [ ] Generate unique `employee_code` on creation (e.g., `EMP001`, `EMP002`)
  - [ ] Validate auth user exists before linking
  - [ ] Format response data (join user full_name)

### 1.5 — Backend: API Routes

- [ ] Update `backend/app/modules/hr/routers.py`
  - [ ] `POST /api/hr/employees` — create employee
  - [ ] `GET /api/hr/employees` — list employees (with optional status filter)
  - [ ] `GET /api/hr/employees/{id}` — get employee details (include user name, dept, role)
  - [ ] `PUT /api/hr/employees/{id}` — update employee
  - [ ] `DELETE /api/hr/employees/{id}` — delete employee
  - [ ] Add auth dependency (`get_current_user`) to all endpoints

### 1.6 — Frontend: API Service

- [ ] Create `frontend/src/modules/hr/services/hrApi.js`
  - [ ] `getEmployees()` — GET `/api/hr/employees`
  - [ ] `getEmployee(id)` — GET `/api/hr/employees/{id}`
  - [ ] `createEmployee(data)` — POST `/api/hr/employees`
  - [ ] `updateEmployee(id, data)` — PUT `/api/hr/employees/{id}`
  - [ ] `deleteEmployee(id)` — DELETE `/api/hr/employees/{id}`

### 1.7 — Frontend: Employee Table Component

- [ ] Create `frontend/src/modules/hr/components/EmployeeTable.jsx`
  - [ ] Display columns: Employee Code, Name, Department, Role, Phone, Status
  - [ ] Status badge with color coding (Active=green, Inactive=gray, Resigned=red)
  - [ ] Action buttons: View, Edit, Delete per row
  - [ ] Loading spinner / empty state handling

### 1.8 — Frontend: Employee Modal (Create/Edit)

- [ ] Create `frontend/src/modules/hr/components/EmployeeModal.jsx`
  - [ ] Form fields: user selection (dropdown), employee_code, phone, department (dropdown), role (dropdown), joining_date, salary, status
  - [ ] Validation on required fields
  - [ ] Create mode vs Edit mode

### 1.9 — Frontend: Integrate into HRPage

- [ ] Update `frontend/src/modules/hr/pages/HRPage.jsx`
  - [ ] Render `EmployeeTable` component
  - [ ] Add "Add Employee" button
  - [ ] Wire up modal open/close state
  - [ ] Handle create, update, delete actions with API calls + refresh
  - [ ] Remove existing placeholder content

---

## 🟩 Phase 2 — Role Tag Management

> **Backend + Frontend:** Implement role CRUD (tags/categories for employees).

### Role Table Schema

```text
roles
├── id          (PK, Integer)
├── name        (String, unique)
├── description (Text, nullable)
├── created_at  (auto)
└── updated_at  (auto)
```

**Example Roles:** HR Manager • HR Executive • Team Lead • Developer • Tester • Designer • CRM Executive • Accountant • Intern

### Role API Endpoints

| Method | Endpoint               | Description      |
|--------|------------------------|------------------|
| POST   | `/api/hr/roles`        | Create role      |
| GET    | `/api/hr/roles`        | List all roles   |
| PUT    | `/api/hr/roles/{id}`   | Update role      |
| DELETE | `/api/hr/roles/{id}`   | Delete role      |

---

### 2.1 — Backend: Database Model

- [ ] Add `Role` model to `backend/app/modules/hr/db_models.py`
  - [ ] Columns: id, name (unique), description, created_at, updated_at
  - [ ] Set `__tablename__ = "roles"`

### 2.2 — Backend: Schemas

- [ ] Add role schemas to `backend/app/modules/hr/schemas.py`
  - [ ] `RoleCreate`, `RoleUpdate`, `RoleResponse`

### 2.3 — Backend: CRUD

- [ ] Add role CRUD to `backend/app/modules/hr/crud.py`
  - [ ] `get_roles(db)`, `create_role(db, data)`, `update_role(db, id, data)`, `delete_role(db, id)`

### 2.4 — Backend: API Routes

- [ ] Add role routes to `backend/app/modules/hr/routers.py`
  - [ ] `POST /api/hr/roles`, `GET /api/hr/roles`, `PUT /api/hr/roles/{id}`, `DELETE /api/hr/roles/{id}`

### 2.5 — Frontend: API Service

- [ ] Add role API methods to `frontend/src/modules/hr/services/hrApi.js`
  - [ ] `getRoles()`, `createRole(data)`, `updateRole(id, data)`, `deleteRole(id)`

### 2.6 — Frontend: RoleTable Component

- [ ] Create `frontend/src/modules/hr/components/RoleTable.jsx`
  - [ ] Table with name + description columns
  - [ ] Create, Edit, Delete actions
  - [ ] Simple inline form or modal for create/edit

---

## 🟨 Phase 3 — Department Management

> **Backend + Frontend:** Implement department CRUD.

### Department Table Schema

```text
departments
├── id          (PK, Integer)
├── name        (String, unique)
├── description (Text, nullable)
├── created_at  (auto)
└── updated_at  (auto)
```

**Example Departments:** HR • CRM • Accounts • Development • Management

### Department API Endpoints

| Method | Endpoint                     | Description           |
|--------|------------------------------|-----------------------|
| POST   | `/api/hr/departments`        | Create department     |
| GET    | `/api/hr/departments`        | List all departments  |
| PUT    | `/api/hr/departments/{id}`   | Update department     |
| DELETE | `/api/hr/departments/{id}`   | Delete department     |

---

### 3.1 — Backend: Database Model

- [ ] Add `Department` model to `backend/app/modules/hr/db_models.py`
  - [ ] Columns: id, name (unique), description, created_at, updated_at
  - [ ] Set `__tablename__ = "departments"`

### 3.2 — Backend: Schemas

- [ ] Add department schemas to `backend/app/modules/hr/schemas.py`
  - [ ] `DepartmentCreate`, `DepartmentUpdate`, `DepartmentResponse`

### 3.3 — Backend: CRUD

- [ ] Add department CRUD to `backend/app/modules/hr/crud.py`
  - [ ] `get_departments(db)`, `create_department(db, data)`, `update_department(db, id, data)`, `delete_department(db, id)`

### 3.4 — Backend: API Routes

- [ ] Add department routes to `backend/app/modules/hr/routers.py`
  - [ ] `POST /api/hr/departments`, `GET /api/hr/departments`, `PUT /api/hr/departments/{id}`, `DELETE /api/hr/departments/{id}`

### 3.5 — Frontend: API Service

- [ ] Add department API methods to `frontend/src/modules/hr/services/hrApi.js`
  - [ ] `getDepartments()`, `createDepartment(data)`, `updateDepartment(id, data)`, `deleteDepartment(id)`

### 3.6 — Frontend: DepartmentTable Component

- [ ] Create `frontend/src/modules/hr/components/DepartmentTable.jsx`
  - [ ] Table with name + description columns
  - [ ] Create, Edit, Delete actions

---

## 🟧 Phase 4 — Attendance Management

> **Backend + Frontend:** Track daily employee attendance with check-in/check-out.

### Attendance Table Schema

```text
attendance
├── id           (PK, Integer)
├── employee_id  (FK → employees.id)
├── date         (Date)
├── check_in     (DateTime, nullable)
├── check_out    (DateTime, nullable)
├── status       (Enum: Present / Absent / Half Day / Leave)
├── created_at   (auto)
└── updated_at   (auto)
```

### Attendance API Endpoints

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | `/api/hr/attendance`              | Mark attendance          |
| GET    | `/api/hr/attendance`              | List all attendance      |
| GET    | `/api/hr/attendance/{employee_id}` | Get attendance by employee |

---

### 4.1 — Backend: Database Model

- [ ] Add `Attendance` model to `backend/app/modules/hr/db_models.py`
  - [ ] Columns: id, employee_id (FK), date, check_in, check_out, status, created_at, updated_at
  - [ ] Unique constraint on (employee_id, date)

### 4.2 — Backend: Schemas

- [ ] Add attendance schemas to `backend/app/modules/hr/schemas.py`
  - [ ] `AttendanceCreate`, `AttendanceResponse`

### 4.3 — Backend: CRUD

- [ ] Add attendance CRUD to `backend/app/modules/hr/crud.py`
  - [ ] `mark_attendance(db, data)`, `get_attendance(db)`, `get_attendance_by_employee(db, employee_id)`

### 4.4 — Backend: API Routes

- [ ] Add attendance routes to `backend/app/modules/hr/routers.py`
  - [ ] `POST /api/hr/attendance`, `GET /api/hr/attendance`, `GET /api/hr/attendance/{employee_id}`

### 4.5 — Frontend: API Service

- [ ] Add attendance API methods to `frontend/src/modules/hr/services/hrApi.js`
  - [ ] `markAttendance(data)`, `getAttendance()`, `getAttendanceByEmployee(employeeId)`

### 4.6 — Frontend: AttendanceTable Component

- [ ] Create `frontend/src/modules/hr/components/AttendanceTable.jsx`
  - [ ] Columns: Employee, Date, Check In, Check Out, Status
  - [ ] Status badges (Present=green, Absent=red, Half Day=orange, Leave=blue)
  - [ ] Mark attendance button/form

---

## 🟥 Phase 5 — Leave Management

> **Backend + Frontend:** Handle leave requests with approval workflow.

### Leave Table Schema

```text
leave_requests
├── id           (PK, Integer)
├── employee_id  (FK → employees.id)
├── leave_type   (Enum: Casual Leave / Sick Leave / Emergency Leave)
├── start_date   (Date)
├── end_date     (Date)
├── reason       (Text)
├── status       (Enum: Pending / Approved / Rejected)
├── created_at   (auto)
└── updated_at   (auto)
```

### Leave API Endpoints

| Method | Endpoint                | Description             |
|--------|-------------------------|-------------------------|
| POST   | `/api/hr/leaves`        | Create leave request    |
| GET    | `/api/hr/leaves`        | List all leave requests |
| PATCH  | `/api/hr/leaves/{id}`   | Approve/Reject leave    |

> HR Managers can approve or reject requests via the PATCH endpoint.

---

### 5.1 — Backend: Database Model

- [ ] Add `LeaveRequest` model to `backend/app/modules/hr/db_models.py`
  - [ ] Columns: id, employee_id (FK), leave_type, start_date, end_date, reason, status, created_at, updated_at

### 5.2 — Backend: Schemas

- [ ] Add leave schemas to `backend/app/modules/hr/schemas.py`
  - [ ] `LeaveCreate`, `LeaveStatusUpdate` (for approve/reject), `LeaveResponse`

### 5.3 — Backend: CRUD

- [ ] Add leave CRUD to `backend/app/modules/hr/crud.py`
  - [ ] `create_leave_request(db, data)`, `get_leave_requests(db)`, `update_leave_status(db, id, status)`

### 5.4 — Backend: API Routes

- [ ] Add leave routes to `backend/app/modules/hr/routers.py`
  - [ ] `POST /api/hr/leaves`, `GET /api/hr/leaves`, `PATCH /api/hr/leaves/{id}`

### 5.5 — Frontend: API Service

- [ ] Add leave API methods to `frontend/src/modules/hr/services/hrApi.js`
  - [ ] `createLeave(data)`, `getLeaves()`, `updateLeaveStatus(id, status)`

### 5.6 — Frontend: LeaveTable Component

- [ ] Create `frontend/src/modules/hr/components/LeaveTable.jsx`
  - [ ] Columns: Employee, Leave Type, Start Date, End Date, Status
  - [ ] Action buttons: Approve (green), Reject (red)
  - [ ] Status badges (Pending=yellow, Approved=green, Rejected=red)

---

## 🟪 Phase 6 — HR Dashboard

> **Backend + Frontend:** Dashboard statistics cards showing key HR metrics.

### Summary Cards

```text
┌─────────────────┬──────────────┬──────────────┬─────────────────┬──────────────────┐
│ Total Employees │  Departments │ Present Today │  Absent Today   │ Pending Leaves   │
└─────────────────┴──────────────┴──────────────┴─────────────────┴──────────────────┘
```

---

### 6.1 — Backend: Dashboard API

- [ ] Add dashboard endpoint to `backend/app/modules/hr/routers.py`
  - [ ] `GET /api/hr/dashboard` — returns: total_employees, total_departments, present_today, absent_today, pending_leaves
  - [ ] Aggregate data from employees, attendance, and leave_requests tables

### 6.2 — Frontend: API Service

- [ ] Add dashboard method to `frontend/src/modules/hr/services/hrApi.js`
  - [ ] `getDashboard()` — GET `/api/hr/dashboard`

### 6.3 — Frontend: Dashboard Cards

- [ ] Create dashboard cards on `frontend/src/modules/hr/pages/HRPage.jsx` (or a dedicated component)
  - [ ] Each card shows label + count with an icon
  - [ ] Color-coded: Employees=blue, Departments=purple, Present=green, Absent=red, Pending=orange
  - [ ] Fetch data on mount

---

## ⚫ Phase 7 — Event Bus Integration

> **Integration:** Publish employee data changes so other modules (Tasks, etc.) can consume them.

### 7.1 — Backend: Publish Employee Events

- [ ] In `backend/app/modules/hr/services.py` (or routers), publish events on employee changes
- [ ] Publish on **create**: `event_bus.publish("hr.employee_list", {"employees": [...]})`
- [ ] Publish on **update**: same event with updated data
- [ ] Publish on **delete**: `event_bus.publish("hr.employee_removed", {"employee_id": id})`

### 7.2 — Backend: Event Format

```python
event_bus.publish(
    "hr.employee_list",
    {
        "employees": [
            {
                "id": 1,
                "user_id": 5,
                "full_name": "Nabeel",
                "employee_code": "EMP001",
                "department": "Development",
                "role": "Developer"
            }
        ]
    }
)
```

### 7.3 — Verify Tasks Module Consumption

- [ ] Check if Tasks module is subscribed to `hr.employee_list` events
- [ ] If not, add subscription in Tasks module to populate assignee dropdown

---

# Development Order (Quick Reference)

| Step | Phase | Description                |
|------|-------|----------------------------|
| 1    | 1     | Employee CRUD (backend)    |
| 2    | 2     | Role CRUD (backend)        |
| 3    | 3     | Department CRUD (backend)  |
| 4    | 1     | Employee UI (frontend)     |
| 5    | 4     | Attendance Module          |
| 6    | 5     | Leave Module               |
| 7    | 6     | Dashboard Statistics       |
| 8    | 7     | Event Bus Integration      |

> ⚠️ Do not modify existing Auth, CRM, Tasks, or Accounts modules except for required event bus integration.

---

## Current Progress

| Phase | Area           | Status |
|-------|----------------|--------|
| —     | Project Setup  | ✅ Routing, sidebar, and module scaffold in place |
| 1     | Employee Mgmt  | ❌ Not started |
| 2     | Role Tags      | ❌ Not started |
| 3     | Departments    | ❌ Not started |
| 4     | Attendance     | ❌ Not started |
| 5     | Leave Mgmt     | ❌ Not started |
| 6     | Dashboard      | ❌ Not started |
| 7     | Event Bus      | ❌ Not started |
