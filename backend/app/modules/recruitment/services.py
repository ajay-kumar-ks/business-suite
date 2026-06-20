from app.modules.recruitment.db_models import Candidate


def format_candidate_response(candidate: Candidate) -> dict:
    return {
        "id": candidate.id,
        "full_name": candidate.full_name,
        "email": candidate.email,
        "phone": candidate.phone,
        "position_applied": candidate.position_applied,
        "experience_years": candidate.experience_years,
        "current_stage": candidate.current_stage.value if candidate.current_stage else None,
        "status": candidate.status,
        "resume_url": candidate.resume_url,
        "notes": candidate.notes,
        "created_at": candidate.created_at.isoformat() if candidate.created_at else None,
        "updated_at": candidate.updated_at.isoformat() if candidate.updated_at else None,
    }
