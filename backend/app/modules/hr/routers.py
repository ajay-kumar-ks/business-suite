from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app.core.database import get_db
from app.modules.auth.routers import get_current_user
from app.modules.auth.models import User
from app.modules.hr.crud import (
    get_employees,
    get_employee,
    create_employee,
    update_employee,
    delete_employee,
    get_roles,
    get_role,
    create_role,
    update_role,
    delete_role,
    get_departments,
    get_department,
    create_department,
    update_department,
    delete_department,
    get_attendance,
    mark_attendance,
    get_attendance_by_employee,
    get_leave_requests,
    create_leave_request,
    update_leave_status,
    get_dashboard_stats,
)
from app.modules.hr.schemas import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeListResponse,
    RoleCreate,
    RoleUpdate,
    RoleResponse,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    AttendanceCreate,
    AttendanceResponse,
    AttendanceListResponse,
    LeaveCreate,
    LeaveStatusUpdate,
    LeaveResponse,
)
from app.modules.hr.services import format_employee_response, format_attendance_response, format_leave_response
from app.modules.hr.db_models import EmployeeStatus, AttendanceStatus, LeaveType, LeaveStatus

router = APIRouter()


# ──────────────────────────────────────────────
# Health check (existing)
# ──────────────────────────────────────────────


@router.get("/")
async def health():
    return {"status": "HR module ready"}


# ──────────────────────────────────────────────
# Dashboard
# ──────────────────────────────────────────────


@router.get("/dashboard")
async def api_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_dashboard_stats(db)


# ──────────────────────────────────────────────
# Employee CRUD
# ──────────────────────────────────────────────


@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def api_create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = create_employee(db, data)
    return format_employee_response(employee)


@router.get("/employees", response_model=EmployeeListResponse)
async def api_get_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[EmployeeStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employees, total = get_employees(
        db, skip=skip, limit=limit, status_filter=status, search=search
    )
    return {
        "employees": [format_employee_response(e) for e in employees],
        "total": total,
    }


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def api_get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = get_employee(db, employee_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with id {employee_id} not found",
        )
    return format_employee_response(employee)


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def api_update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = update_employee(db, employee_id, data)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with id {employee_id} not found",
        )
    return format_employee_response(employee)


@router.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = delete_employee(db, employee_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with id {employee_id} not found",
        )


# ──────────────────────────────────────────────
# Role CRUD
# ──────────────────────────────────────────────


@router.get("/roles", response_model=list[RoleResponse])
async def api_get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_roles(db)


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def api_create_role(
    data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_role(db, data)


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def api_update_role(
    role_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = update_role(db, role_id, data)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with id {role_id} not found",
        )
    return role


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = delete_role(db, role_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with id {role_id} not found",
        )


# ──────────────────────────────────────────────
# Department CRUD
# ──────────────────────────────────────────────


@router.get("/departments", response_model=list[DepartmentResponse])
async def api_get_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_departments(db)


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def api_create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_department(db, data)


@router.put("/departments/{department_id}", response_model=DepartmentResponse)
async def api_update_department(
    department_id: int,
    data: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    department = update_department(db, department_id, data)
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with id {department_id} not found",
        )
    return department


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = delete_department(db, department_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with id {department_id} not found",
        )


# ──────────────────────────────────────────────
# Attendance CRUD
# ──────────────────────────────────────────────


@router.post("/attendance", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
async def api_mark_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = mark_attendance(db, data)
    return format_attendance_response(record)


@router.get("/attendance", response_model=AttendanceListResponse)
async def api_get_attendance(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    employee_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records, total = get_attendance(
        db, skip=skip, limit=limit, employee_id=employee_id,
        date_from=date_from, date_to=date_to
    )
    return {
        "attendance_records": [format_attendance_response(r) for r in records],
        "total": total,
    }


@router.get("/attendance/{employee_id}", response_model=list[AttendanceResponse])
async def api_get_employee_attendance(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return [format_attendance_response(r) for r in get_attendance_by_employee(db, employee_id)]


# ──────────────────────────────────────────────
# Leave CRUD
# ──────────────────────────────────────────────


@router.post("/leaves", response_model=LeaveResponse, status_code=status.HTTP_201_CREATED)
async def api_create_leave(
    data: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leave = create_leave_request(db, data)
    return format_leave_response(leave)


@router.get("/leaves", response_model=list[LeaveResponse])
async def api_get_leaves(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leaves, total = get_leave_requests(db, skip=skip, limit=limit)
    return [format_leave_response(l) for l in leaves]


@router.patch("/leaves/{leave_id}", response_model=LeaveResponse)
async def api_update_leave_status(
    leave_id: int,
    data: LeaveStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leave = update_leave_status(db, leave_id, data)
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Leave request with id {leave_id} not found",
        )
    return format_leave_response(leave)
