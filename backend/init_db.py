from app.core.database import engine
from app.core.base import Base
from app.modules.auth.db_models import User as UserModel
from app.modules.tasks.db_models import Task as TaskModel


def init_db():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
    print("Database initialized successfully")


if __name__ == "__main__":
    init_db()
