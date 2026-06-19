from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.modules.recruitment.db_models import RecruitmentStage


class CandidateCreate(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    position_applied: str
    experience_years: float = 0
    notes: Optional[str] = None
    resume_url: Optional[str] = None


class CandidateUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    position_applied: Optional[str] = None
    experience_years: Optional[float] = None
    notes: Optional[str] = None
    resume_url: Optional[str] = None


class CandidateResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    position_applied: str
    experience_years: float
    current_stage: RecruitmentStage
    status: str
    resume_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MoveStageRequest(BaseModel):
    target_stage: RecruitmentStage


class ConvertToEmployeeRequest(BaseModel):
    department_id: Optional[int] = None
    role_id: Optional[int] = None
    employee_code: Optional[str] = None
    phone: Optional[str] = None
    joining_date: Optional[str] = None
    salary: Optional[float] = None
