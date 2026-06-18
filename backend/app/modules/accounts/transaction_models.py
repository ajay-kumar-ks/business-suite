from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.base import BaseModel


class Expense(BaseModel):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    expense_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    account_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=False)
    reference = Column(String(255), nullable=True)
    journal_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    status = Column(String(50), default="draft", nullable=False)

    account = relationship("ChartOfAccount")
    journal = relationship("JournalEntry")


class Income(BaseModel):
    __tablename__ = "income"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    income_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    account_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=False)
    reference = Column(String(255), nullable=True)
    journal_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    status = Column(String(50), default="draft", nullable=False)

    account = relationship("ChartOfAccount")
    journal = relationship("JournalEntry")
