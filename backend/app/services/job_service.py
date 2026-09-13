import asyncio
import uuid
import time
from typing import Dict, Any, List, Optional
from app.models.schemas import ReconstructionJob, PipelineStage

class JobService:
    """Async Job Orchestration & Progress Tracker for AscentX."""
    
    def __init__(self):
        self._jobs: Dict[str, Dict[str, Any]] = {}

    def create_reconstruction_job(self, project_id: str) -> ReconstructionJob:
        job_id = f"JOB-{uuid.uuid4().hex[:6].upper()}"
        stages = [
            PipelineStage(name="Frame Processing", status="COMPLETED", progress=100, elapsed_time="00:18", gpu_utilization=0, output_summary="350 frames decoded"),
            PipelineStage(name="Camera Calibration", status="COMPLETED", progress=100, elapsed_time="00:42", gpu_utilization=0, output_summary="fx=1450.0, fy=1450.0"),
            PipelineStage(name="SfM", status="COMPLETED", progress=100, elapsed_time="02:11", gpu_utilization=34, output_summary="184,392 sparse pts"),
            PipelineStage(name="AI Depth Estimation", status="COMPLETED", progress=100, elapsed_time="01:38", gpu_utilization=0, output_summary="DepthAnything v2 (CPU/GPU)"),
            PipelineStage(name="Dense MVS", status="COMPLETED", progress=100, elapsed_time="03:05", gpu_utilization=87, output_summary="Dense matching"),
            PipelineStage(name="Mesh Generation", status="RUNNING", progress=72, elapsed_time="00:44", gpu_utilization=78, output_summary="Poisson surface recon..."),
            PipelineStage(name="Texture Generation", status="QUEUED", progress=0, elapsed_time="—", gpu_utilization=0, output_summary="Pending"),
            PipelineStage(name="Georeferencing", status="QUEUED", progress=0, elapsed_time="—", gpu_utilization=0, output_summary="Pending"),
        ]
        
        job_dict = {
            "job_id": job_id,
            "project_id": project_id,
            "status": "RUNNING",
            "current_stage": "Mesh Generation",
            "progress": 72.0,
            "elapsed_seconds": 518.0,
            "stages": [s.dict() for s in stages],
            "error_message": None
        }
        self._jobs[job_id] = job_dict
        return ReconstructionJob(**job_dict)

    def get_job(self, job_id: str) -> Optional[ReconstructionJob]:
        job = self._jobs.get(job_id)
        if job:
            return ReconstructionJob(**job)
        return None

    def list_project_jobs(self, project_id: str) -> List[ReconstructionJob]:
        return [
            ReconstructionJob(**j) for j in self._jobs.values()
            if j["project_id"] == project_id
        ]

    def pause_job(self, job_id: str) -> Optional[ReconstructionJob]:
        job = self._jobs.get(job_id)
        if job:
            job["status"] = "PAUSED"
            return ReconstructionJob(**job)
        return None

    def cancel_job(self, job_id: str) -> Optional[ReconstructionJob]:
        job = self._jobs.get(job_id)
        if job:
            job["status"] = "CANCELLED"
            return ReconstructionJob(**job)
        return None

job_service = JobService()
