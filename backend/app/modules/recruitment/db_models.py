import enum
from sqlalchemy import Column, Integer, String, Float, Text, Enum as SAEnum
from app.core.base import BaseModel


class RecruitmentStage(str, enum.Enum):
    APPLIED = "Applied"
    SCREENING = "Screening"
    INTERVIEW = "Interview"
    TECHNICAL_ROUND = "Technical Round"
    HR_ROUND = "HR Round"
    SELECTED = "Selected"
    REJECTED = "Rejected"
    ONBOARDED = "Onboarded"


# Ordered stages for progression logic
STAGE_ORDER = [
    RecruitmentStage.APPLIED,
    RecruitmentStage.SCREENING,
    RecruitmentStage.INTERVIEW,
    RecruitmentStage.TECHNICAL_ROUND,
    RecruitmentStage.HR_ROUND,
    RecruitmentStage.SELECTED,
    RecruitmentStage.ONBOARDED,
]


def can_move_to(current: RecruitmentStage, target: RecruitmentStage) -> bool:
    """Allow forward progression or jump to Rejected at any stage."""
    if target == RecruitmentStage.REJECTED:
        return current != RecruitmentStage.REJECTED and current != RecruitmentStage.ONBOARDED
    if current == RecruitmentStage.REJECTED:
        return False
    if current == RecruitmentStage.ONBOARDED:
        return False
    # Forward or same stage is allowed
    try:
        return STAGE_ORDER.index(target) >= STAGE_ORDER.index(current)
    except ValueError:
        return False


class Candidate(BaseModel):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    position_applied = Column(String(255), nullable=False)
    experience_years = Column(Float, default=0, nullable=False)
    current_stage = Column(
        SAEnum(RecruitmentStage),
        default=RecruitmentStage.APPLIED,
        nullable=False,
    )
    status = Column(String(50), default="active", nullable=False)
    resume_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    def __repr__(self):
        return f"<Candidate(id={self.id}, name={self.full_name}, stage={self.current_stage})>"
