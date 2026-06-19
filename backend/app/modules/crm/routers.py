from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
import uuid
from datetime import datetime
from typing import List, Optional

from app.core.database import get_db
from .db_models import Contact, Tag, Activity, Lead, Pipeline, Phase
from .schemas import (
    ContactCreateSchema,
    ContactUpdateSchema,
    ContactSchema,
    ContactDetailSchema,
    TagBaseSchema,
    TagSchema,
    ActivityCreateSchema,
    ActivitySchema,
    MergeContactsSchema,
    BulkActionSchema,
    LeadCreateSchema,
    LeadSchema,
    LeadUpdateSchema,
    PipelineSchema,
    PipelineCreateSchema,
    PipelineUpdateSchema,
    PhaseSchema,
    PhaseCreateSchema,
    PhaseUpdateSchema,
)

router = APIRouter(prefix="/contacts", tags=["contacts"])

# ============= LEADS ENDPOINTS (Phase 2) =============
leads_router = APIRouter(prefix="/leads", tags=["leads"])

# ============= PIPELINES ENDPOINTS (Phase 2) =============
pipelines_router = APIRouter(prefix="/pipelines", tags=["pipelines"])


@pipelines_router.get("/", response_model=List[PipelineSchema])
async def list_pipelines(db: Session = Depends(get_db)):
    return db.query(Pipeline).all()


@pipelines_router.post("/", response_model=PipelineSchema, status_code=201)
async def create_pipeline(pipeline_data: PipelineCreateSchema, db: Session = Depends(get_db)):
    pipeline = Pipeline(
        id=str(uuid.uuid4()),
        name=pipeline_data.name,
        description=pipeline_data.description,
        owner=pipeline_data.owner,
    )
    db.add(pipeline)
    db.commit()
    db.refresh(pipeline)
    return pipeline


@pipelines_router.get("/{pipeline_id}", response_model=PipelineSchema)
async def get_pipeline(pipeline_id: str, db: Session = Depends(get_db)):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline


@pipelines_router.patch("/{pipeline_id}", response_model=PipelineSchema)
async def update_pipeline(pipeline_id: str, pipeline_data: PipelineUpdateSchema, db: Session = Depends(get_db)):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    update_data = pipeline_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pipeline, key, value)

    db.add(pipeline)
    db.commit()
    db.refresh(pipeline)
    return pipeline





@pipelines_router.get("/{pipeline_id}/phases", response_model=List[PhaseSchema])
async def list_pipeline_phases(pipeline_id: str, db: Session = Depends(get_db)):
    return db.query(Phase).filter(Phase.pipeline_id == pipeline_id).order_by(Phase.position).all()


@pipelines_router.post("/{pipeline_id}/phases", response_model=PhaseSchema, status_code=201)
async def create_pipeline_phase(pipeline_id: str, phase_data: PhaseCreateSchema, db: Session = Depends(get_db)):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    phase_position = phase_data.position
    if phase_position is None:
        highest_position = db.query(Phase.position).filter(Phase.pipeline_id == pipeline_id).order_by(Phase.position.desc()).first()
        phase_position = highest_position[0] + 1 if highest_position and highest_position[0] is not None else 0

    phase = Phase(
        id=str(uuid.uuid4()),
        pipeline_id=pipeline_id,
        name=phase_data.name,
        color=phase_data.color or "#6b7280",
        position=phase_position,
        is_terminal=phase_data.is_terminal or False,
    )
    db.add(phase)
    db.commit()
    db.refresh(phase)
    return phase


@pipelines_router.put("/{pipeline_id}/phases/{phase_id}", response_model=PhaseSchema)
async def update_pipeline_phase(
    pipeline_id: str,
    phase_id: str,
    phase_data: PhaseUpdateSchema,
    db: Session = Depends(get_db),
):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    phase = db.query(Phase).filter(Phase.id == phase_id, Phase.pipeline_id == pipeline_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    update_data = phase_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(phase, key, value)

    db.add(phase)
    db.commit()
    db.refresh(phase)
    return phase





@pipelines_router.delete("/{pipeline_id}/phases/{phase_id}", status_code=204)
async def delete_pipeline_phase(pipeline_id: str, phase_id: str, db: Session = Depends(get_db)):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    phase = db.query(Phase).filter(Phase.id == phase_id, Phase.pipeline_id == pipeline_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    # Remove phase references from leads before deleting the phase
    db.query(Lead).filter(Lead.phase_id == phase_id).update({Lead.phase_id: None}, synchronize_session=False)
    db.delete(phase)
    db.commit()


@leads_router.post("/", response_model=LeadSchema, status_code=201)
async def create_lead(lead_data: LeadCreateSchema, db: Session = Depends(get_db)):
    lead_id = str(uuid.uuid4())
    lead_extra_data = lead_data.extra_data or {}
    lead_extra_data.setdefault('history', [])
    lead_extra_data['history'].append({
        'type': 'created',
        'message': 'Lead created',
        'timestamp': datetime.utcnow().isoformat(),
    })

    lead = Lead(
        id=lead_id,
        title=lead_data.title,
        contact_id=lead_data.contact_id,
        pipeline_id=lead_data.pipeline_id,
        phase_id=lead_data.phase_id,
        value=lead_data.value,
        expected_close_date=lead_data.expected_close_date,
        assignee=lead_data.assignee,
        source=lead_data.source,
        notes=lead_data.notes,
        extra_data=lead_extra_data
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@leads_router.get("/", response_model=List[LeadSchema])
async def list_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=500),
    pipeline_id: Optional[str] = Query(None),
    phase_id: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Lead)

    if pipeline_id:
        query = query.filter(Lead.pipeline_id == pipeline_id)
    if phase_id:
        query = query.filter(Lead.phase_id == phase_id)
    if assignee:
        query = query.filter(Lead.assignee.ilike(f"%{assignee}%"))
    if source:
        query = query.filter(Lead.source.ilike(f"%{source}%"))
    if search:
        search_term = f"%{search}%"
        query = query.filter(Lead.title.ilike(search_term))

    leads = query.offset(skip).limit(limit).all()
    return leads


@leads_router.get("/{lead_id}", response_model=LeadSchema)
async def get_lead(lead_id: str, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@leads_router.put("/{lead_id}", response_model=LeadSchema)
async def update_lead(lead_id: str, lead_data: LeadUpdateSchema, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    update_data = lead_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lead, key, value)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@leads_router.delete("/{lead_id}", status_code=204)
async def delete_lead(lead_id: str, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()


@leads_router.put("/{lead_id}/move")
async def move_lead(lead_id: str, phase_id: str = Query(...), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_phase_id = lead.phase_id
    lead.phase_id = phase_id
    extra_data = lead.extra_data or {}
    history = extra_data.get('history', [])
    history.append({
        'type': 'phase_changed',
        'message': f"Moved from {old_phase_id or 'None'} to {phase_id}",
        'from_phase_id': old_phase_id,
        'to_phase_id': phase_id,
        'timestamp': datetime.utcnow().isoformat(),
    })
    extra_data['history'] = history
    lead.extra_data = extra_data

    db.add(lead)
    db.commit()
    db.refresh(lead)
    # In a full implementation, publish event bus message here
    return {"success": True, "lead_id": lead.id, "phase_id": phase_id}


@leads_router.post("/{lead_id}/convert")
async def convert_lead(lead_id: str, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    extra_data = lead.extra_data or {}
    history = extra_data.get('history', [])
    history.append({
        'type': 'converted',
        'message': 'Lead converted',
        'timestamp': datetime.utcnow().isoformat(),
    })
    extra_data['history'] = history
    extra_data['converted'] = True
    lead.extra_data = extra_data

    db.add(lead)
    db.commit()
    db.refresh(lead)
    # TODO: create Client record and publish event bus message
    return {"success": True, "lead_id": lead.id}



# ============= CONTACTS ENDPOINTS =============

@router.post("/", response_model=ContactSchema, status_code=201)
async def create_contact(contact_data: ContactCreateSchema, db: Session = Depends(get_db)):
    """Create a new contact with validation"""
    
    # Validate at least email or phone is provided
    if not contact_data.email and not contact_data.phone:
        raise HTTPException(
            status_code=400,
            detail="At least one of email or phone is required"
        )
    
    # Create contact instance
    contact_id = str(uuid.uuid4())
    contact = Contact(
        id=contact_id,
        name=contact_data.name,
        email=contact_data.email,
        phone=contact_data.phone,
        company=contact_data.company,
        job_title=contact_data.job_title,
        address=contact_data.address,
        notes=contact_data.notes,
        avatar_url=contact_data.avatar_url,
        custom_fields=[
            field.dict() if hasattr(field, 'dict') else field
            for field in contact_data.custom_fields
        ] if contact_data.custom_fields else [],
        source=contact_data.source,
    )
    
    # Link tags
    if contact_data.tags:
        for tag_name in contact_data.tags:
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(id=str(uuid.uuid4()), name=tag_name)
                db.add(tag)
            contact.tags.append(tag)
    
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/", response_model=List[ContactSchema])
async def list_contacts(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    tags: Optional[str] = Query(None),  # comma-separated
    status: Optional[str] = "all",
    db: Session = Depends(get_db)
):
    """List contacts with search, filter, and pagination"""
    
    query = db.query(Contact)
    
    # Filter by status unless the client requests all statuses
    if status and status.lower() != "all":
        query = query.filter(Contact.status == status)
    
    # Search by name, email, phone, company
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Contact.name.ilike(search_term),
                Contact.email.ilike(search_term),
                Contact.phone.ilike(search_term),
                Contact.company.ilike(search_term),
            )
        )
    
    # Filter by tags
    if tags:
        tag_names = [t.strip() for t in tags.split(",")]
        query = query.filter(Contact.tags.any(Tag.name.in_(tag_names)))
    
    total = query.count()
    response.headers["X-Total-Count"] = str(total)
    contacts = query.offset(skip).limit(limit).all()
    return contacts


@router.get("/{contact_id}", response_model=ContactDetailSchema)
async def get_contact(contact_id: str, db: Session = Depends(get_db)):
    """Get contact details with activity timeline"""
    
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return contact


@router.put("/{contact_id}", response_model=ContactSchema)
async def update_contact(
    contact_id: str,
    contact_data: ContactUpdateSchema,
    db: Session = Depends(get_db)
):
    """Update contact information"""
    
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Update fields
    update_data = contact_data.dict(exclude_unset=True)

    # Handle custom fields
    if "custom_fields" in update_data:
        custom_fields_data = update_data.pop("custom_fields")
        contact.custom_fields = [
            field if isinstance(field, dict) else field.dict()
            for field in custom_fields_data
        ]
    
    # Handle tags
    if "tags" in update_data:
        tag_names = update_data.pop("tags")
        contact.tags.clear()
        for tag_name in tag_names:
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(id=str(uuid.uuid4()), name=tag_name)
                db.add(tag)
            contact.tags.append(tag)
    
    for key, value in update_data.items():
        setattr(contact, key, value)

    if update_data.get('status') == 'active':
        contact.deleted_at = None
        contact.archived_at = None
    elif update_data.get('status') == 'archived':
        contact.archived_at = datetime.utcnow()
        contact.deleted_at = None
    elif update_data.get('status') == 'deleted':
        contact.deleted_at = datetime.utcnow()

    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(contact_id: str, db: Session = Depends(get_db)):
    """Soft-delete a contact by flagging it as deleted"""
    
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact.status = "deleted"
    contact.deleted_at = datetime.utcnow()
    db.commit()


@router.patch("/{contact_id}/archive", response_model=ContactSchema)
async def archive_contact(contact_id: str, db: Session = Depends(get_db)):
    """Archive a contact instead of deleting"""
    
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact.status = "archived"
    contact.archived_at = datetime.utcnow()
    db.commit()
    db.refresh(contact)
    return contact


@router.post("/{contact_id}/merge", response_model=ContactSchema)
async def merge_contacts(
    contact_id: str,
    merge_data: MergeContactsSchema,
    db: Session = Depends(get_db)
):
    """
    Merge two contacts - combine data, keep primary
    """
    primary = db.query(Contact).filter(Contact.id == merge_data.primary_id).first()
    secondary = db.query(Contact).filter(Contact.id == merge_data.secondary_id).first()
    
    if not primary or not secondary:
        raise HTTPException(status_code=404, detail="One or both contacts not found")
    
    if primary.id == secondary.id:
        raise HTTPException(status_code=400, detail="Cannot merge contact with itself")
    
    # Merge tags
    for tag in secondary.tags:
        if tag not in primary.tags:
            primary.tags.append(tag)
    
    # Merge custom fields
    primary_fields = {f["label"]: f for f in primary.custom_fields}
    for field in secondary.custom_fields:
        if field["label"] not in primary_fields:
            primary.custom_fields.append(field)
    
    # Merge activities
    for activity in secondary.activities:
        activity.contact_id = primary.id
    
    # Delete secondary
    db.delete(secondary)
    db.commit()
    db.refresh(primary)
    return primary


@router.post("/bulk-action")
async def bulk_action(action_data: BulkActionSchema, db: Session = Depends(get_db)):
    """Perform bulk actions on multiple contacts"""
    
    contacts = db.query(Contact).filter(Contact.id.in_(action_data.contact_ids)).all()
    
    if action_data.action == "tag":
        tag_name = action_data.action_data.get("tag_name")
        if not tag_name:
            raise HTTPException(status_code=400, detail="tag_name required")
        
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            tag = Tag(id=str(uuid.uuid4()), name=tag_name)
            db.add(tag)
        
        for contact in contacts:
            if tag not in contact.tags:
                contact.tags.append(tag)
    
    elif action_data.action == "archive":
        for contact in contacts:
            contact.status = "archived"
            contact.archived_at = datetime.utcnow()
    
    db.commit()
    return {"success": True, "count": len(contacts)}


# ============= ACTIVITIES ENDPOINTS =============

@router.post("/{contact_id}/activities", response_model=ActivitySchema, status_code=201)
async def add_activity(
    contact_id: str,
    activity_data: ActivityCreateSchema,
    db: Session = Depends(get_db)
):
    """Add activity to contact (call, email, meeting, note)"""
    
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    activity = Activity(
        id=str(uuid.uuid4()),
        contact_id=contact_id,
        activity_type=activity_data.activity_type,
        title=activity_data.title,
        description=activity_data.description,
        follow_up_date=activity_data.follow_up_date,
        meta_data=activity_data.meta_data or {},
    )
    
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@router.get("/{contact_id}/activities", response_model=List[ActivitySchema])
async def get_activities(contact_id: str, db: Session = Depends(get_db)):
    """Get activity timeline for contact"""
    
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    activities = db.query(Activity).filter(Activity.contact_id == contact_id).order_by(Activity.created_at.desc()).all()
    return activities


# ============= TAGS ENDPOINTS =============

@router.get("/tags", response_model=List[TagSchema])
async def list_tags(db: Session = Depends(get_db)):
    """List all available tags"""
    tags = db.query(Tag).all()
    return tags


@router.post("/tags", response_model=TagSchema, status_code=201)
async def create_tag(tag_data: TagBaseSchema, db: Session = Depends(get_db)):
    """Create a new tag"""
    
    existing = db.query(Tag).filter(Tag.name == tag_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists")
    
    tag = Tag(
        id=str(uuid.uuid4()),
        name=tag_data.name,
        color=tag_data.color or "#6366f1"
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


# Health check
@router.get("/health")
async def health():
    return {"status": "CRM module ready"}

