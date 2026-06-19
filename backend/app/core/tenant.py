import uuid
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, current_tenant
from app.modules.accounts.models import Tenant


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        tenant_id_str = request.headers.get("X-Tenant-ID")
        request.state.tenant_id = tenant_id_str
        request.state.tenant = None

        token = None
        
        # For Accounts module routes, if no tenant is provided, use the default tenant
        # for in-app filtering only. Do not set the Nile tenant GUC unless the request
        # explicitly includes X-Tenant-ID.
        is_accounts_route = request.url.path.startswith("/api/accounts")
        if tenant_id_str is None and is_accounts_route:
            try:
                db: Session = SessionLocal()
                try:
                    default_tenant = db.query(Tenant).order_by(Tenant.created_at).first()
                    if default_tenant:
                        request.state.tenant = default_tenant
                finally:
                    db.close()
            except Exception:
                pass
        
        if tenant_id_str is not None:
            try:
                tenant_uuid = uuid.UUID(tenant_id_str)
                # set the context var so the DB connection checkout listener
                # will run `SET nile.tenant_id = ...` for this request
                token = current_tenant.set(tenant_uuid)

                db: Session = SessionLocal()
                try:
                    if request.state.tenant is None:
                        request.state.tenant = db.query(Tenant).filter(Tenant.id == tenant_uuid).first()
                finally:
                    db.close()
            except (ValueError, AttributeError):
                pass

        try:
            return await call_next(request)
        finally:
            # Reset the contextvar to previous value if we set it
            if token is not None:
                try:
                    current_tenant.reset(token)
                except Exception:
                    pass


def get_current_tenant(request: Request) -> Tenant:
    tenant = getattr(request.state, "tenant", None)
    if tenant is None:
        raise ValueError("Tenant context is required. Provide a valid X-Tenant-ID in the request headers.")
    return tenant
