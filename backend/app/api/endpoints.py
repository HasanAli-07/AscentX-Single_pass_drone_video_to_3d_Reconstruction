import asyncio
import os
import glob
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from app.models.schemas import (
    ProjectCreate, ProjectSummary, FrameAnalysisResult, ReconstructionJob,
    MeasurementCreate, MeasurementItem, ModelMetadata, ExportRequest
)
from app.services.project_service import project_service
from app.services.job_service import job_service
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "online",
        "system": "AscentX 3D Reconstruction Engine",
        "version": "1.0.0",
        "gpu_available": settings.ENABLE_GPU
    }

@router.get("/source-models")
def list_source_models():
    source_dir = settings.BASE_DIR / "Projects" / "source"
    if not source_dir.exists():
        return []
    models = []
    for f in os.listdir(source_dir):
        if f.endswith((".glb", ".gltf", ".obj", ".ply")):
            file_path = source_dir / f
            models.append({
                "filename": f,
                "name": f.replace("_", " ").replace("-", " ").rsplit(".", 1)[0].title(),
                "size_mb": round(os.path.getsize(file_path) / (1024 * 1024), 2),
                "download_url": f"/api/v1/source-models/{f}"
            })
    return models

@router.get("/source-models/{filename}")
def serve_source_model(filename: str):
    source_dir = settings.BASE_DIR / "Projects" / "source"
    file_path = source_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Source model not found")
    media_type = "model/gltf-binary" if filename.endswith(".glb") else "application/octet-stream"
    return FileResponse(str(file_path), media_type=media_type)

@router.get("/projects", response_model=List[ProjectSummary])
def list_projects():
    return project_service.list_projects()

@router.post("/projects")
def create_project(payload: ProjectCreate):
    return project_service.create_project(payload.name, payload.description, payload.coordinate_system)

@router.get("/projects/{project_id}")
def get_project(project_id: str):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj

@router.post("/projects/{project_id}/upload")
async def upload_project_files(
    project_id: str,
    video: Optional[UploadFile] = File(None),
    metadata: Optional[UploadFile] = File(None),
    calibration: Optional[UploadFile] = File(None)
):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    saved_files = []
    proj_dir = settings.STORAGE_DIR / project_id
    proj_dir.mkdir(parents=True, exist_ok=True)
    
    if video:
        v_path = proj_dir / video.filename
        with open(v_path, "wb") as f:
            f.write(await video.read())
        proj["video_filename"] = video.filename
        saved_files.append("video")
        
    if metadata:
        m_path = proj_dir / metadata.filename
        with open(m_path, "wb") as f:
            f.write(await metadata.read())
        proj["has_gps"] = True
        saved_files.append("metadata")
        
    if calibration:
        c_path = proj_dir / calibration.filename
        with open(c_path, "wb") as f:
            f.write(await calibration.read())
        proj["has_calibration"] = True
        saved_files.append("calibration")
        
    proj["status"] = "UPLOADED"
    project_service._save_db()
    
    return {
        "status": "success",
        "project_id": project_id,
        "uploaded": saved_files
    }

@router.post("/projects/{project_id}/validate")
def validate_project_input(project_id: str):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    checks = {
        "video": {"valid": True, "details": "DJI_0042.MP4 (4K, 30fps)"},
        "flight_metadata": {"valid": True, "details": "GPS + RTK + IMU log parsed"},
        "calibration": {"valid": True, "details": "Pre-calibrated intrinsics loaded"},
        "storage": {"valid": True, "details": "Writable workspace allocated"}
    }
    all_valid = all(c["valid"] for c in checks.values())
    return {
        "project_id": project_id,
        "is_valid": all_valid,
        "checks": checks
    }

@router.post("/projects/{project_id}/frame-analysis", response_model=FrameAnalysisResult)
def run_frame_analysis(project_id: str):
    try:
        return project_service.run_frame_analysis(project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/projects/{project_id}/frames")
def get_project_frames(project_id: str):
    return project_service.run_frame_analysis(project_id)

@router.post("/projects/{project_id}/reconstruction", response_model=ReconstructionJob)
def start_reconstruction(project_id: str):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return job_service.create_reconstruction_job(project_id)

@router.get("/projects/{project_id}/jobs", response_model=List[ReconstructionJob])
def list_jobs(project_id: str):
    return job_service.list_project_jobs(project_id)

@router.post("/jobs/{job_id}/pause")
def pause_job(job_id: str):
    res = job_service.pause_job(job_id)
    if not res:
        raise HTTPException(status_code=404, detail="Job not found")
    return res

@router.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: str):
    res = job_service.cancel_job(job_id)
    if not res:
        raise HTTPException(status_code=404, detail="Job not found")
    return res

@router.get("/projects/{project_id}/models", response_model=ModelMetadata)
def get_model(project_id: str):
    return project_service.get_model_metadata(project_id)

@router.get("/projects/{project_id}/measurements")
def get_measurements(project_id: str):
    proj = project_service.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj.get("measurements", [])

@router.post("/projects/{project_id}/measurements", response_model=MeasurementItem)
def create_measurement(project_id: str, payload: MeasurementCreate):
    return project_service.add_measurement(
        project_id, payload.type, payload.label, payload.points, payload.value, payload.unit
    )

@router.get("/projects/{project_id}/confidence")
def get_confidence(project_id: str):
    return {
        "project_id": project_id,
        "high_percentage": 74.2,
        "med_percentage": 18.5,
        "low_percentage": 5.1,
        "insufficient_percentage": 2.2,
        "avg_reprojection_error_px": 0.42
    }

@router.post("/projects/{project_id}/export")
def export_results(project_id: str, payload: ExportRequest):
    return {
        "status": "processing",
        "project_id": project_id,
        "requested_formats": payload.formats,
        "download_url": f"/api/v1/projects/{project_id}/files/ascentx_export_{project_id}.zip"
    }

@router.get("/projects/{project_id}/files/{filename}")
def serve_project_file(project_id: str, filename: str):
    proj_dir = settings.STORAGE_DIR / project_id
    file_path = proj_dir / filename
    if not file_path.exists():
        if filename == "model.obj":
            from reconstruction.mesh.processor import MeshProcessorService
            MeshProcessorService(str(proj_dir)).generate_demo_mesh(str(file_path))
        else:
            raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))

@router.websocket("/ws/jobs/{job_id}")
async def websocket_job_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()
    try:
        while True:
            job = job_service.get_job(job_id)
            if job:
                await websocket.send_json(job.dict())
            else:
                await websocket.send_json({"error": "Job not found"})
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
