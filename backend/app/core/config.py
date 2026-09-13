import os
from pathlib import Path
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseModel as BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AscentX 3D Drone Reconstruction Engine"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "ascentx-secret-key-change-in-production-2026"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    STORAGE_DIR: Path = BASE_DIR / "storage"
    DATASET_DIR: Path = Path("e:/AscentX_Sample_Dataset_Zurich/AGZ_subset")
    
    REDIS_URL: str = "redis://localhost:6379/0"
    ENABLE_GPU: bool = False
    DEFAULT_SAMPLE_RATE: int = 1

settings = Settings()
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
