import os
import subprocess
from typing import Dict, Any, List

class ColmapPipelineWrapper:
    """COLMAP Structure-from-Motion and Multi-View Stereo Automation Wrapper."""
    
    def __init__(self, workspace_path: str, colmap_bin: str = "colmap"):
        self.workspace_path = workspace_path
        self.colmap_bin = colmap_bin
        self.db_path = os.path.join(workspace_path, "database.db")
        self.image_path = os.path.join(workspace_path, "images")
        self.sparse_path = os.path.join(workspace_path, "sparse")
        self.dense_path = os.path.join(workspace_path, "dense")
        
        os.makedirs(self.sparse_path, exist_ok=True)
        os.makedirs(self.dense_path, exist_ok=True)

    def is_colmap_installed(self) -> bool:
        """Check if COLMAP executable is available on PATH."""
        try:
            res = subprocess.run([self.colmap_bin, "-h"], capture_output=True, text=True)
            return res.returncode == 0
        except FileNotFoundError:
            return False

    def run_feature_extraction(self, camera_model: str = "PINHOLE") -> bool:
        """Run COLMAP feature_extractor."""
        if not self.is_colmap_installed():
            return False
        cmd = [
            self.colmap_bin, "feature_extractor",
            "--database_path", self.db_path,
            "--image_path", self.image_path,
            "--ImageReader.camera_model", camera_model
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        return res.returncode == 0

    def run_exhaustive_matcher(self) -> bool:
        """Run COLMAP exhaustive_matcher."""
        if not self.is_colmap_installed():
            return False
        cmd = [
            self.colmap_bin, "exhaustive_matcher",
            "--database_path", self.db_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        return res.returncode == 0

    def run_mapper(self) -> bool:
        """Run COLMAP mapper for sparse SfM reconstruction."""
        if not self.is_colmap_installed():
            return False
        cmd = [
            self.colmap_bin, "mapper",
            "--database_path", self.db_path,
            "--image_path", self.image_path,
            "--output_path", self.sparse_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        return res.returncode == 0
