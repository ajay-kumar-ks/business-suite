from datetime import datetime
from typing import List
from pydantic import BaseModel


class TrialBalanceReport(BaseModel):
    tenant_id: int
    accounts: List[dict]
    total_debit: float
    total_credit: float
    is_balanced: bool
    generated_at: str


class ProfitLossReport(BaseModel):
    tenant_id: int
    revenue: float
    expenses: float
    net_profit: float
    generated_at: str


class BalanceSheetReport(BaseModel):
    tenant_id: int
    assets: float
    liabilities: float
    equity: float
    is_balanced: bool
    generated_at: str
