#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Advanced DXF Extractor for VIBGYOR Architectural Building
Extracts precise 3D geometry from AutoCAD DXF files using ezdxf
Supports both DXF and DWG formats
"""
import sys
import io
import json
import subprocess
import tempfile
import shutil
from pathlib import Path
from collections import defaultdict
import ezdxf

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


class DXFExtractor:
    def __init__(self, dxf_path):
        self.dxf_path = Path(dxf_path)
        self.doc = None
        self.msp = None  # Model space
        self.data = {
            'bounds': {'min': {'x': float('inf'), 'y': float('inf'), 'z': float('inf')},
                      'max': {'x': float('-inf'), 'y': float('-inf'), 'z': float('-inf')}},
            'building_info': {
                'floors': 7,
                'stilt_height': 4.2,
                'floor_height': 3.15,
                'units_per_floor': 2,
                'wall_thickness': 0.3,
                'column_diameter': 0.6,
            },
            'walls': [],
            'columns': [],
            'windows': [],
            'doors': [],
            'balconies': [],
            'railings': [],
            'parking': [],
            'stairs': [],
            'dimensions': [],
            'texts': [],
            'layers': {},
            'entities_by_type': defaultdict(int),
            'unit_scale': 1.0  # mm to m = 0.001
        }

    def _convert_dwg_to_dxf(self, dwg_path):
        """Convert DWG to DXF using the dwg_converter utility"""
        try:
            # Get the directory where dxf_extractor.py is located
            script_dir = Path(__file__).parent
            converter_script = script_dir / "dwg_converter.py"
            
            if not converter_script.exists():
                print(f"[ERROR] Converter script not found: {converter_script}")
                print("[INFO] DWG conversion requires external tools")
                return None
            
            # Create temp DXF path
            temp_dxf = Path(tempfile.gettempdir()) / f"converted_{Path(dwg_path).stem}.dxf"
            
            # Call the converter script
            cmd = [sys.executable, str(converter_script), str(dwg_path), str(temp_dxf)]
            print(f"[INFO] Executing converter: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                timeout=60,
                text=True
            )
            
            # Check output
            if result.stdout:
                for line in result.stdout.strip().split('\n'):
                    print(line)
            
            if result.returncode != 0 and result.stderr:
                for line in result.stderr.strip().split('\n'):
                    print(line)
            
            # Check if conversion succeeded
            if temp_dxf.exists() and temp_dxf.stat().st_size > 0:
                print(f"[OK] DWG successfully converted to DXF: {temp_dxf}")
                return str(temp_dxf)
            elif result.returncode == 0:
                # Look for file in alternate locations
                for f in Path(tempfile.gettempdir()).glob(f"converted_{Path(dwg_path).stem}*"):
                    if f.suffix.lower() == '.dxf' and f.stat().st_size > 0:
                        print(f"[OK] Found converted file: {f}")
                        return str(f)
            
            # Conversion failed
            print("[ERROR] DWG conversion failed - no conversion tools available")
            print("[INFO] Please install one of these conversion tools:")
            print("       Option 1: LibreCAD (free, open-source)")
            print("                 Windows: https://librecad.org/")
            print("                 Linux: sudo apt-get install librecad")
            print("                 macOS: brew install librecad")
            print("")
            print("       Option 2: dwg2dxf utility")
            print("                 Linux: sudo apt-get install libredwg-bin")
            print("")
            print("       Option 3: Online tools (no installation needed)")
            print("                 - CloudConvert.com")
            print("                 - Zamzar.com")
            print("                 - AnyConv.com")
            return None
            
        except subprocess.TimeoutExpired:
            print("[ERROR] DWG conversion timed out (exceeded 60 seconds)")
            print("[INFO] File may be too large or conversion tool is slow")
            return None
        except Exception as e:
            print(f"[ERROR] DWG conversion error: {e}")
            return None

    def load_dxf(self):
        """Load and validate DXF/DWG file"""
        try:
            file_ext = self.dxf_path.suffix.lower()
            working_path = str(self.dxf_path)
            
            # Try to read file directly first (works for DXF files)
            try:
                print(f"[INFO] Attempting to read file: {self.dxf_path}")
                self.doc = ezdxf.readfile(str(self.dxf_path))
                self.msp = self.doc.modelspace()
                print("[OK] File loaded successfully")
                print("     DXF Version: {}".format(self.doc.dxfversion))
                print("     Encoding: {}".format(self.doc.encoding))
                return True
            except Exception as load_error:
                print(f"[ERROR] Could not read file directly: {str(load_error)[:100]}")
                
                # If it's a .dwg file, provide helpful instructions
                if file_ext == '.dwg':
                    print("")
                    print("[ERROR] This is a DWG file which requires conversion to DXF first")
                    print("")
                    print("[QUICKFIX] Use an online converter (takes 2 minutes):")
                    print("  1. Go to: https://cloudconvert.com/dwg-to-dxf")
                    print("  2. Upload your DWG file")
                    print("  3. Download the converted DXF file")
                    print("  4. Upload the DXF to VIBGYOR")
                    print("")
                    print("[OR] Install LibreCAD (permanent solution):")
                    print("  Windows: Download and install from https://librecad.org/")
                    print("  Linux: sudo apt-get install librecad")
                    print("  macOS: brew install librecad")
                    print("  Then restart VIBGYOR and upload the DWG file")
                    return False
                else:
                    print("[ERROR] Could not parse file as DXF")
                    print("[INFO] Make sure the file is a valid DXF or DWG format")
                    return False
                    
        except Exception as e:
            print("[ERROR] Unexpected error: {}".format(e))
            import traceback
            traceback.print_exc()
            return False
    
    def _is_dxf_file(self):
        """Check if file is actually a DXF despite the extension"""
        try:
            with open(self.dxf_path, 'r', encoding='latin1', errors='ignore') as f:
                first_line = f.readline().strip()
                # DXF files typically start with "  0" or have "SECTION"
                return 'SECTION' in first_line or first_line.isdigit()
        except:
            return False

    def extract_layer_info(self):
        """Extract layer information"""
        for layer in self.doc.layers:
            try:
                layer_name = layer.dxf.name if hasattr(layer, 'dxf') else str(layer)
                self.data['layers'][layer_name] = {
                    'color': layer.dxf.color if hasattr(layer, 'dxf') else 256,
                    'linetype': layer.dxf.linetype if hasattr(layer, 'dxf') else 'CONTINUOUS',
                    'lineweight': layer.dxf.lineweight if hasattr(layer, 'dxf') else -1,
                }
            except Exception as e:
                layer_name = str(layer)
                self.data['layers'][layer_name] = {
                    'color': 256,
                    'linetype': 'CONTINUOUS',
                    'lineweight': -1
                }
        print(f"[OK] Extracted {len(self.data['layers'])} layers")

    def update_bounds(self, x, y, z=0):
        """Update 3D bounding box"""
        x *= self.data['unit_scale']
        y *= self.data['unit_scale']
        z *= self.data['unit_scale']
        
        self.data['bounds']['min']['x'] = min(self.data['bounds']['min']['x'], x)
        self.data['bounds']['min']['y'] = min(self.data['bounds']['min']['y'], y)
        self.data['bounds']['min']['z'] = min(self.data['bounds']['min']['z'], z)
        
        self.data['bounds']['max']['x'] = max(self.data['bounds']['max']['x'], x)
        self.data['bounds']['max']['y'] = max(self.data['bounds']['max']['y'], y)
        self.data['bounds']['max']['z'] = max(self.data['bounds']['max']['z'], z)

    def extract_walls(self):
        """Extract walls from DXF"""
        wall_count = 0
        wall_layers = ['A_WALL', 'a-Wall', 'WALL', 'wall', 'g-wall']
        
        # Iterate through all entities manually instead of using query syntax
        for entity in self.msp:
            layer = entity.dxf.layer.upper()
            
            # Check if entity is on a wall layer
            is_wall_layer = any(wl in layer for wl in wall_layers)
            
            if not is_wall_layer:
                continue
            
            entity_type = entity.dxftype()
            if entity_type not in ['LWPOLYLINE', 'POLYLINE', 'LINE', 'SPLINE']:
                continue
            
            coords = []
            thickness = 0.3  # Default wall thickness
            
            try:
                if entity_type == 'LWPOLYLINE':
                    for point in entity.get_points():
                        x, y, z = point[0], point[1], point[2] if len(point) > 2 else 0
                        coords.append({'x': float(x), 'y': float(y), 'z': float(z)})
                        self.update_bounds(x, y, z)
                    thickness = entity.dxf.get('thickness', 0.3)
                
                elif entity_type == 'POLYLINE':
                    for vertex in entity.vertices:
                        x, y, z = vertex.dxf.location
                        coords.append({'x': float(x), 'y': float(y), 'z': float(z)})
                        self.update_bounds(x, y, z)
                
                elif entity_type == 'LINE':
                    start = entity.dxf.start
                    end = entity.dxf.end
                    coords = [
                        {'x': float(start[0]), 'y': float(start[1]), 'z': float(start[2] if len(start) > 2 else 0)},
                        {'x': float(end[0]), 'y': float(end[1]), 'z': float(end[2] if len(end) > 2 else 0)}
                    ]
                    self.update_bounds(start[0], start[1])
                    self.update_bounds(end[0], end[1])
                
                if len(coords) >= 2:
                    self.data['walls'].append({
                        'layer': layer,
                        'type': entity_type,
                        'coordinates': coords,
                        'thickness': float(thickness),
                        'closed': entity.dxf.get('flags', 0) & 1 == 1 if hasattr(entity.dxf, 'get') else False,
                        'color': entity.dxf.get('color', 256)
                    })
                    wall_count += 1
            
            except Exception as e:
                pass  # Silently skip unparseable entities
        
        print(f"[OK] Extracted {wall_count} walls")
        return wall_count

    def extract_columns(self):
        """Extract structural columns"""
        column_count = 0
        column_layers = ['P-COLHAT', 'HATCH COL', 'g-r.c.c', 'COLUMN']
        
        for entity in self.msp:
            layer = entity.dxf.layer.upper()
            
            if not any(cl in layer for cl in column_layers):
                continue
            
            entity_type = entity.dxftype()
            if entity_type not in ['CIRCLE', 'LWPOLYLINE', 'POLYLINE', 'INSERT']:
                continue
            
            try:
                if entity_type == 'CIRCLE':
                    center = entity.dxf.center
                    radius = entity.dxf.radius
                    self.update_bounds(center[0], center[1])
                    
                    self.data['columns'].append({
                        'type': 'circle',
                        'layer': layer,
                        'position': {'x': float(center[0]), 'y': float(center[1]), 'z': 0},
                        'diameter': float(radius * 2),
                        'color': entity.dxf.get('color', 256)
                    })
                    column_count += 1
                
                elif entity_type in ['LWPOLYLINE', 'POLYLINE']:
                    points = list(entity.get_points()) if entity_type == 'LWPOLYLINE' else [v.dxf.location for v in entity.vertices]
                    if len(points) >= 3:
                        # Calculate centroid
                        avg_x = sum(p[0] for p in points) / len(points)
                        avg_y = sum(p[1] for p in points) / len(points)
                        self.update_bounds(avg_x, avg_y)
                        
                        # Extract bounding box dimensions
                        xs = [p[0] for p in points]
                        ys = [p[1] for p in points]
                        width = max(xs) - min(xs)
                        depth = max(ys) - min(ys)
                        
                        self.data['columns'].append({
                            'type': 'polygon',
                            'layer': layer,
                            'position': {'x': float(avg_x), 'y': float(avg_y), 'z': 0},
                            'width': float(width),
                            'depth': float(depth),
                            'points': [{'x': float(p[0]), 'y': float(p[1])} for p in points],
                            'color': entity.dxf.get('color', 256)
                        })
                        column_count += 1
            
            except Exception as e:
                pass
        
        print(f"[OK] Extracted {column_count} columns")
        return column_count

    def extract_windows(self):
        """Extract windows"""
        window_count = 0
        window_layers = ['A_WINDOW', 'a-Window', 'WINDOW', 'window']
        
        for entity in self.msp:
            layer = entity.dxf.layer.upper()
            
            if not any(wl in layer for wl in window_layers):
                continue
            
            entity_type = entity.dxftype()
            if entity_type not in ['LWPOLYLINE', 'POLYLINE', 'RECTANGLE', 'INSERT']:
                continue
            
            try:
                if entity_type == 'LWPOLYLINE':
                    points = list(entity.get_points())
                    if len(points) == 4:  # Rectangular window
                        xs = [p[0] for p in points]
                        ys = [p[1] for p in points]
                        
                        center_x = (min(xs) + max(xs)) / 2
                        center_y = (min(ys) + max(ys)) / 2
                        width = max(xs) - min(xs)
                        height = max(ys) - min(ys)
                        
                        self.update_bounds(center_x, center_y)
                        
                        self.data['windows'].append({
                            'layer': layer,
                            'position': {'x': float(center_x), 'y': float(center_y), 'z': 0},
                            'width': float(width),
                            'height': float(height),
                            'points': [{'x': float(p[0]), 'y': float(p[1])} for p in points],
                            'color': entity.dxf.get('color', 256)
                        })
                        window_count += 1
            
            except Exception as e:
                pass
        
        print(f"[OK] Extracted {window_count} windows")
        return window_count

    def extract_doors(self):
        """Extract doors"""
        door_count = 0
        door_layers = ['A_DOOR', 'a-Door', 'DOOR', 'door']
        
        for entity in self.msp:
            layer = entity.dxf.layer.upper()
            
            if not any(dl in layer for dl in door_layers):
                continue
            
            entity_type = entity.dxftype()
            if entity_type not in ['LWPOLYLINE', 'POLYLINE', 'INSERT']:
                continue
            
            try:
                if entity_type == 'LWPOLYLINE':
                    points = list(entity.get_points())
                    if len(points) >= 4:
                        xs = [p[0] for p in points]
                        ys = [p[1] for p in points]
                        
                        center_x = (min(xs) + max(xs)) / 2
                        center_y = (min(ys) + max(ys)) / 2
                        width = max(xs) - min(xs)
                        height = max(ys) - min(ys)
                        
                        self.update_bounds(center_x, center_y)
                        
                        self.data['doors'].append({
                            'layer': layer,
                            'position': {'x': float(center_x), 'y': float(center_y), 'z': 0},
                            'width': float(width),
                            'height': float(height),
                            'color': entity.dxf.get('color', 256)
                        })
                        door_count += 1
            
            except Exception as e:
                pass
        
        print(f"[OK] Extracted {door_count} doors")
        return door_count

    def extract_balconies(self):
        """Extract balconies"""
        balcony_count = 0
        balcony_layers = ['BALCONY', 'balcony', 'A_BALCONY']
        
        for entity in self.msp:
            layer = entity.dxf.layer.upper()
            
            if not any(bl in layer for bl in balcony_layers):
                continue
            
            entity_type = entity.dxftype()
            if entity_type not in ['LWPOLYLINE', 'POLYLINE']:
                continue
            
            try:
                if entity_type == 'LWPOLYLINE':
                    points = list(entity.get_points())
                    if len(points) >= 3:
                        xs = [p[0] for p in points]
                        ys = [p[1] for p in points]
                        
                        center_x = (min(xs) + max(xs)) / 2
                        center_y = (min(ys) + max(ys)) / 2
                        width = max(xs) - min(xs)
                        depth = max(ys) - min(ys)
                        
                        self.update_bounds(center_x, center_y)
                        
                        self.data['balconies'].append({
                            'layer': layer,
                            'position': {'x': float(center_x), 'y': float(center_y), 'z': 0},
                            'width': float(width),
                            'depth': float(depth),
                            'points': [{'x': float(p[0]), 'y': float(p[1])} for p in points],
                            'color': entity.dxf.get('color', 256)
                        })
                        balcony_count += 1
            
            except Exception as e:
                pass
        
        print(f"[OK] Extracted {balcony_count} balconies")
        return balcony_count

    def extract_railings(self):
        """Extract balcony railings"""
        railing_count = 0
        railing_layers = ['A_RAILING', 'RAILING', 'railing']
        
        for entity in self.msp:
            layer = entity.dxf.layer.upper()
            
            if not any(rl in layer for rl in railing_layers):
                continue
            
            entity_type = entity.dxftype()
            if entity_type not in ['LWPOLYLINE', 'POLYLINE', 'LINE']:
                continue
            
            try:
                coords = []
                if entity_type == 'LWPOLYLINE':
                    for point in entity.get_points():
                        coords.append({'x': float(point[0]), 'y': float(point[1]), 'z': 0})
                
                elif entity_type == 'LINE':
                    start = entity.dxf.start
                    end = entity.dxf.end
                    coords = [
                        {'x': float(start[0]), 'y': float(start[1]), 'z': 0},
                        {'x': float(end[0]), 'y': float(end[1]), 'z': 0}
                    ]
                
                if len(coords) >= 2:
                    self.data['railings'].append({
                        'layer': layer,
                        'coordinates': coords,
                        'height': 1.1,  # Standard railing height
                        'color': entity.dxf.get('color', 256)
                    })
                    railing_count += 1
            
            except Exception as e:
                pass
        
        print(f"[OK] Extracted {railing_count} railings")
        return railing_count

    def extract_parking(self):
        """Extract parking spaces"""
        parking_count = 0
        parking_layers = ['A_PARKING', 'PARKING', 'parking']
        
        for entity in self.msp:
            layer = entity.dxf.layer.upper()
            
            if not any(pl in layer for pl in parking_layers):
                continue
            
            entity_type = entity.dxftype()
            if entity_type not in ['LWPOLYLINE', 'POLYLINE', 'RECTANGLE']:
                continue
            
            try:
                if entity_type == 'LWPOLYLINE':
                    points = list(entity.get_points())
                    if len(points) == 4:
                        xs = [p[0] for p in points]
                        ys = [p[1] for p in points]
                        
                        self.data['parking'].append({
                            'layer': layer,
                            'width': float(max(xs) - min(xs)),
                            'depth': float(max(ys) - min(ys)),
                            'position': {'x': float((min(xs) + max(xs)) / 2), 'y': float((min(ys) + max(ys)) / 2)},
                            'points': [{'x': float(p[0]), 'y': float(p[1])} for p in points]
                        })
                        parking_count += 1
            
            except Exception as e:
                pass
        
        print(f"[OK] Extracted {parking_count} parking spaces")
        return parking_count

    def extract_stairs(self):
        """Extract staircase elements"""
        stair_count = 0
        stair_layers = ['K STAIR', 'STAIR', 'stair', 'A_STAIR']
        
        for entity in self.msp:
            layer = entity.dxf.layer.upper()
            
            if not any(sl in layer for sl in stair_layers):
                continue
            
            entity_type = entity.dxftype()
            if entity_type not in ['LWPOLYLINE', 'POLYLINE', 'INSERT']:
                continue
            
            try:
                if entity_type == 'LWPOLYLINE':
                    points = list(entity.get_points())
                    if len(points) >= 3:
                        self.data['stairs'].append({
                            'layer': layer,
                            'type': 'staircase',
                            'points': [{'x': float(p[0]), 'y': float(p[1]), 'z': 0} for p in points]
                        })
                        stair_count += 1
            
            except Exception as e:
                pass
        
        print(f"[OK] Extracted {stair_count} staircases")
        return stair_count

    def extract_dimensions(self):
        """Extract dimensions for validation"""
        dim_count = 0
        
        for entity in self.msp:
            entity_type = entity.dxftype()
            if entity_type == 'DIMENSION':
                try:
                    self.data['dimensions'].append({
                        'type': entity.dxf.get('dimtype'),
                        'value': entity.dxf.get('dimpost')
                    })
                    dim_count += 1
                except Exception as e:
                    pass
        
        print("[OK] Extracted {} dimensions".format(dim_count))
        return dim_count

    def calculate_building_bounds(self):
        """Calculate actual building dimensions from geometry"""
        bounds = self.data['bounds']
        
        width = (bounds['max']['x'] - bounds['min']['x']) * 1000  # Convert back to mm for display
        depth = (bounds['max']['y'] - bounds['min']['y']) * 1000
        height = (bounds['max']['z'] - bounds['min']['z']) * 1000
        
        print(f"\n=== Building Dimensions ===")
        print(f"Width (X): {width:.1f} mm = {width/1000:.2f} m")
        print(f"Depth (Y): {depth:.1f} mm = {depth/1000:.2f} m")
        print(f"Height (Z): {height:.1f} mm = {height/1000:.2f} m")
        print(f"Footprint: {(width/1000) * (depth/1000):.1f} sq.m")

    def extract_all(self):
        """Run all extraction methods"""
        print("\n=== VIBGYOR DXF Extraction Started ===\n")
        
        if not self.load_dxf():
            return None
        
        self.extract_layer_info()
        self.extract_walls()
        self.extract_columns()
        self.extract_windows()
        self.extract_doors()
        self.extract_balconies()
        self.extract_railings()
        self.extract_parking()
        self.extract_stairs()
        self.extract_dimensions()
        
        self.calculate_building_bounds()
        
        # Calculate actual dimensions from walls
        if self.data['walls']:
            all_coords = []
            for wall in self.data['walls']:
                for coord in wall['coordinates']:
                    all_coords.append((coord['x'], coord['y']))
            
            if all_coords:
                xs = [c[0] for c in all_coords]
                ys = [c[1] for c in all_coords]
                
                actual_width = (max(xs) - min(xs)) * self.data['unit_scale']
                actual_depth = (max(ys) - min(ys)) * self.data['unit_scale']
                
                self.data['building_info']['width'] = round(actual_width, 2)
                self.data['building_info']['depth'] = round(actual_depth, 2)
                
                print(f"Calculated building footprint: {actual_width:.2f}m × {actual_depth:.2f}m")
        
        print(f"\n=== Extraction Complete ===\n")
        return self.data

    def save_to_json(self, output_path):
        """Save extracted data to JSON"""
        # Convert defaultdict to regular dict for JSON serialization
        output = dict(self.data)
        output['entities_by_type'] = dict(output['entities_by_type'])
        
        with open(output_path, 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"[OK] Saved to {output_path}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python dxf_extractor.py <dxf_path> [output_json]")
        sys.exit(1)
    
    dxf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "extracted_geometry.json"
    
    extractor = DXFExtractor(dxf_path)
    data = extractor.extract_all()
    
    if data:
        extractor.save_to_json(output_path)
        print(f"[OK] Extraction successful!")
        print(json.dumps({
            'summary': {
                'walls': len(data['walls']),
                'columns': len(data['columns']),
                'windows': len(data['windows']),
                'doors': len(data['doors']),
                'balconies': len(data['balconies']),
                'railings': len(data['railings']),
                'building_width': data['building_info'].get('width', 36.996),
                'building_depth': data['building_info'].get('depth', 10.17),
                'floors': data['building_info']['floors']
            }
        }, indent=2))
    else:
        print("[FAIL] Extraction failed!")
        sys.exit(1)


if __name__ == '__main__':
    main()
