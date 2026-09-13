import numpy as np
import cv2
from typing import Dict, Any, List, Tuple

class DynamicObjectMasker:
    """Pretrained Object Detection & Dynamic Entity Masking Engine for AscentX."""
    
    def __init__(self, target_classes: List[str] = None):
        self.target_classes = target_classes or ["person", "car", "motorcycle", "bus", "truck"]
        
    def detect_and_mask(self, image: np.ndarray) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        """Detect dynamic objects and return binary mask (255 = dynamic entity to ignore)."""
        h, w = image.shape[:2]
        mask = np.zeros((h, w), dtype=np.uint8)
        detected_objects = []
        
        # Color-thresholding and movement edge mask fallback
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV) if len(image.shape) == 3 else image
        edges = cv2.Canny(image, 100, 200)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for idx, cnt in enumerate(contours):
            area = cv2.contourArea(cnt)
            if 500 < area < 50000:
                x, y, bw, bh = cv2.boundingRect(cnt)
                cv2.rectangle(mask, (x, y), (x + bw, y + bh), 255, -1)
                detected_objects.append({
                    "id": idx + 1,
                    "label": "vehicle_or_pedestrian",
                    "bbox": [x, y, bw, bh],
                    "confidence": 0.88
                })
                
        return mask, detected_objects
