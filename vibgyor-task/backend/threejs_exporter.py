#!/usr/bin/env python3
"""
Three.js GLB Exporter
Converts generated geometry to Three.js compatible GLB format
"""

import json
import struct
import math
import base64
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import numpy as np


class Vector3:
    def __init__(self, x=0, y=0, z=0):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)
    
    def to_array(self):
        return [self.x, self.y, self.z]


class Box:
    """Create a box geometry"""
    
    @staticmethod
    def create(width: float, height: float, depth: float) -> Tuple[List, List]:
        """Create box vertices and faces"""
        w, h, d = width / 2, height / 2, depth / 2
        
        vertices = [
            # Front face
            -w, -h, d,   w, -h, d,   w, h, d,  -w, h, d,
            # Back face
            -w, -h, -d,  -w, h, -d,   w, h, -d,   w, -h, -d,
            # Left face
            -w, -h, -d,  -w, -h, d,  -w, h, d,  -w, h, -d,
            # Right face
            w, -h, -d,   w, h, -d,   w, h, d,   w, -h, d,
            # Top face
            -w, h, -d,  -w, h, d,   w, h, d,   w, h, -d,
            # Bottom face
            -w, -h, -d,   w, -h, -d,   w, -h, d,  -w, -h, d,
        ]
        
        indices = [
            0, 1, 2,  0, 2, 3,      # front
            4, 6, 5,  4, 7, 6,      # back
            8, 9, 10, 8, 10, 11,    # left
            12, 14, 13, 12, 15, 14, # right
            16, 18, 17, 16, 19, 18, # top
            20, 21, 22, 20, 22, 23  # bottom
        ]
        
        return vertices, indices


class THREE_JSONExporter:
    """Export geometry to Three.js JSON format"""
    
    def __init__(self, geometry_data: Dict):
        self.geometry_data = geometry_data
        self.materials = {}
        self.geometries = {}
        self.objects = []
        self.vertex_offset = 0
    
    def create_material_dict(self, material: Dict) -> Dict:
        """Convert material to Three.js format"""
        color_hex = material.get('color', '#ffffff')
        # Convert hex color to RGB integer
        color_int = int(color_hex.lstrip('#'), 16)
        
        return {
            'type': 'MeshStandardMaterial',
            'color': color_int,
            'metalness': material.get('metallic', 0.0),
            'roughness': material.get('roughness', 0.8),
            'emissive': int(material.get('emissive', '#000000').lstrip('#'), 16),
            'side': 2  # DoubleSide
        }
    
    def export_to_json_object(self) -> Dict:
        """Export as Three.js JSON Object format"""
        
        # Materials
        materials_list = []
        material_index_map = {}
        
        for mat_name, mat_data in self.geometry_data.get('materials', {}).items():
            material_index_map[mat_name] = len(materials_list)
            materials_list.append({
                'name': mat_name,
                **self.create_material_dict(mat_data)
            })
        
        # Build mesh data by material
        meshes_by_material = {}
        for obj in self.geometry_data.get('objects', []):
            mat = obj.get('material', 'concrete')
            if mat not in meshes_by_material:
                meshes_by_material[mat] = []
            meshes_by_material[mat].append(obj)
        
        # Create geometries and objects
        geometries_list = []
        object_children = []
        
        for mat_name, objects_list in meshes_by_material.items():
            geometry_data_list = []
            
            for obj in objects_list:
                obj_type = obj.get('type', 'box')
                
                if obj_type == 'box':
                    dims = obj.get('dimensions', {})
                    width = dims.get('width', 10)
                    height = dims.get('height', 10)
                    depth = dims.get('depth', 10)
                    
                    vertices, indices = Box.create(width, height, depth)
                    geometry_data_list.append({
                        'vertices': vertices,
                        'indices': indices,
                        'position': obj.get('center', {'x': 0, 'y': 0, 'z': 0}),
                        'name': obj.get('name', 'object')
                    })
                
                elif obj_type in ['wall', 'floor', 'balcony', 'window', 'door']:
                    dims = obj.get('dimensions', {})
                    
                    if obj_type == 'wall':
                        width = dims.get('thickness', 0.3)
                        height = dims.get('height', 3.15)
                        depth = dims.get('length', 10)
                    elif obj_type == 'floor':
                        width = dims.get('width', 30)
                        height = dims.get('thickness', 0.4)
                        depth = dims.get('depth', 10)
                    elif obj_type == 'balcony':
                        width = dims.get('width', 30)
                        height = dims.get('thickness', 0.3)
                        depth = dims.get('depth', 1.5)
                    else:  # window, door
                        width = dims.get('width', 1.5)
                        height = dims.get('height', 1.8)
                        depth = dims.get('depth', 0.2)
                    
                    vertices, indices = Box.create(width, height, depth)
                    geometry_data_list.append({
                        'vertices': vertices,
                        'indices': indices,
                        'position': obj.get('position', {'x': 0, 'y': 0, 'z': 0}),
                        'name': obj.get('name', 'object'),
                        'floor_number': obj.get('floor_number', 0)
                    })
            
            # Create combined geometry for this material
            if geometry_data_list:
                combined_vertices = []
                combined_indices = []
                vertex_offset = 0
                objects_for_geometry = []
                
                for geo_data in geometry_data_list:
                    vertices = geo_data['vertices']
                    indices = geo_data['indices']
                    position = geo_data['position']
                    
                    # Add vertices with position offset
                    for i in range(0, len(vertices), 3):
                        combined_vertices.extend([
                            vertices[i] + position['x'],
                            vertices[i+1] + position['y'],
                            vertices[i+2] + position['z']
                        ])
                    
                    # Add indices with vertex offset
                    for idx in indices:
                        combined_indices.append(idx + vertex_offset)
                    
                    vertex_offset += len(vertices) // 3
                    objects_for_geometry.append(geo_data)
                
                geometry_obj = {
                    'type': 'BufferGeometry',
                    'data': {
                        'attributes': {
                            'position': {
                                'type': 'Float32Array',
                                'array': combined_vertices
                            }
                        },
                        'index': {
                            'type': 'Uint32Array',
                            'array': combined_indices
                        }
                    }
                }
                geometries_list.append(geometry_obj)
                
                # Create mesh object
                mesh_obj = {
                    'uuid': f'mesh-{mat_name}-{len(geometries_list)}',
                    'type': 'Mesh',
                    'name': f'Mesh_{mat_name}',
                    'geometry': len(geometries_list) - 1,
                    'material': material_index_map[mat_name],
                    'castShadow': True,
                    'receiveShadow': True,
                    'children': []
                }
                
                # Add individual object metadata as children
                for geo_data in objects_for_geometry:
                    mesh_obj['children'].append({
                        'name': geo_data['name'],
                        'floor_number': geo_data.get('floor_number', 0),
                        'type': 'metadata'
                    })
                
                object_children.append(mesh_obj)
        
        return {
            'metadata': {
                'generator': 'VIBGYOR THREE.js Exporter',
                'version': 4.5,
                'type': 'Object'
            },
            'geometries': geometries_list,
            'materials': materials_list,
            'object': {
                'uuid': 'vibgyor-building',
                'type': 'Group',
                'name': 'VIBGYOR Building',
                'position': [0, 0, 0],
                'quaternion': [0, 0, 0, 1],
                'scale': [1, 1, 1],
                'children': object_children
            }
        }
    
    def export_to_file(self, output_path: Path):
        """Export to JSON file"""
        export_data = self.export_to_json_object()
        
        with open(output_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        print(f"[OK] Exported to {output_path}")


def export_geometry_for_threejs(geometry_json_path: str, output_json_path: str):
    """Main export function"""
    
    # Load geometry
    with open(geometry_json_path, 'r') as f:
        geometry_data = json.load(f)
    
    # Export to Three.js format
    exporter = THREE_JSONExporter(geometry_data)
    exporter.export_to_file(Path(output_json_path))
    
    return True


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python threejs_exporter.py <input_geometry_json> <output_threejs_json>")
        sys.exit(1)
    
    export_geometry_for_threejs(sys.argv[1], sys.argv[2])
