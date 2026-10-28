#!/usr/bin/env python3
"""
Proper 3D Geometry Generator for VIBGYOR Building
Reconstructs actual 3D building from architectural floor plan DXF
"""

import json
import math
from pathlib import Path
from typing import List, Dict, Tuple
import ezdxf


class Building3DGenerator:
    """Generate proper 3D building geometry from floor plan DXF"""
    
    def __init__(self, dxf_path: str, extraction_json_path: str):
        self.dxf_path = dxf_path
        self.doc = ezdxf.readfile(dxf_path)
        self.msp = self.doc.modelspace()
        
        # Load extraction data
        with open(extraction_json_path, 'r') as f:
            self.extraction_data = json.load(f)
        
        # Building configuration (from architectural program)
        self.config = {
            'stilt_height': 4.2,  # Parking level
            'floor_height': 3.15,  # Each residential floor
            'num_floors': 7,  # Residential floors
            'terrace_height': 1.2,  # Terrace
            'wall_thickness': 0.3,
            'column_diameter': 0.6,
            'window_sill_height': 0.9,
            'window_height': 1.8,
            'door_height': 2.1,
            'balcony_depth': 1.5
        }
        
        # Calculate total building height
        self.config['total_height'] = (
            self.config['stilt_height'] +
            (self.config['floor_height'] * self.config['num_floors']) +
            self.config['terrace_height']
        )
        
        self.objects = []
        self.materials = self._get_materials()
    
    def _get_materials(self) -> Dict:
        """Define material palette"""
        return {
            'exterior_wall': {'color': '#E8D7C3', 'roughness': 0.7, 'metallic': 0.0},
            'concrete': {'color': '#A9A9A9', 'roughness': 0.8, 'metallic': 0.0},
            'glass': {'color': '#87CEEB', 'roughness': 0.1, 'metallic': 0.0},
            'balcony_slab': {'color': '#9E9E9E', 'roughness': 0.6, 'metallic': 0.0},
            'railing': {'color': '#4A4A4A', 'roughness': 0.5, 'metallic': 0.2},
            'column': {'color': '#8B8B8B', 'roughness': 0.7, 'metallic': 0.1},
            'ground': {'color': '#696969', 'roughness': 0.8, 'metallic': 0.0},
            'roof': {'color': '#555555', 'roughness': 0.6, 'metallic': 0.0},
            'door': {'color': '#8B4513', 'roughness': 0.7, 'metallic': 0.0},
            'parking': {'color': '#C0C0C0', 'roughness': 0.7, 'metallic': 0.0},
        }
    
    def _get_building_footprint(self) -> Tuple[float, float, float, float]:
        """Extract building footprint from floor plan"""
        # Calculate extents from actual DXF entities
        min_x, min_y = float('inf'), float('inf')
        max_x, max_y = float('-inf'), float('-inf')
        
        # Look for wall entities to determine footprint
        for entity in self.msp:
            try:
                if entity.dxftype() in ('LINE', 'LWPOLYLINE', 'POLYLINE'):
                    if entity.dxf.layer.upper() in ('A_WALL', 'A-WALL', 'WALL'):
                        if hasattr(entity, 'dxf') and hasattr(entity.dxf, 'start'):
                            x, y = entity.dxf.start.x, entity.dxf.start.y
                            min_x, min_y = min(min_x, x), min(min_y, y)
                            max_x, max_y = max(max_x, x), max(max_y, y)
                        
                        if hasattr(entity, 'dxf') and hasattr(entity.dxf, 'end'):
                            x, y = entity.dxf.end.x, entity.dxf.end.y
                            min_x, min_y = min(min_x, x), min(min_y, y)
                            max_x, max_y = max(max_x, x), max(max_y, y)
            except:
                pass
        
        # If no walls found, use extraction bounds
        if min_x == float('inf'):
            bounds = self.extraction_data.get('bounds', {})
            min_x = bounds.get('min', {}).get('x', 0)
            min_y = bounds.get('min', {}).get('y', 0)
            max_x = bounds.get('max', {}).get('x', 300)
            max_y = bounds.get('max', {}).get('y', 80)
        
        width = max_x - min_x
        depth = max_y - min_y
        
        return min_x, min_y, width, depth
    
    def _add_box(self, center: Tuple, dimensions: Tuple, material: str, name: str, floor: int = 0) -> Dict:
        """Add a box object"""
        cx, cy, cz = center
        width, height, depth = dimensions
        
        obj = {
            'type': 'box',
            'name': name,
            'floor_number': floor,
            'center': {'x': cx, 'y': cy, 'z': cz},
            'dimensions': {'width': width, 'height': height, 'depth': depth},
            'material': material,
            'visible': True
        }
        self.objects.append(obj)
        return obj
    
    def generate(self) -> Dict:
        """Generate complete 3D building geometry"""
        print('[*] Generating 3D building geometry...')
        
        # Get building footprint from floor plan
        min_x, min_y, width, depth = self._get_building_footprint()
        max_x = min_x + width
        max_y = min_y + depth
        center_x = min_x + width / 2
        center_y = min_y + depth / 2
        
        print(f'[*] Building footprint: {width:.2f}m × {depth:.2f}m')
        print(f'[*] Center: ({center_x:.2f}, {center_y:.2f})')
        
        # Generate stilt level (parking)
        print('[*] Generating stilt level (parking)...')
        stilt_z = self.config['stilt_height'] / 2
        self._add_box(
            (center_x, center_y, stilt_z),
            (width, self.config['stilt_height'], depth),
            'concrete',
            'Stilt_Floor',
            floor=0
        )
        
        # Add stilt columns
        col_spacing_x = width / 4
        col_spacing_y = depth / 3
        col_radius = self.config['column_diameter'] / 2
        
        for i in range(2, 4):
            for j in range(1, 3):
                col_x = min_x + (col_spacing_x * i)
                col_y = min_y + (col_spacing_y * j)
                col_z = self.config['stilt_height'] / 2
                
                self._add_box(
                    (col_x, col_y, col_z),
                    (self.config['column_diameter'], self.config['stilt_height'], self.config['column_diameter']),
                    'column',
                    f'Column_Stilt_{i}_{j}',
                    floor=0
                )
        
        # Generate residential floors (7 floors)
        print(f'[*] Generating {self.config["num_floors"]} residential floors...')
        
        for floor_num in range(1, self.config['num_floors'] + 1):
            floor_z_base = self.config['stilt_height'] + (floor_num - 1) * self.config['floor_height']
            floor_z = floor_z_base + self.config['floor_height'] / 2
            
            # Floor slab
            self._add_box(
                (center_x, center_y, floor_z),
                (width, 0.4, depth),
                'concrete',
                f'Floor_{floor_num}',
                floor=floor_num
            )
            
            # Exterior walls
            wall_thickness = self.config['wall_thickness']
            wall_height = self.config['floor_height']
            wall_z = floor_z_base + wall_height / 2 + 0.4
            
            # Front wall
            self._add_box(
                (center_x, min_y + wall_thickness/2, wall_z),
                (width, wall_thickness, wall_height),
                'exterior_wall',
                f'Wall_Front_F{floor_num}',
                floor=floor_num
            )
            
            # Rear wall
            self._add_box(
                (center_x, max_y - wall_thickness/2, wall_z),
                (width, wall_thickness, wall_height),
                'exterior_wall',
                f'Wall_Rear_F{floor_num}',
                floor=floor_num
            )
            
            # Side walls
            self._add_box(
                (min_x + wall_thickness/2, center_y, wall_z),
                (wall_thickness, depth, wall_height),
                'exterior_wall',
                f'Wall_Left_F{floor_num}',
                floor=floor_num
            )
            
            self._add_box(
                (max_x - wall_thickness/2, center_y, wall_z),
                (wall_thickness, depth, wall_height),
                'exterior_wall',
                f'Wall_Right_F{floor_num}',
                floor=floor_num
            )
            
            # Windows on front facade
            num_windows = 4
            window_spacing = width / (num_windows + 1)
            window_z = floor_z_base + self.config['window_sill_height'] + self.config['window_height'] / 2 + 0.4
            window_depth = 0.15
            
            for w in range(1, num_windows + 1):
                win_x = min_x + window_spacing * w
                self._add_box(
                    (win_x, min_y - window_depth / 2, window_z),
                    (1.5, window_depth, self.config['window_height']),
                    'glass',
                    f'Window_Front_F{floor_num}_W{w}',
                    floor=floor_num
                )
            
            # Balconies
            balcony_z = floor_z_base + self.config['floor_height'] - 0.3
            balcony_depth = self.config['balcony_depth']
            
            self._add_box(
                (center_x, min_y - balcony_depth/2, balcony_z),
                (width - 4, balcony_depth, 0.3),
                'balcony_slab',
                f'Balcony_Front_F{floor_num}',
                floor=floor_num
            )
            
            self._add_box(
                (center_x, max_y + balcony_depth/2, balcony_z),
                (width - 4, balcony_depth, 0.3),
                'balcony_slab',
                f'Balcony_Rear_F{floor_num}',
                floor=floor_num
            )
            
            # Railings on balconies
            railing_height = 1.1
            self._add_box(
                (center_x, min_y - balcony_depth - 0.1, balcony_z + 0.15 + railing_height/2),
                (width - 4, 0.1, railing_height),
                'railing',
                f'Railing_Front_F{floor_num}',
                floor=floor_num
            )
            
            # Columns for structural support
            for i in range(2, 4):
                for j in range(1, 3):
                    col_x = min_x + (col_spacing_x * i)
                    col_y = min_y + (col_spacing_y * j)
                    col_z = floor_z_base + wall_height / 2 + 0.4
                    
                    self._add_box(
                        (col_x, col_y, col_z),
                        (self.config['column_diameter'], self.config['column_diameter'], wall_height),
                        'column',
                        f'Column_F{floor_num}_{i}_{j}',
                        floor=floor_num
                    )
        
        # Generate terrace
        print('[*] Generating terrace...')
        terrace_z_base = self.config['stilt_height'] + (self.config['num_floors'] * self.config['floor_height'])
        terrace_z = terrace_z_base + self.config['terrace_height'] / 2
        
        self._add_box(
            (center_x, center_y, terrace_z),
            (width, self.config['terrace_height'], depth),
            'concrete',
            'Terrace_Floor',
            floor=8
        )
        
        # Parapet on terrace
        parapet_height = 1.2
        self._add_box(
            (center_x, center_y, terrace_z + self.config['terrace_height']/2 + parapet_height/2),
            (width, 0.3, parapet_height),
            'concrete',
            'Parapet_Front',
            floor=8
        )
        
        print(f'[OK] Generated {len(self.objects)} geometric objects')
        
        return {
            'metadata': {
                'name': 'VIBGYOR Residential Building',
                'type': '3D Building Model',
                'floors': self.config['num_floors'],
                'units_per_floor': 2,
                'total_units': self.config['num_floors'] * 2,
                'dimensions': {
                    'width': width,
                    'depth': depth,
                    'total_height': self.config['total_height']
                },
                'structure': {
                    'stilt_height': self.config['stilt_height'],
                    'floor_height': self.config['floor_height'],
                    'terrace_height': self.config['terrace_height']
                }
            },
            'materials': self.materials,
            'objects': self.objects,
            'statistics': {
                'total_objects': len(self.objects),
                'by_floor': self._count_by_floor(),
                'by_material': self._count_by_material(),
                'by_type': self._count_by_type()
            }
        }
    
    def _count_by_floor(self) -> Dict[int, int]:
        """Count objects by floor"""
        counts = {}
        for obj in self.objects:
            floor = obj.get('floor_number', 0)
            counts[floor] = counts.get(floor, 0) + 1
        return counts
    
    def _count_by_material(self) -> Dict[str, int]:
        """Count objects by material"""
        counts = {}
        for obj in self.objects:
            mat = obj.get('material', 'concrete')
            counts[mat] = counts.get(mat, 0) + 1
        return counts
    
    def _count_by_type(self) -> Dict[str, int]:
        """Count objects by type"""
        counts = {}
        for obj in self.objects:
            typ = obj.get('type', 'box')
            counts[typ] = counts.get(typ, 0) + 1
        return counts


def main():
    import sys
    
    if len(sys.argv) < 3:
        print('Usage: python geometry_generator_fixed.py <dxf_path> <extraction_json_path> <output_json_path>')
        sys.exit(1)
    
    dxf_path = sys.argv[1]
    extraction_json_path = sys.argv[2]
    output_json_path = sys.argv[3]
    
    try:
        generator = Building3DGenerator(dxf_path, extraction_json_path)
        result = generator.generate()
        
        with open(output_json_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        print(f'[OK] Geometry saved to {output_json_path}')
        
    except Exception as e:
        print(f'[ERROR] {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
