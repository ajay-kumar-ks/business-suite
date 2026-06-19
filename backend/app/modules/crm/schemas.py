from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional, Any
from datetime import datetime


# Custom Field Schema
class CustomFieldSchema(BaseModel):
    label: str
    value: Any


# Tag Schemas
class TagBaseSchema(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"


class TagSchema(TagBaseSchema):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# Activity Schemas
class ActivityBaseSchema(BaseModel):
    activity_type: str  # note, call, email, meeting, file
    title: str
    description: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    meta_data: Optional[dict] = {}


class ActivityCreateSchema(ActivityBaseSchema):
    pass


class ActivitySchema(ActivityBaseSchema):
    id: str
    contact_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Contact Schemas
class ContactBaseSchema(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    avatar_url: Optional[str] = None
    custom_fields: Optional[List[Any]] = None
    source: Optional[str] = None

    @field_validator("email", "phone")
    @classmethod
    def validate_contact_info(cls, v, info):
        """Ensure at least email or phone is provided"""
        # This will be checked at the create level
        return v


class ContactCreateSchema(ContactBaseSchema):
    tags: Optional[List[str]] = []  # tag names to link


class ContactUpdateSchema(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    avatar_url: Optional[str] = None
    custom_fields: Optional[List[Any]] = None
    source: Optional[str] = None
    tags: Optional[List[str]] = None  # tag names
    status: Optional[str] = None


class ContactSchema(ContactBaseSchema):
    id: str
    status: str
    tags: List[TagSchema] = []
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ContactDetailSchema(ContactSchema):
    activities: List[ActivitySchema] = []


# Pipeline / Phase / Lead Schemas (Phase 2)
class PhaseSchema(BaseModel):
    id: str
    pipeline_id: str
    name: str
    color: Optional[str] = "#6b7280"
    position: Optional[int] = 0
    is_terminal: Optional[bool] = False

    class Config:
        from_attributes = True


class PipelineSchema(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner: Optional[str] = None

    class Config:
        from_attributes = True


class PipelineCreateSchema(BaseModel):
    name: str
    description: Optional[str] = None
    owner: Optional[str] = None


class PipelineUpdateSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None


class PhaseSchema(BaseModel):
    id: str
    pipeline_id: str
    name: str
    color: Optional[str] = "#6b7280"
    position: Optional[int] = 0
    is_terminal: Optional[bool] = False

    class Config:
        from_attributes = True


class PhaseCreateSchema(BaseModel):
    name: str
    color: Optional[str] = "#6b7280"
    position: Optional[int] = 0
    is_terminal: Optional[bool] = False


class PhaseUpdateSchema(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    position: Optional[int] = None
    is_terminal: Optional[bool] = None


class LeadBaseSchema(BaseModel):
    title: str
    contact_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    phase_id: Optional[str] = None
    value: Optional[int] = None
    expected_close_date: Optional[datetime] = None
    assignee: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    extra_data: Optional[dict] = {}


class LeadCreateSchema(LeadBaseSchema):
    pass


class LeadUpdateSchema(BaseModel):
    title: Optional[str] = None
    contact_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    phase_id: Optional[str] = None
    value: Optional[int] = None
    expected_close_date: Optional[datetime] = None
    assignee: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    extra_data: Optional[dict] = None


class LeadSchema(LeadBaseSchema):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



# Merge Request Schema
class MergeContactsSchema(BaseModel):
    primary_id: str
    secondary_id: str
    keep_fields: Optional[dict] = {}  # which fields to keep from secondary


# Bulk Action Schema
class BulkActionSchema(BaseModel):
    contact_ids: List[str]
    action: str  # tag, assign, export, archive
    action_data: Optional[dict] = {}
