import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, Field
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOTENV_PATH = os.path.join(BASE_DIR, ".env")
ROOT_DOTENV_PATH = os.path.join(os.path.dirname(BASE_DIR), ".env")
ROOT_ENV_LOCAL_PATH = os.path.join(os.path.dirname(BASE_DIR), ".env.local")
for dotenv_path in [DOTENV_PATH, ROOT_DOTENV_PATH, ROOT_ENV_LOCAL_PATH]:
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path, override=False)


class Settings(BaseSettings):
    SECRET_KEY: str = "supersecretkey"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "postgresql://019ed474-e73f-7f9d-bbd0-78c5caa0889b:f8f038b7-d6a1-4c67-84ad-01eeb019ef06@us-west-2.db.thenile.dev:5432/business_suite_db"
    DATABASE_NAME: str = "business_suite_db"
    DATABASE_SSLMODE: str = "require"
    SUPABASE_DATABASE_URL: str = "postgresql://postgres.ykumusptahqbjoroocmj:ajayadishnabeelabhijith@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
    API_HOST: str = ""
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_API_KEY2: str = ""
    OPENAI_API_KEY: str = ""

    ACCOUNTS_OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    EVENT_BUS_URL: str = "memory://local"
    ENVIRONMENT: str = "development"
    RAZORPAY_KEY_ID: str = "rzp_test_T5O7M81YGrowq2"
    RAZORPAY_KEY_SECRET: str = "E7H9HK1GZNMknGHeb9E0h1PX"

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"

    SUPABASE_URL: str = Field(default="", alias="NEXT_PUBLIC_SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = Field(default="", alias="NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    VECTOR_TABLE: str = "search_documents"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536

    model_config = ConfigDict(env_file=DOTENV_PATH, extra="ignore")


settings = Settings()
