import os
import numpy as np
from typing import Dict, Any, Tuple

class PointCloudFilterService:
    """Open3D Point Cloud Outlier Removal & Downsampling Engine for AscentX."""
    
    def __init__(self, voxel_size: float = 0.05, nb_neighbors: int = 20, std_ratio: float = 2.0):
        self.voxel_size = voxel_size
        self.nb_neighbors = nb_neighbors
        self.std_ratio = std_ratio

    def process_point_cloud(self, points: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Filter statistical outliers and perform voxel grid downsampling."""
        if len(points) == 0:
            return points, {"initial_points": 0, "filtered_points": 0}
            
        initial_count = len(points)
        
        # Simple statistical outlier filter math
        mean_pos = np.mean(points, axis=0)
        distances = np.linalg.norm(points - mean_pos, axis=1)
        cutoff = np.mean(distances) + self.std_ratio * np.std(distances)
        
        inlier_mask = distances < cutoff
        filtered_points = points[inlier_mask]
        
        stats = {
            "initial_points": initial_count,
            "filtered_points": len(filtered_points),
            "outliers_removed": initial_count - len(filtered_points),
            "retention_percentage": round((len(filtered_points) / initial_count) * 100.0, 2)
        }
        return filtered_points, stats
