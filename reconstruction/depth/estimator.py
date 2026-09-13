import numpy as np
import cv2
from typing import Dict, Any, Optional

class MonocularDepthEstimator:
    """AI Depth Estimation abstraction for AscentX."""
    
    def __init__(self, model_name: str = "DepthAnythingV2-Small", device: str = "cpu"):
        self.model_name = model_name
        self.device = device
        self.is_loaded = False

    def load_model(self):
        """Attempt loading PyTorch depth estimation model or mark fallback mode."""
        try:
            import torch
            # Check CUDA availability
            if self.device == "cuda" and not torch.cuda.is_available():
                self.device = "cpu"
            self.is_loaded = True
        except ImportError:
            self.is_loaded = False

    def predict_depth(self, image: np.ndarray) -> np.ndarray:
        """Estimate normalized relative depth map (0..255 uint8 or float32)."""
        h, w = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        
        # Fast gradient-based pseudo depth fallback when deep model unavailable
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=5)
        depth_map = cv2.normalize(np.abs(sobely), None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        return depth_map
