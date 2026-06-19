from fastapi import FastAPI
from sqlalchemy import inspect, text
from app.core.config import settings
from app.core.event_bus import event_bus
from app.core.database import engine
from app.core.base import Base
from app.modules.auth.routers import router as auth_router
from app.modules.hr.routers import router as hr_router
from app.modules.accounts.routers import router as accounts_router
from app.modules.crm.routers import router as crm_router, leads_router as crm_leads_router, pipelines_router as crm_pipelines_router
from app.modules.tasks.routers import router as tasks_router

app = FastAPI(title="Business Suite Backend", version="0.1.0")

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["tasks"])
app.include_router(hr_router, prefix="/api/hr", tags=["hr"])
app.include_router(accounts_router, prefix="/api/accounts", tags=["accounts"])
app.include_router(crm_router, prefix="/api/crm", tags=["crm"])
app.include_router(crm_leads_router, prefix="/api/crm", tags=["crm"])
app.include_router(crm_pipelines_router, prefix="/api/crm", tags=["crm"])


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
        print("✓ Database tables created")
    except Exception as e:
        print(f"⚠ Database connection warning: {str(e)[:100]}")
        print("✓ Server started (database connection failed - check your DATABASE_URL credentials in .env)")
    
    event_bus.connect()


@app.on_event("shutdown")
async def shutdown_event():
    event_bus.disconnect()

