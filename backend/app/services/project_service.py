import os
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

from app.core.config import settings
from app.models.schemas import ProjectSummary, FrameMetric, FrameAnalysisResult, MeasurementItem, ModelMetadata
from reconstruction.frame_selection.analyzer import FrameQualityAnalyzer
from reconstruction.calibration.intrinsics import CameraCalibrationService
from reconstruction.mesh.processor import MeshProcessorService
from reconstruction.geospatial.crs import GeospatialTransformer

class ProjectService:
    """Project Data & Lifecycle Manager for AscentX."""
    
    def __init__(self):
        self.projects_db_file = settings.STORAGE_DIR / "projects.json"
        self._projects: Dict[str, Dict[str, Any]] = self._load_db()

    def _load_db(self) -> Dict[str, Dict[str, Any]]:
        if self.projects_db_file.exists():
            try:
                with open(self.projects_db_file, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        
        # Default seed project matching Figma design reference
        default_id = "PRJ-2026-004A"
        default_proj = {
            "id": default_id,
            "name": "scan_session_2024_11_08",
            "description": "Zurich MAV Drone Survey Scan",
            "created_at": "2026-09-13T09:31:00Z",
            "status": "COMPLETED",
            "coordinate_system": "WGS84 / UTM Zone 33N",
            "video_filename": "DJI_0042.MP4",
            "total_frames": 350,
            "selected_frames": 229,
            "sparse_points": 184392,
            "dense_points": 4200000,
            "has_gps": True,
            "has_imu": True,
            "has_calibration": True,
            "calibration": CameraCalibrationService().to_dict(),
            "georef": GeospatialTransformer().get_reference_location(),
            "measurements": [
                {
                    "id": "m1",
                    "project_id": default_id,
                    "type": "DISTANCE",
                    "label": "Facade Length",
                    "points": [[-40.0, 0.0, -42.0], [40.0, 0.0, -42.0]],
                    "value": 80.0,
                    "unit": "m",
                    "created_at": "2026-09-13T09:40:00Z"
                }
            ]
        }
        initial = {default_id: default_proj}
        self._save_db(initial)
        return initial

    def _save_db(self, data: Optional[Dict[str, Dict[str, Any]]] = None):
        if data is not None:
            self._projects = data
        with open(self.projects_db_file, "w") as f:
            json.dump(self._projects, f, indent=2)

    def list_projects(self) -> List[ProjectSummary]:
        return [
            ProjectSummary(
                id=p["id"],
                name=p["name"],
                created_at=p["created_at"],
                status=p["status"],
                video_filename=p.get("video_filename"),
                total_frames=p.get("total_frames", 0),
                selected_frames=p.get("selected_frames", 0),
                sparse_points=p.get("sparse_points", 0),
                dense_points=p.get("dense_points", 0),
                has_gps=p.get("has_gps", False),
                has_imu=p.get("has_imu", False),
                has_calibration=p.get("has_calibration", False)
            ) for p in self._projects.values()
        ]

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        return self._projects.get(project_id)

    def create_project(self, name: str, description: Optional[str] = None, crs: str = "WGS84 / UTM Zone 33N") -> Dict[str, Any]:
        proj_id = f"PRJ-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.utcnow().isoformat() + "Z"
        proj = {
            "id": proj_id,
            "name": name,
            "description": description,
            "created_at": now,
            "status": "CREATED",
            "coordinate_system": crs,
            "video_filename": None,
            "total_frames": 0,
            "selected_frames": 0,
            "sparse_points": 0,
            "dense_points": 0,
            "has_gps": False,
            "has_imu": False,
            "has_calibration": False,
            "calibration": CameraCalibrationService().to_dict(),
            "georef": GeospatialTransformer().get_reference_location(),
            "measurements": []
        }
        self._projects[proj_id] = proj
        self._save_db()
        return proj

    def run_frame_analysis(self, project_id: str) -> FrameAnalysisResult:
        proj = self.get_project(project_id)
        if not proj:
            raise ValueError(f"Project {project_id} not found")
            
        analyzer = FrameQualityAnalyzer()
        # Analyze Zurich sample dataset images if present or generate prototype benchmark
        metrics, df = analyzer.analyze_image_sequence(str(settings.DATASET_DIR / "MAV Images"))
        
        selected = [m for m in metrics if m["selection_type"] != "REJECTED"]
        rejected = [m for m in metrics if m["selection_type"] == "REJECTED"]
        
        # Update project record
        proj["total_frames"] = len(metrics)
        proj["selected_frames"] = len(selected)
        proj["status"] = "ANALYZED"
        self._save_db()
        
        reduction = round((len(rejected) / len(metrics) * 100.0), 1) if metrics else 0.0
        
        frame_objects = [FrameMetric(**m) for m in metrics]
        return FrameAnalysisResult(
            total_frames_extracted=len(metrics),
            selected_frames_count=len(selected),
            rejected_frames_count=len(rejected),
            reduction_percentage=reduction,
            frames=frame_objects
        )

    def add_measurement(self, project_id: str, m_type: str, label: str, points: List[List[float]], value: float, unit: str) -> MeasurementItem:
        proj = self.get_project(project_id)
        if not proj:
            raise ValueError(f"Project {project_id} not found")
            
        m_item = MeasurementItem(
            id=f"m_{uuid.uuid4().hex[:6]}",
            project_id=project_id,
            type=m_type,
            label=label,
            points=points,
            value=value,
            unit=unit,
            created_at=datetime.utcnow().isoformat() + "Z"
        )
        if "measurements" not in proj:
            proj["measurements"] = []
        proj["measurements"].append(m_item.dict())
        self._save_db()
        return m_item

    def get_model_metadata(self, project_id: str) -> ModelMetadata:
        proj_dir = settings.STORAGE_DIR / project_id
        obj_path = proj_dir / "model.obj"
        
        processor = MeshProcessorService(str(proj_dir))
        info = processor.generate_demo_mesh(str(obj_path))
        
        return ModelMetadata(
            project_id=project_id,
            mesh_url=f"/api/v1/projects/{project_id}/files/model.obj",
            num_vertices=info["num_vertices"],
            num_faces=info["num_faces"],
            density_pts_m3=1240.5,
            bounding_box_meters=info["bounding_box"]
        )

project_service = ProjectService()
