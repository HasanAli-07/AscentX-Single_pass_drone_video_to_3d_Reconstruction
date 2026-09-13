import os
import numpy as np
import cv2
from typing import Dict, Any, Optional

class CameraCalibrationService:
    """Camera Calibration & Image Undistortion Engine for AscentX."""
    
    def __init__(self, fx: float = 1450.0, fy: float = 1450.0, cx: float = 960.0, cy: float = 540.0,
                 k1: float = 0.0, k2: float = 0.0, p1: float = 0.0, p2: float = 0.0):
        self.fx = fx
        self.fy = fy
        self.cx = cx
        self.cy = cy
        self.k1 = k1
        self.k2 = k2
        self.p1 = p1
        self.p2 = p2

    @classmethod
    def load_from_npz(cls, npz_path: str) -> "CameraCalibrationService":
        """Load calibration matrices from npz file (like in Zurich AGZ dataset)."""
        if os.path.exists(npz_path):
            data = np.load(npz_path)
            # Support common npz keys: K, dist, intrinsics, etc.
            K = data.get("K", data.get("camera_matrix", None))
            dist = data.get("dist", data.get("distortion_coefficients", None))
            if K is not None:
                fx = float(K[0, 0])
                fy = float(K[1, 1])
                cx = float(K[0, 2])
                cy = float(K[1, 2])
                k1 = float(dist[0]) if dist is not None and len(dist) > 0 else 0.0
                k2 = float(dist[1]) if dist is not None and len(dist) > 1 else 0.0
                p1 = float(dist[2]) if dist is not None and len(dist) > 2 else 0.0
                p2 = float(dist[3]) if dist is not None and len(dist) > 3 else 0.0
                return cls(fx, fy, cx, cy, k1, k2, p1, p2)
        return cls()

    def get_camera_matrix(self) -> np.ndarray:
        return np.array([
            [self.fx, 0.0,     self.cx],
            [0.0,     self.fy, self.cy],
            [0.0,     0.0,     1.0]
        ], dtype=np.float64)

    def get_dist_coeffs(self) -> np.ndarray:
        return np.array([self.k1, self.k2, self.p1, self.p2], dtype=np.float64)

    def undistort_image(self, image: np.ndarray) -> np.ndarray:
        """Undistort image given current intrinsic parameters."""
        K = self.get_camera_matrix()
        dist = self.get_dist_coeffs()
        h, w = image.shape[:2]
        new_K, roi = cv2.getOptimalNewCameraMatrix(K, dist, (w, h), 1, (w, h))
        undistorted = cv2.undistort(image, K, dist, None, new_K)
        return undistorted

    def to_dict(self) -> Dict[str, float]:
        return {
            "fx": self.fx,
            "fy": self.fy,
            "cx": self.cx,
            "cy": self.cy,
            "k1": self.k1,
            "k2": self.k2,
            "p1": self.p1,
            "p2": self.p2,
        }
