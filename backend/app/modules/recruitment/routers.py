from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.modules.auth.routers import get_current_user
from app.modules.auth.models import User
from app.modules.recruitment.db_models import RecruitmentStage
from app.modules.recruitment.schemas import (
    CandidateCreate,
    CandidateUpdate,
    CandidateResponse,
    MoveStageRequest,
    ConvertToEmployeeRequest,
)
from app.modules.recruitment.crud import (
    get_candidates,
    get_candidate,
    create_candidate,
    update_candidate,
    delete_candidate,
    move_candidate_stage,
    convert_candidate_to_employee,
    get_recruitment_stats,
    get_candidates_by_position,
    get_candidates_by_stage,
    get_hiring_stats,
)
from app.modules.recruitment.services import format_candidate_response

router = APIRouter()


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────


def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ──────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────


@router.get("/")
async def health():
    return {"status": "Recruitment module ready"}


# ──────────────────────────────────────────────
# Candidate CRUD
# ──────────────────────────────────────────────


@router.get("/candidates", response_model=list[CandidateResponse])
async def api_get_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return [format_candidate_response(c) for c in get_candidates(db, skip=skip, limit=limit)]


@router.get("/candidates/{candidate_id}", response_model=CandidateResponse)
async def api_get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    candidate = get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found",
        )
    return format_candidate_response(candidate)


@router.post("/candidates", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
async def api_create_candidate(
    data: CandidateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    candidate = create_candidate(db, data)
    return format_candidate_response(candidate)


@router.put("/candidates/{candidate_id}", response_model=CandidateResponse)
async def api_update_candidate(
    candidate_id: int,
    data: CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    candidate = update_candidate(db, candidate_id, data)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found",
        )
    return format_candidate_response(candidate)


@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    deleted = delete_candidate(db, candidate_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found",
        )


# ──────────────────────────────────────────────
# Stage Management
# ──────────────────────────────────────────────


@router.post("/candidates/{candidate_id}/move-stage", response_model=CandidateResponse)
async def api_move_candidate_stage(
    candidate_id: int,
    data: MoveStageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    candidate = move_candidate_stage(db, candidate_id, data.target_stage)
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with id {candidate_id} not found",
        )
    return format_candidate_response(candidate)


# ──────────────────────────────────────────────
# Convert to Employee
# ──────────────────────────────────────────────


@router.post("/candidates/{candidate_id}/convert-to-employee")
async def api_convert_to_employee(
    candidate_id: int,
    data: ConvertToEmployeeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = convert_candidate_to_employee(db, candidate_id, data)
    return result


# ──────────────────────────────────────────────
# Dashboard & Reports
# ──────────────────────────────────────────────


@router.get("/dashboard")
async def api_recruitment_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    stats = get_recruitment_stats(db)
    by_position = get_candidates_by_position(db)
    by_stage = get_candidates_by_stage(db)
    hiring = get_hiring_stats(db)
    return {
        **stats,
        "by_position": by_position,
        "by_stage": by_stage,
        "hiring": hiring,
    }
