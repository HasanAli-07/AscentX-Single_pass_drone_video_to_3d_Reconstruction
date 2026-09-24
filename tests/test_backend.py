import unittest
import numpy as np
import cv2
import sys, os, tempfile

sys.path.insert(0, os.path.abspath('backend'))
sys.path.insert(0, os.path.abspath('.'))

from app.services.project_service import project_service
from reconstruction.frame_selection.analyzer import FrameQualityAnalyzer
from reconstruction.calibration.intrinsics import CameraCalibrationService
from reconstruction.geospatial.crs import GeospatialTransformer
from reconstruction.pointcloud.filter import PointCloudFilterService
from reconstruction.depth.masking import DynamicObjectMasker
from reconstruction.mesh.exporter import ModelExportService

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

    def test_point_cloud_filter(self):
        pts = np.random.rand(100, 3) * 10.0
        pts[0] = [100.0, 100.0, 100.0]
        filter_svc = PointCloudFilterService()
        filtered, stats = filter_svc.process_point_cloud(pts)
        self.assertLess(len(filtered), len(pts))
        self.assertGreater(stats["outliers_removed"], 0)

    def test_dynamic_object_masker(self):
        masker = DynamicObjectMasker()
        dummy_img = np.zeros((200, 200, 3), dtype=np.uint8)
        cv2.rectangle(dummy_img, (50, 50), (100, 100), (255, 255, 255), -1)
        mask, objs = masker.detect_and_mask(dummy_img)
        self.assertEqual(mask.shape, (200, 200))
        self.assertGreater(len(objs), 0)

    def test_model_export_service(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            exporter = ModelExportService(tmp_dir)
            zip_path = exporter.create_export_bundle("PRJ-2026-004A", ["OBJ", "PLY", "GEOJSON"])
            self.assertTrue(os.path.exists(zip_path))
            self.assertGreater(os.path.getsize(zip_path), 0)

if __name__ == "__main__":
    unittest.main()
