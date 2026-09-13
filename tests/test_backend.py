import unittest
import numpy as np
import cv2
import sys, os

sys.path.insert(0, os.path.abspath('backend'))
sys.path.insert(0, os.path.abspath('.'))

from app.services.project_service import project_service
from reconstruction.frame_selection.analyzer import FrameQualityAnalyzer
from reconstruction.calibration.intrinsics import CameraCalibrationService
from reconstruction.geospatial.crs import GeospatialTransformer

class TestAscentXBackend(unittest.TestCase):
    def test_project_service_list(self):
        projects = project_service.list_projects()
        self.assertGreater(len(projects), 0)
        self.assertEqual(projects[0].id, "PRJ-2026-004A")

    def test_frame_quality_analyzer(self):
        analyzer = FrameQualityAnalyzer()
        dummy_gray = np.full((100, 100), 128, dtype=np.uint8)
        sharp = analyzer.calculate_sharpness(dummy_gray)
        bright = analyzer.calculate_brightness(dummy_gray)
        self.assertAlmostEqual(bright, 0.5, places=2)

    def test_camera_calibration(self):
        calib = CameraCalibrationService(fx=1000.0, fy=1000.0, cx=500.0, cy=500.0)
        K = calib.get_camera_matrix()
        self.assertEqual(K[0, 0], 1000.0)
        self.assertEqual(K[0, 2], 500.0)

    def test_geospatial_transformer(self):
        geo = GeospatialTransformer(lat=47.3769, lon=8.5417)
        ref = geo.get_reference_location()
        self.assertEqual(ref["latitude"], 47.3769)
        self.assertIn("utm_zone", ref)

if __name__ == "__main__":
    unittest.main()
