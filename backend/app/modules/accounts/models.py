from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Numeric, DateTime
from sqlalchemy.orm import relationship
from app.core.base import BaseModel


class Tenant(BaseModel):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    status = Column(String(50), default="active", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    accounts = relationship("ChartOfAccount", back_populates="tenant")
    journal_entries = relationship("JournalEntry", back_populates="tenant")
    ledger_entries = relationship("LedgerEntry", back_populates="tenant")


class ChartOfAccount(BaseModel):
    __tablename__ = "chart_of_accounts"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    account_code = Column(String(50), nullable=False)
    account_name = Column(String(255), nullable=False)
    account_type = Column(String(50), nullable=False)
    parent_account_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    tenant = relationship("Tenant", back_populates="accounts")
    parent_account = relationship("ChartOfAccount", remote_side=[id], backref="sub_accounts")


class JournalEntry(BaseModel):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    reference = Column(String(255), nullable=True)
    description = Column(String(1024), nullable=True)
    status = Column(String(50), default="draft", nullable=False)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    posted_at = Column(DateTime, nullable=True)

    tenant = relationship("Tenant", back_populates="journal_entries")
    lines = relationship("JournalLine", back_populates="journal", cascade="all, delete-orphan")


class JournalLine(BaseModel):
    __tablename__ = "journal_lines"

    id = Column(Integer, primary_key=True, index=True)
    journal_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=False, index=True)
    memo = Column(String(255), nullable=True)
    debit = Column(Numeric(14, 2), default=0, nullable=False)
    credit = Column(Numeric(14, 2), default=0, nullable=False)

    journal = relationship("JournalEntry", back_populates="lines")
    account = relationship("ChartOfAccount")


class LedgerEntry(BaseModel):
    __tablename__ = "ledger_entries"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    journal_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="RESTRICT"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=False, index=True)
    debit = Column(Numeric(14, 2), default=0, nullable=False)
    credit = Column(Numeric(14, 2), default=0, nullable=False)
    posting_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    tenant = relationship("Tenant", back_populates="ledger_entries")
    journal = relationship("JournalEntry")
