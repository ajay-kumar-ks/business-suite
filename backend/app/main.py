import os
import asyncio
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from app.core.config import settings
from app.core.event_bus import event_bus
from app.core.event_handlers import register_event_handlers
from app.core.database import engine
from app.core.base import Base
from app.core.tenant import TenantMiddleware
from app.modules.auth.routers import router as auth_router
from app.modules.hr.routers import router as hr_router
from app.modules.accounts.routers import router as accounts_router
from app.modules.crm.routers import router as crm_router, leads_router as crm_leads_router, pipelines_router as crm_pipelines_router, clients_router as crm_clients_router
from app.modules.tasks.routers import router as tasks_router
from app.modules.tasks.upload import router as upload_router
from app.modules.tasks.scheduler import run_overdue_scheduler
from app.modules.tasks.event_handlers import register_handlers
from app.modules.recruitment.routers import router as recruitment_router

app = FastAPI(title="Business Suite Backend", version="0.1.0")

# CORS Middleware must be added FIRST (middleware is applied in reverse order)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Then add other middleware
app.add_middleware(TenantMiddleware)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
app.include_router(hr_router, prefix="/hr", tags=["hr"])
app.include_router(accounts_router, prefix="/accounts", tags=["accounts"])
app.include_router(crm_router, prefix="/crm", tags=["crm"])
app.include_router(crm_leads_router, prefix="/crm", tags=["crm"])
app.include_router(crm_pipelines_router, prefix="/crm", tags=["crm"])
app.include_router(crm_clients_router, prefix="/crm", tags=["crm"])
app.include_router(upload_router, prefix="/tasks", tags=["tasks"])
app.include_router(recruitment_router, prefix="/recruitment", tags=["recruitment"])

# Also expose same API under /api/* so frontend can use /api prefixes
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["tasks"])
app.include_router(hr_router, prefix="/api/hr", tags=["hr"])
app.include_router(accounts_router, prefix="/api/accounts", tags=["accounts"])
app.include_router(crm_router, prefix="/api/crm", tags=["crm"])
app.include_router(crm_leads_router, prefix="/api/crm", tags=["crm"])
app.include_router(crm_pipelines_router, prefix="/api/crm", tags=["crm"])
app.include_router(crm_clients_router, prefix="/api/crm", tags=["crm"])
app.include_router(recruitment_router, prefix="/api/recruitment", tags=["recruitment"])

# Serve uploaded files
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


@app.on_event("startup")
async def startup_event():
    try:
        inspector = inspect(engine)
        if 'contacts' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('contacts')]
            if 'deleted_at' not in columns:
                with engine.begin() as conn:
                    conn.execute(text('ALTER TABLE contacts ADD COLUMN deleted_at TIMESTAMP NULL'))
                    print('✓ Added missing contacts.deleted_at column')
        Base.metadata.create_all(bind=engine)
        print("[OK] Database tables created")
    except Exception as e:
        print(f"[WARN] Database connection warning: {str(e)[:100]}")
        print("[OK] Server started (database connection failed - check your DATABASE_URL credentials in .env)")

    register_event_handlers()
    event_bus.connect()

    # Register tasks module event handlers
    register_handlers()

    # Start overdue task scheduler
    asyncio.create_task(run_overdue_scheduler())


@app.on_event("shutdown")
async def shutdown_event():
    event_bus.disconnect()

