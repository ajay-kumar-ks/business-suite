from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from app.core.config import settings

Base = declarative_base()

engine = create_engine(
    settings.DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)


# Development helper: set Nile tenant GUC on new connections so dev writes
# specify a tenant implicitly. This is safe for development only.
if settings.ENVIRONMENT == 'development':
    @event.listens_for(engine, 'connect')
    def _set_nile_tenant(dbapi_connection, connection_record):
        try:
            cur = dbapi_connection.cursor()
            try:
                cur.execute("SELECT set_config('nile.tenant_id', '1', false)")
            except Exception:
                cur.execute("SET nile.tenant_id = 1")
            cur.close()
        except Exception:
            # ignore if DB doesn't support Nile or SET fails
            pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
