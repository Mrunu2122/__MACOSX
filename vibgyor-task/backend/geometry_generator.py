#!/usr/bin/env python3
"""
Proper 3D Geometry Generator for VIBGYOR Building  
Generates actual architectural 3D building geometry with 7 floors, stilt, and terrace
"""

import json
import math
import sys
from pathlib import Path


def generate_vibgyor_building(extraction_data: dict) -> dict:
    """Generate proper VIBGYOR building geometry"""
    
    # Building configuration from architectural program
    config = {
        'stilt_height': 4.2,
        'floor_height': 3.15,
        'num_floors': 7,
        'terrace_height': 1.2,
        'wall_thickness': 0.3,
        'column_diameter': 0.6,
        'window_width': 1.5,
        'window_height': 1.8,
        'window_sill_height': 0.9,
        'door_height': 2.1,
        'balcony_depth': 1.5,
        'balcony_width_ratio': 0.85
    }
    
    # Get building footprint from extraction data. Ignore sentinel/extreme values
    # produced by malformed DXF bounds before doing geometry arithmetic.
    bounds = extraction_data.get('bounds', {})
    min_x = bounds.get('min', {}).get('x', 49.26702789187448)
    min_y = bounds.get('min', {}).get('y', 19.08560854532288)
    max_x = bounds.get('max', {}).get('x', 419.226072781888)
    max_y = bounds.get('max', {}).get('y', 120.7883650969325)

    candidate_values = (min_x, min_y, max_x, max_y)
    if not all(isinstance(value, (int, float)) and math.isfinite(value) for value in candidate_values):
        min_x, min_y = 49.26702789187448, 19.08560854532288
        max_x, max_y = 419.226072781888, 120.7883650969325
    elif max_x <= min_x or max_y <= min_y:
        min_x, min_y = 49.26702789187448, 19.08560854532288
        max_x, max_y = 419.226072781888, 120.7883650969325
    
    # Adjust to actual building footprint (walls layer defines the real boundary)
    # From DXF analysis: walls are at X: 119.88-397.19 (width ~277m), Y: 38.82-110.22 (depth ~71m)
    # Let's use more realistic building proportions based on the architectural program
    # Building should be roughly 291m x 76m according to the spec
    
    width = max_x - min_x
    depth = max_y - min_y
    
    # Adjust for more reasonable building proportions if bounds seem wrong
    if width > 350 or depth > 100:
        # Bounds include margins - use estimated building size from architectural data
        width = 291.59
        depth = 76.1
        center_x = min_x + width / 2
        center_y = min_y + depth / 2
    else:
        center_x = min_x + width / 2
        center_y = min_y + depth / 2
    
    config['total_height'] = (
        config['stilt_height'] +
        (config['floor_height'] * config['num_floors']) +
        config['terrace_height']
    )
    
    # Materials palette
    materials = {
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
    
    objects = []
    
    # ============ STILT LEVEL ============
    stilt_z_center = config['stilt_height'] / 2
    
    # Stilt floor slab
    objects.append({
        'type': 'box',
        'name': 'Stilt_Floor',
        'floor_number': 0,
        'level': 'stilt',
        'center': {'x': center_x, 'y': center_y, 'z': stilt_z_center},
        'dimensions': {'width': width, 'height': config['stilt_height'], 'depth': depth},
        'material': 'concrete',
        'purpose': 'parking'
    })
    
    # Stilt columns
    col_rows = 2
    col_cols = 3
    col_spacing_x = width / (col_cols + 1)
    col_spacing_y = depth / (col_rows + 1)
    
    for row in range(1, col_rows + 1):
        for col in range(1, col_cols + 1):
            col_x = min_x + (col_spacing_x * col)
            col_y = min_y + (col_spacing_y * row)
            col_z = stilt_z_center
            
            objects.append({
                'type': 'column',
                'name': f'Column_Stilt_{row}_{col}',
                'floor_number': 0,
                'center': {'x': col_x, 'y': col_y, 'z': col_z},
                'diameter': config['column_diameter'],
                'height': config['stilt_height'],
                'material': 'column',
                'purpose': 'structural'
            })
    
    # ============ RESIDENTIAL FLOORS ============
    for floor_num in range(1, config['num_floors'] + 1):
        floor_z_base = config['stilt_height'] + (floor_num - 1) * config['floor_height']
        floor_z_center = floor_z_base + config['floor_height'] / 2
        
        # Floor slab
        objects.append({
            'type': 'floor',
            'name': f'Floor_{floor_num}',
            'floor_number': floor_num,
            'level': floor_num,
            'center': {'x': center_x, 'y': center_y, 'z': floor_z_base + 0.2},
            'dimensions': {'width': width, 'thickness': 0.4, 'depth': depth},
            'material': 'concrete',
            'purpose': 'residential',
            'units': 2,
            'unit_types': ['Type A (Front)', 'Type B (Rear)'],
            'apartments_per_floor': 2,
            'bedrooms_per_unit': 4
        })
        
        wall_z_center = floor_z_base + config['floor_height'] / 2 + 0.2
        
        # Exterior walls
        # Front wall
        objects.append({
            'type': 'wall',
            'name': f'Wall_Front_F{floor_num}',
            'floor_number': floor_num,
            'center': {'x': center_x, 'y': min_y + config['wall_thickness']/2, 'z': wall_z_center},
            'dimensions': {'length': width, 'height': config['floor_height'], 'thickness': config['wall_thickness']},
            'material': 'exterior_wall',
            'orientation': 'south'
        })
        
        # Rear wall
        objects.append({
            'type': 'wall',
            'name': f'Wall_Rear_F{floor_num}',
            'floor_number': floor_num,
            'center': {'x': center_x, 'y': max_y - config['wall_thickness']/2, 'z': wall_z_center},
            'dimensions': {'length': width, 'height': config['floor_height'], 'thickness': config['wall_thickness']},
            'material': 'exterior_wall',
            'orientation': 'north'
        })
        
        # Side walls
        objects.append({
            'type': 'wall',
            'name': f'Wall_Left_F{floor_num}',
            'floor_number': floor_num,
            'center': {'x': min_x + config['wall_thickness']/2, 'y': center_y, 'z': wall_z_center},
            'dimensions': {'length': depth, 'height': config['floor_height'], 'thickness': config['wall_thickness']},
            'material': 'exterior_wall',
            'orientation': 'west'
        })
        
        objects.append({
            'type': 'wall',
            'name': f'Wall_Right_F{floor_num}',
            'floor_number': floor_num,
            'center': {'x': max_x - config['wall_thickness']/2, 'y': center_y, 'z': wall_z_center},
            'dimensions': {'length': depth, 'height': config['floor_height'], 'thickness': config['wall_thickness']},
            'material': 'exterior_wall',
            'orientation': 'east'
        })
        
        # Windows on front facade
        num_windows = 5
        window_spacing = width / (num_windows + 1)
        window_z = floor_z_base + config['window_sill_height'] + config['window_height'] / 2 + 0.4
        
        for w in range(1, num_windows + 1):
            win_x = min_x + window_spacing * w
            objects.append({
                'type': 'window',
                'name': f'Window_Front_F{floor_num}_W{w}',
                'floor_number': floor_num,
                'center': {'x': win_x, 'y': min_y - 0.15, 'z': window_z},
                'dimensions': {'width': config['window_width'], 'height': config['window_height'], 'depth': 0.15},
                'material': 'glass',
                'orientation': 'south'
            })
        
        # Doors (main entrance on ground floor of F1, emergency exits on other floors)
        if floor_num == 1:
            door_z = floor_z_base + config['door_height'] / 2 + 0.4
            objects.append({
                'type': 'door',
                'name': f'Door_Main_F{floor_num}',
                'floor_number': floor_num,
                'center': {'x': center_x, 'y': min_y - 0.1, 'z': door_z},
                'dimensions': {'width': 1.2, 'height': config['door_height']},
                'material': 'door',
                'orientation': 'south',
                'purpose': 'main_entrance'
            })
        
        # Balconies
        balcony_z_slab = floor_z_base + config['floor_height'] - 0.3
        balcony_width = width * config['balcony_width_ratio']
        
        # Front balcony
        objects.append({
            'type': 'balcony',
            'name': f'Balcony_Front_F{floor_num}',
            'floor_number': floor_num,
            'center': {'x': center_x, 'y': min_y - config['balcony_depth'] / 2, 'z': balcony_z_slab},
            'dimensions': {'width': balcony_width, 'depth': config['balcony_depth'], 'thickness': 0.3},
            'material': 'balcony_slab',
            'orientation': 'south'
        })
        
        # Rear balcony
        objects.append({
            'type': 'balcony',
            'name': f'Balcony_Rear_F{floor_num}',
            'floor_number': floor_num,
            'center': {'x': center_x, 'y': max_y + config['balcony_depth'] / 2, 'z': balcony_z_slab},
            'dimensions': {'width': balcony_width, 'depth': config['balcony_depth'], 'thickness': 0.3},
            'material': 'balcony_slab',
            'orientation': 'north'
        })
        
        # Railings on balconies
        railing_height = 1.1
        
        objects.append({
            'type': 'railing',
            'name': f'Railing_Front_F{floor_num}',
            'floor_number': floor_num,
            'center': {'x': center_x, 'y': min_y - config['balcony_depth'] - 0.05, 'z': balcony_z_slab + 0.15 + railing_height / 2},
            'dimensions': {'length': balcony_width, 'height': railing_height, 'thickness': 0.1},
            'material': 'railing'
        })
        
        objects.append({
            'type': 'railing',
            'name': f'Railing_Rear_F{floor_num}',
            'floor_number': floor_num,
            'center': {'x': center_x, 'y': max_y + config['balcony_depth'] + 0.05, 'z': balcony_z_slab + 0.15 + railing_height / 2},
            'dimensions': {'length': balcony_width, 'height': railing_height, 'thickness': 0.1},
            'material': 'railing'
        })
        
        # Structural columns on each floor
        for row in range(1, col_rows + 1):
            for col in range(1, col_cols + 1):
                col_x = min_x + (col_spacing_x * col)
                col_y = min_y + (col_spacing_y * row)
                col_z = wall_z_center
                
                objects.append({
                    'type': 'column',
                    'name': f'Column_F{floor_num}_{row}_{col}',
                    'floor_number': floor_num,
                    'center': {'x': col_x, 'y': col_y, 'z': col_z},
                    'diameter': config['column_diameter'],
                    'height': config['floor_height'],
                    'material': 'column',
                    'purpose': 'structural'
                })
    
    # ============ TERRACE ============
    terrace_z_base = config['stilt_height'] + (config['num_floors'] * config['floor_height'])
    terrace_z = terrace_z_base + config['terrace_height'] / 2
    
    objects.append({
        'type': 'floor',
        'name': 'Terrace_Floor',
        'floor_number': 8,
        'level': 'terrace',
        'center': {'x': center_x, 'y': center_y, 'z': terrace_z},
        'dimensions': {'width': width, 'thickness': config['terrace_height'], 'depth': depth},
        'material': 'concrete',
        'purpose': 'terrace'
    })
    
    # Parapets on terrace
    parapet_height = 1.2
    parapet_z = terrace_z + config['terrace_height'] / 2 + parapet_height / 2
    
    objects.append({
        'type': 'wall',
        'name': 'Parapet_Front',
        'floor_number': 8,
        'center': {'x': center_x, 'y': min_y, 'z': parapet_z},
        'dimensions': {'length': width, 'height': parapet_height, 'thickness': 0.3},
        'material': 'concrete',
        'purpose': 'safety'
    })
    
    objects.append({
        'type': 'wall',
        'name': 'Parapet_Rear',
        'floor_number': 8,
        'center': {'x': center_x, 'y': max_y, 'z': parapet_z},
        'dimensions': {'length': width, 'height': parapet_height, 'thickness': 0.3},
        'material': 'concrete',
        'purpose': 'safety'
    })
    
    objects.append({
        'type': 'wall',
        'name': 'Parapet_Left',
        'floor_number': 8,
        'center': {'x': min_x, 'y': center_y, 'z': parapet_z},
        'dimensions': {'length': depth, 'height': parapet_height, 'thickness': 0.3},
        'material': 'concrete',
        'purpose': 'safety'
    })
    
    objects.append({
        'type': 'wall',
        'name': 'Parapet_Right',
        'floor_number': 8,
        'center': {'x': max_x, 'y': center_y, 'z': parapet_z},
        'dimensions': {'length': depth, 'height': parapet_height, 'thickness': 0.3},
        'material': 'concrete',
        'purpose': 'safety'
    })
    
    # ============ COMPILE RESULT ============
    return {
        'metadata': {
            'name': 'VIBGYOR Residential Building',
            'type': '3D Building Model',
            'floors': config['num_floors'],
            'units_per_floor': 2,
            'total_units': config['num_floors'] * 2,
            'dimensions': {
                'width': width,
                'depth': depth,
                'total_height': config['total_height']
            },
            'structure': {
                'stilt_height': config['stilt_height'],
                'floor_height': config['floor_height'],
                'terrace_height': config['terrace_height']
            }
        },
        'materials': materials,
        'objects': objects,
        'statistics': {
            'total_objects': len(objects),
            'by_floor': _count_by_floor(objects),
            'by_material': _count_by_material(objects),
            'by_type': _count_by_type(objects)
        }
    }


def _count_by_floor(objects):
    counts = {}
    for obj in objects:
        floor = obj.get('floor_number', 0)
        counts[floor] = counts.get(floor, 0) + 1
    return counts


def _count_by_material(objects):
    counts = {}
    for obj in objects:
        mat = obj.get('material', 'concrete')
        counts[mat] = counts.get(mat, 0) + 1
    return counts


def _count_by_type(objects):
    counts = {}
    for obj in objects:
        typ = obj.get('type', 'box')
        counts[typ] = counts.get(typ, 0) + 1
    return counts


def main():
    if len(sys.argv) < 3:
        print('Usage: python geometry_generator.py <extraction_json_path> <output_json_path>')
        sys.exit(1)
    
    extraction_json_path = sys.argv[1]
    output_json_path = sys.argv[2]
    
    try:
        # Load extraction data
        with open(extraction_json_path, 'r') as f:
            extraction_data = json.load(f)
        
        print('[*] Generating 3D building geometry...')
        result = generate_vibgyor_building(extraction_data)
        
        # Save result
        with open(output_json_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        print(f'[OK] Generated {len(result["objects"])} objects')
        print(f'[OK] Saved to {output_json_path}')
        
        # Print summary
        print('\nBuilding Summary:')
        print(f'  Dimensions: {result["metadata"]["dimensions"]["width"]:.2f}m × {result["metadata"]["dimensions"]["depth"]:.2f}m × {result["metadata"]["dimensions"]["total_height"]:.2f}m')
        print(f'  Floors: {result["metadata"]["floors"]} residential + stilt + terrace')
        print(f'  Units: {result["metadata"]["total_units"]}')
        print(f'  Objects by floor:')
        for floor_num in sorted(result['statistics']['by_floor'].keys()):
            count = result['statistics']['by_floor'][floor_num]
            floor_label = f'Stilt' if floor_num == 0 else (f'Terrace' if floor_num == 8 else f'F{floor_num}')
            print(f'    {floor_label}: {count} objects')
        
    except Exception as e:
        print(f'[ERROR] {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
