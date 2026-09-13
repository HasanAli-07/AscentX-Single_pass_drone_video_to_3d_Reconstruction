export type Section =
  | "project"
  | "input"
  | "frames"
  | "reconstruction"
  | "analysis"
  | "georef"
  | "visualization"
  | "measurements"
  | "reports"
  | "export";

export type DisplayMode = "TEXTURED" | "SOLID" | "WIRE" | "POINT CLOUD" | "CONFIDENCE";
export type ViewToggle = "grid" | "axes" | "cameras" | "flightpath" | "bbox" | "measurements";

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  status: string;
  coordinate_system: string;
  video_filename?: string;
  total_frames: number;
  selected_frames: number;
  sparse_points: number;
  dense_points: number;
  has_gps: boolean;
  has_imu: boolean;
  has_calibration: boolean;
}

export interface FrameMetric {
  frame_number: number;
  filename: string;
  timestamp_sec: number;
  sharpness: number;
  brightness: number;
  contrast: number;
  ssim_similarity: number;
  novelty_score: number;
  quality_score: number;
  final_score: number;
  selection_type: "SELECTED_KEY" | "SELECTED_SUPPORT" | "SELECTED_COVERAGE" | "REJECTED";
}

export interface PipelineStage {
  name: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  elapsed_time: string;
  gpu_utilization: number;
  output_summary: string;
}

export interface ReconstructionJob {
  job_id: string;
  project_id: string;
  status: string;
  current_stage: string;
  progress: number;
  elapsed_seconds: number;
  stages: PipelineStage[];
  error_message?: string;
}

export interface Measurement {
  id: string;
  project_id: string;
  type: string;
  label: string;
  points: number[][];
  value: number;
  unit: string;
  created_at: string;
}
