from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.modules.accounts.models import Tenant


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        tenant_id = request.headers.get("X-Tenant-ID")
        request.state.tenant_id = tenant_id
        request.state.tenant = None

        if tenant_id is not None:
            try:
                numeric_tenant_id = int(tenant_id)
            except ValueError:
                numeric_tenant_id = None

            if numeric_tenant_id is not None:
                db: Session = SessionLocal()
                try:
                    request.state.tenant = db.query(Tenant).filter(Tenant.id == numeric_tenant_id).first()
                finally:
                    db.close()

        return await call_next(request)


def get_current_tenant(request: Request) -> Tenant:
    tenant = getattr(request.state, "tenant", None)
    if tenant is None:
        raise ValueError("Tenant context is required. Provide X-Tenant-ID in the request headers.")
    return tenant
