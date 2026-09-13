import os
import numpy as np
from typing import Dict, Any, Tuple

class MeshProcessorService:
    """3D Geometry, Point Cloud & Mesh Processing Service for AscentX."""
    
    def __init__(self, workspace_dir: str):
        self.workspace_dir = workspace_dir

    def generate_demo_mesh(self, output_obj_path: str) -> Dict[str, Any]:
        """Generate or load valid 3D mesh OBJ for project visualizer."""
        os.makedirs(os.path.dirname(output_obj_path), exist_ok=True)
        
        # If existing sample mesh is available at root e:\AscendX_UltraClean_Final.obj, copy/link or generate OBJ
        sample_source = "e:/AscendX_UltraClean_Final.obj"
        if os.path.exists(sample_source):
            with open(sample_source, "r") as f_in, open(output_obj_path, "w") as f_out:
                f_out.write(f_in.read())
            
            # Count vertices and faces
            verts, faces = 0, 0
            with open(output_obj_path, "r") as f:
                for line in f:
                    if line.startswith("v "):
                        verts += 1
                    elif line.startswith("f "):
                        faces += 1
            return {
                "mesh_path": output_obj_path,
                "num_vertices": verts,
                "num_faces": faces,
                "bounding_box": [110.0, 240.0, 90.0]
            }

        # Baseline parametric building mesh generator
        verts = []
        faces = []
        
        # Box building geometry
        w, h, d = 40.0, 80.0, 30.0
        corners = [
            [-w/2, 0, -d/2], [w/2, 0, -d/2], [w/2, 0, d/2], [-w/2, 0, d/2],
            [-w/2, h, -d/2], [w/2, h, -d/2], [w/2, h, d/2], [-w/2, h, d/2],
        ]
        for c in corners:
            verts.append(f"v {c[0]:.4f} {c[1]:.4f} {c[2]:.4f}")
            
        box_faces = [
            [1, 2, 3], [1, 3, 4],  # bottom
            [5, 8, 7], [5, 7, 6],  # top
            [1, 5, 6], [1, 6, 2],  # front
            [2, 6, 7], [2, 7, 3],  # right
            [3, 7, 8], [3, 8, 4],  # back
            [4, 8, 5], [4, 5, 1],  # left
        ]
        for f in box_faces:
            faces.append(f"f {f[0]} {f[1]} {f[2]}")
            
        with open(output_obj_path, "w") as f:
            f.write("# AscentX Generated 3D Mesh\n")
            f.write("\n".join(verts) + "\n")
            f.write("\n".join(faces) + "\n")
            
        return {
            "mesh_path": output_obj_path,
            "num_vertices": len(verts),
            "num_faces": len(faces),
            "bounding_box": [w, h, d]
        }
