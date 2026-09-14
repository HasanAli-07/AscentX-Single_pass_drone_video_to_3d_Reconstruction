from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str = Field(..., example="scan_session_2026_09_13")
    description: Optional[str] = None
    coordinate_system: str = "WGS84 / UTM Zone 33N"

class ProjectSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: str
    status: str  # CREATED, UPLOADED, ANALYZED, RECONSTRUCTED, COMPLETED
    coordinate_system: str = "WGS84 / UTM Zone 33N"
    video_filename: Optional[str] = None
    video_url: Optional[str] = None
    video_resolution: Optional[str] = "3840x2160"
    video_fps: Optional[float] = 30.0
    video_duration_sec: Optional[float] = 262.0
    video_file_size_mb: Optional[float] = 2800.0
    video_codec: Optional[str] = "H.264 / AVC"
    total_frames: int = 0
    selected_frames: int = 0
    sparse_points: int = 0
    dense_points: int = 0
    has_gps: bool = False
    has_imu: bool = False
    has_calibration: bool = False
    camera_model: Optional[str] = "DJI FC3411 (24mm)"
    camera_focal_mm: Optional[float] = 24.0
    latitude_deg: Optional[float] = 48.8566
    longitude_deg: Optional[float] = 2.3522
    altitude_m: Optional[float] = 82.4
    flight_speed_mps: Optional[float] = 6.2

class VideoMetadata(BaseModel):
    filename: str
    resolution: str
    fps: float
    duration_seconds: float
    total_frames: int
    file_size_mb: float
    codec: str
    has_exif_gps: bool

class CalibrationParams(BaseModel):
    fx: float = 1450.0
    fy: float = 1450.0
    cx: float = 960.0
    cy: float = 540.0
    k1: float = 0.0
    k2: float = 0.0
    p1: float = 0.0
    p2: float = 0.0
    source: str = "DEFAULT_MAV"

class FrameMetric(BaseModel):
    frame_number: int
    filename: str
    timestamp_sec: float
    sharpness: float
    brightness: float
    contrast: float
    ssim_similarity: float
    novelty_score: float
    quality_score: float
    final_score: float
    selection_type: str  # SELECTED_KEY, SELECTED_SUPPORT, SELECTED_COVERAGE, REJECTED

class FrameAnalysisResult(BaseModel):
    total_frames_extracted: int
    selected_frames_count: int
    rejected_frames_count: int
    reduction_percentage: float
    frames: List[FrameMetric]

class PipelineStage(BaseModel):
    name: str
    status: str  # QUEUED, RUNNING, COMPLETED, FAILED
    progress: float  # 0 to 100
    elapsed_time: str
    gpu_utilization: int
    output_summary: str

class ReconstructionJob(BaseModel):
    job_id: str
    project_id: str
    status: str  # CREATED, QUEUED, RUNNING, PAUSED, COMPLETED, FAILED
    current_stage: str
    progress: float
    elapsed_seconds: float
    stages: List[PipelineStage]
    error_message: Optional[str] = None

class MeasurementCreate(BaseModel):
    project_id: str
    type: str  # DISTANCE, AREA, HEIGHT, VOLUME, COORDINATE
    label: str
    points: List[List[float]]
    value: float
    unit: str

class MeasurementItem(MeasurementCreate):
    id: str
    created_at: str

class ModelMetadata(BaseModel):
    project_id: str
    point_cloud_url: Optional[str] = None
    mesh_url: Optional[str] = None
    texture_url: Optional[str] = None
    num_vertices: int = 0
    num_faces: int = 0
    density_pts_m3: float = 0.0
    bounding_box_meters: List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])

class ExportRequest(BaseModel):
    project_id: str
    formats: List[str]  # OBJ, PLY, GLB, LAS, GEOJSON, KML, REPORT_PDF
