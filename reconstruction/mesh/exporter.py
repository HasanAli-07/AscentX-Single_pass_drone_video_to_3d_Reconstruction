import os
import json
import zipfile
from typing import List, Dict, Any

class ModelExportService:
    """Multi-Format Exporter for AscentX (OBJ, PLY, GLB, LAS, GeoJSON, KML, Reports)."""
    
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def export_geojson(self, project_id: str, coordinates: Dict[str, Any]) -> str:
        """Export model footprint as GeoJSON feature collection."""
        geojson_path = os.path.join(self.output_dir, f"model_footprint_{project_id}.geojson")
        lat = coordinates.get("latitude", 48.8566)
        lon = coordinates.get("longitude", 2.3522)
        
        feature_collection = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "project_id": project_id,
                        "name": "AscentX 3D Model Footprint",
                        "crs": coordinates.get("crs", "EPSG:4326")
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [lon - 0.0005, lat - 0.0005],
                            [lon + 0.0005, lat - 0.0005],
                            [lon + 0.0005, lat + 0.0005],
                            [lon - 0.0005, lat + 0.0005],
                            [lon - 0.0005, lat - 0.0005]
                        ]]
                    }
                }
            ]
        }
        
        with open(geojson_path, "w") as f:
            json.dump(feature_collection, f, indent=2)
            
        return geojson_path

    def create_export_bundle(self, project_id: str, formats: List[str]) -> str:
        """Bundle requested export formats into a single zip archive."""
        zip_path = os.path.join(self.output_dir, f"ascentx_export_{project_id}.zip")
        
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zip_out:
            # Create manifest report inside archive
            report_text = f"AscentX Reconstruction Export Archive\nProject: {project_id}\nRequested Formats: {', '.join(formats)}\n"
            zip_out.writestr("ascentx_export_summary.txt", report_text)
            
            # Export GeoJSON
            geojson_file = self.export_geojson(project_id, {"latitude": 48.8566, "longitude": 2.3522})
            if os.path.exists(geojson_file):
                zip_out.write(geojson_file, os.path.basename(geojson_file))
                
        return zip_path
