from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.modules.recruitment.db_models import Candidate, RecruitmentStage, can_move_to
from app.modules.recruitment.schemas import CandidateCreate, CandidateUpdate
from app.modules.auth.db_models import User
from app.modules.auth.utils import get_password_hash


# ──────────────────────────────────────────────
# Candidate CRUD
# ──────────────────────────────────────────────


def get_candidates(db: Session, skip: int = 0, limit: int = 100) -> list[Candidate]:
    return db.query(Candidate).order_by(Candidate.created_at.desc()).offset(skip).limit(limit).all()


def get_candidate(db: Session, candidate_id: int) -> Candidate | None:
    return db.query(Candidate).filter(Candidate.id == candidate_id).first()


def create_candidate(db: Session, data: CandidateCreate) -> Candidate:
    existing = db.query(Candidate).filter(Candidate.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate with email '{data.email}' already exists",
        )

    candidate = Candidate(
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        position_applied=data.position_applied,
        experience_years=data.experience_years,
        notes=data.notes,
        resume_url=data.resume_url,
        current_stage=RecruitmentStage.APPLIED,
        status="active",
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


def update_candidate(db: Session, candidate_id: int, data: CandidateUpdate) -> Candidate | None:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return None

    update_data = data.model_dump(exclude_unset=True)

    # Check email uniqueness if changed
    if "email" in update_data and update_data["email"] != candidate.email:
        existing = db.query(Candidate).filter(Candidate.email == update_data["email"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Candidate with email '{update_data['email']}' already exists",
            )

    for key, value in update_data.items():
        setattr(candidate, key, value)

    db.commit()
    db.refresh(candidate)
    return candidate


def delete_candidate(db: Session, candidate_id: int) -> bool:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return False
    db.delete(candidate)
    db.commit()
    return True


# ──────────────────────────────────────────────
# Stage Management
# ──────────────────────────────────────────────


def move_candidate_stage(db: Session, candidate_id: int, target_stage: RecruitmentStage) -> Candidate | None:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return None

    if not can_move_to(candidate.current_stage, target_stage):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot move from '{candidate.current_stage.value}' to '{target_stage.value}'. "
                f"Allowed transitions: forward progression or Rejected."
            ),
        )

    candidate.current_stage = target_stage
    if target_stage == RecruitmentStage.REJECTED:
        candidate.status = "rejected"
    elif target_stage == RecruitmentStage.ONBOARDED:
        candidate.status = "onboarded"

    db.commit()
    db.refresh(candidate)
    return candidate


# ──────────────────────────────────────────────
# Convert to Employee
# ──────────────────────────────────────────────


def convert_candidate_to_employee(
    db: Session,
    candidate_id: int,
    data,
) -> dict:
    """Convert a Selected candidate into a User + Employee."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found",
        )

    if candidate.current_stage != RecruitmentStage.SELECTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate is in '{candidate.current_stage.value}' stage. Only 'Selected' candidates can be converted.",
        )

    # 1. Create auth user
    from app.modules.hr.db_models import Employee, EmployeeStatus

    existing_user = db.query(User).filter(User.email == candidate.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{candidate.email}' already exists",
        )

    # Generate a username from email
    base_username = candidate.email.split("@")[0].lower().replace(".", "_")
    username = base_username
    counter = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}_{counter}"
        counter += 1

    # Generate a random temp password
    import secrets
    temp_password = secrets.token_urlsafe(12)

    user = User(
        username=username,
        email=candidate.email,
        full_name=candidate.full_name,
        hashed_password=get_password_hash(temp_password),
        disabled=False,
        is_admin=False,
    )
    db.add(user)
    db.flush()

    # 2. Create employee record
    from app.modules.hr.crud import generate_employee_code
    employee_code = data.employee_code or generate_employee_code(db)

    employee = Employee(
        user_id=user.id,
        employee_code=employee_code,
        phone=data.phone or candidate.phone,
        department_id=data.department_id,
        role_id=data.role_id,
        joining_date=data.joining_date,
        salary=data.salary,
        status=EmployeeStatus.ACTIVE,
    )
    db.add(employee)

    # 3. Update candidate stage to Onboarded
    candidate.current_stage = RecruitmentStage.ONBOARDED
    candidate.status = "onboarded"

    db.commit()
    db.refresh(user)
    db.refresh(employee)
    db.refresh(candidate)

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
        },
        "employee": {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "status": employee.status.value if employee.status else None,
        },
        "candidate": {
            "id": candidate.id,
            "full_name": candidate.full_name,
            "current_stage": candidate.current_stage.value,
            "status": candidate.status,
        },
        "temp_password": temp_password,
    }


# ──────────────────────────────────────────────
# Dashboard / Reports
# ──────────────────────────────────────────────


def get_recruitment_stats(db: Session) -> dict:
    total = db.query(func.count(Candidate.id)).scalar() or 0
    applied = db.query(func.count(Candidate.id)).filter(
        Candidate.current_stage == RecruitmentStage.APPLIED
    ).scalar() or 0
    screening = db.query(func.count(Candidate.id)).filter(
        Candidate.current_stage == RecruitmentStage.SCREENING
    ).scalar() or 0
    interview = db.query(func.count(Candidate.id)).filter(
        Candidate.current_stage.in_([
            RecruitmentStage.INTERVIEW,
            RecruitmentStage.TECHNICAL_ROUND,
            RecruitmentStage.HR_ROUND,
        ])
    ).scalar() or 0
    selected = db.query(func.count(Candidate.id)).filter(
        Candidate.current_stage == RecruitmentStage.SELECTED
    ).scalar() or 0
    rejected = db.query(func.count(Candidate.id)).filter(
        Candidate.current_stage == RecruitmentStage.REJECTED
    ).scalar() or 0
    onboarded = db.query(func.count(Candidate.id)).filter(
        Candidate.current_stage == RecruitmentStage.ONBOARDED
    ).scalar() or 0

    return {
        "total_candidates": total,
        "applied": applied,
        "screening": screening,
        "in_interview": interview,
        "selected": selected,
        "rejected": rejected,
        "onboarded": onboarded,
    }


def get_candidates_by_position(db: Session) -> list[dict]:
    rows = (
        db.query(
            Candidate.position_applied,
            func.count(Candidate.id).label("count"),
        )
        .group_by(Candidate.position_applied)
        .order_by(func.count(Candidate.id).desc())
        .all()
    )
    return [{"position": row.position_applied, "count": row.count} for row in rows]


def get_candidates_by_stage(db: Session) -> list[dict]:
    rows = (
        db.query(
            Candidate.current_stage,
            func.count(Candidate.id).label("count"),
        )
        .group_by(Candidate.current_stage)
        .order_by(Candidate.current_stage)
        .all()
    )
    return [{"stage": row.current_stage.value if hasattr(row.current_stage, 'value') else row.current_stage, "count": row.count} for row in rows]


def get_hiring_stats(db: Session) -> dict:
    total = db.query(func.count(Candidate.id)).scalar() or 1
    rejected = db.query(func.count(Candidate.id)).filter(
        Candidate.current_stage == RecruitmentStage.REJECTED
    ).scalar() or 0
    onboarded = db.query(func.count(Candidate.id)).filter(
        Candidate.current_stage == RecruitmentStage.ONBOARDED
    ).scalar() or 0

    # Success rate = onboarded / (total - rejected - active_in_progress) but simpler: onboarded / total
    success_rate = round((onboarded / total) * 100, 1) if total > 0 else 0

    return {
        "total_candidates": total,
        "onboarded": onboarded,
        "rejected": rejected,
        "success_rate": success_rate,
    }
