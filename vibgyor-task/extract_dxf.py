#!/usr/bin/env python3
"""
DXF Extraction Pipeline for VIBGYOR Residential Building

Extracts architectural geometry from DXF files:
- Walls and structural elements
- Floor plans and levels
- Doors and windows
- Columns and supports
- Dimensions and annotations
- Building sections and elevations

Output: Structured JSON with extracted geometry ready for 3D reconstruction
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Any
import logging

try:
    import ezdxf
except ImportError:
    print("ERROR: ezdxf not installed. Install with: pip install ezdxf")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

class DXFExtractor:
    """Extract architectural geometry from DXF files."""
    
    def __init__(self, dxf_path: str):
        """Initialize extractor with DXF file path."""
        self.dxf_path = Path(dxf_path)
        if not self.dxf_path.exists():
            raise FileNotFoundError(f"DXF file not found: {dxf_path}")
        
        logger.info(f"Loading DXF file: {self.dxf_path.name}")
        self.doc = ezdxf.readfile(str(self.dxf_path))
        self.msp = self.doc.modelspace()
        
        # Extraction results
        self.data = {
            'file': self.dxf_path.name,
            'version': '',
            'units': 'unknown',
            'bounds': {},
            'layers': {},
            'entities': {
                'walls': [],
                'doors': [],
                'windows': [],
                'columns': [],
                'dimensions': [],
                'text': [],
                'polylines': [],
                'lines': [],
                'circles': [],
                'arcs': [],
                'blocks': [],
            },
            'floor_plans': [],
            'sections': [],
            'statistics': {},
            'extraction_notes': []
        }
    
    def extract_all(self) -> Dict:
        """Extract all geometry from the DXF file."""
        logger.info("Starting DXF extraction...")
        
        self._extract_version()
        self._extract_units()
        self._extract_layers()
        self._extract_bounds()
        self._extract_entities()
        self._analyze_floor_plans()
        self._extract_dimensions()
        self._generate_statistics()
        
        logger.info("Extraction complete")
        return self.data
    
    def _extract_version(self):
        """Extract DXF version."""
        self.data['version'] = str(self.doc.dxfversion)
        logger.info(f"DXF Version: {self.data['version']}")
    
    def _extract_units(self):
        """Extract drawing units."""
        # AutoCAD unit codes (1 = meter, 4 = millimeter, etc.)
        unit_codes = {
            1: 'meter',
            4: 'millimeter',
            2: 'centimeter',
            5: 'kilometer',
            14: 'micrometer',
            6: 'yard',
            7: 'foot',
        }
        
        try:
            header = self.doc.header
            unit_code = header.get('$INSUNITS', 1)
            self.data['units'] = unit_codes.get(unit_code, 'unknown')
            logger.info(f"Drawing units: {self.data['units']} (code: {unit_code})")
        except Exception as e:
            logger.warning(f"Could not determine units: {e}")
            self.data['units'] = 'unknown'
    
    def _extract_layers(self):
        """Extract layer information."""
        for layer in self.doc.layers:
            layer_name = layer.dxf.name
            try:
                self.data['layers'][layer_name] = {
                    'name': layer_name,
                    'color': layer.dxf.color,
                    'linetype': layer.dxf.linetype,
                }
            except Exception as e:
                logger.debug(f"Could not fully extract layer {layer_name}: {e}")
                self.data['layers'][layer_name] = {'name': layer_name}
        
        logger.info(f"Extracted {len(self.data['layers'])} layers")
    
    def _extract_bounds(self):
        """Extract drawing extents."""
        try:
            header = self.doc.header
            
            # Try to get EXTMIN and EXTMAX from header
            try:
                extmin = header.get('$EXTMIN', (0, 0, 0))
                extmax = header.get('$EXTMAX', (0, 0, 0))
                
                self.data['bounds'] = {
                    'min': {'x': extmin[0], 'y': extmin[1], 'z': extmin[2]},
                    'max': {'x': extmax[0], 'y': extmax[1], 'z': extmax[2]},
                    'width': float(extmax[0] - extmin[0]),
                    'depth': float(extmax[1] - extmin[1]),
                    'height': float(extmax[2] - extmin[2])
                }
                logger.info(f"Drawing bounds: {self.data['bounds']['width']:.1f}m × {self.data['bounds']['depth']:.1f}m × {self.data['bounds']['height']:.1f}m")
            except Exception:
                logger.warning("Could not extract bounds from header")
                self.data['bounds'] = {
                    'min': {'x': 0, 'y': 0, 'z': 0},
                    'max': {'x': 0, 'y': 0, 'z': 0},
                    'width': 0,
                    'depth': 0,
                    'height': 0
                }
        except Exception as e:
            logger.warning(f"Error extracting bounds: {e}")
    
    def _extract_entities(self):
        """Extract all drawing entities."""
        entity_count = 0
        
        for entity in self.msp:
            try:
                entity_type = entity.dxftype()
                layer = entity.dxf.layer
                
                if entity_type == 'LINE':
                    self._process_line(entity, layer)
                    entity_count += 1
                elif entity_type == 'LWPOLYLINE':
                    self._process_lwpolyline(entity, layer)
                    entity_count += 1
                elif entity_type == 'POLYLINE':
                    self._process_polyline(entity, layer)
                    entity_count += 1
                elif entity_type == 'CIRCLE':
                    self._process_circle(entity, layer)
                    entity_count += 1
                elif entity_type == 'ARC':
                    self._process_arc(entity, layer)
                    entity_count += 1
                elif entity_type == 'TEXT' or entity_type == 'MTEXT':
                    self._process_text(entity, layer)
                    entity_count += 1
                elif entity_type == 'INSERT':
                    self._process_insert(entity, layer)
                    entity_count += 1
                elif entity_type == 'DIMENSION':
                    self._process_dimension(entity, layer)
                    entity_count += 1
                
            except Exception as e:
                logger.debug(f"Error processing entity: {e}")
        
        logger.info(f"Extracted {entity_count} entities")
    
    def _process_line(self, entity, layer: str):
        """Process LINE entity."""
        try:
            p1 = entity.dxf.start
            p2 = entity.dxf.end
            
            self.data['entities']['lines'].append({
                'layer': layer,
                'start': {'x': float(p1.x), 'y': float(p1.y), 'z': float(p1.z)},
                'end': {'x': float(p2.x), 'y': float(p2.y), 'z': float(p2.z)},
                'length': float(entity.dxf.length),
                'color': entity.dxf.color
            })
            
            # Classify as wall if on specific layer
            if 'wall' in layer.lower() or 'w-' in layer.lower():
                self.data['entities']['walls'].append({
                    'type': 'line',
                    'layer': layer,
                    'start': {'x': float(p1.x), 'y': float(p1.y), 'z': float(p1.z)},
                    'end': {'x': float(p2.x), 'y': float(p2.y), 'z': float(p2.z)},
                    'length': float(entity.dxf.length)
                })
        except Exception as e:
            logger.debug(f"Error processing line: {e}")
    
    def _process_lwpolyline(self, entity, layer: str):
        """Process LWPOLYLINE entity."""
        try:
            points = [
                {'x': float(p[0]), 'y': float(p[1]), 'z': 0}
                for p in entity.get_points()
            ]
            
            self.data['entities']['polylines'].append({
                'layer': layer,
                'points': points,
                'closed': entity.dxf.flags & 1,
                'color': entity.dxf.color
            })
            
            # Classify as wall if on specific layer
            if 'wall' in layer.lower() or 'w-' in layer.lower():
                self.data['entities']['walls'].append({
                    'type': 'lwpolyline',
                    'layer': layer,
                    'points': points,
                    'closed': bool(entity.dxf.flags & 1)
                })
            
            # Classify as doors if on door layer
            if 'door' in layer.lower() or 'd-' in layer.lower():
                self.data['entities']['doors'].append({
                    'type': 'opening',
                    'layer': layer,
                    'points': points
                })
            
            # Classify as windows if on window layer
            if 'window' in layer.lower() or 'w-' in layer.lower() and 'wall' not in layer.lower():
                self.data['entities']['windows'].append({
                    'type': 'opening',
                    'layer': layer,
                    'points': points
                })
        except Exception as e:
            logger.debug(f"Error processing lwpolyline: {e}")
    
    def _process_polyline(self, entity, layer: str):
        """Process POLYLINE entity."""
        try:
            points = [
                {'x': float(p.x), 'y': float(p.y), 'z': float(p.z)}
                for p in entity.get_points()
            ]
            
            self.data['entities']['polylines'].append({
                'layer': layer,
                'points': points,
                'closed': entity.dxf.flags & 1,
                'color': entity.dxf.color
            })
            
            # Classify by layer
            if 'wall' in layer.lower() or 'w-' in layer.lower():
                self.data['entities']['walls'].append({
                    'type': 'polyline',
                    'layer': layer,
                    'points': points,
                    'closed': bool(entity.dxf.flags & 1)
                })
        except Exception as e:
            logger.debug(f"Error processing polyline: {e}")
    
    def _process_circle(self, entity, layer: str):
        """Process CIRCLE entity (often used for columns)."""
        try:
            center = entity.dxf.center
            radius = entity.dxf.radius
            
            circle_data = {
                'layer': layer,
                'center': {'x': float(center.x), 'y': float(center.y), 'z': float(center.z)},
                'radius': float(radius),
                'color': entity.dxf.color
            }
            
            self.data['entities']['circles'].append(circle_data)
            
            # Classify as column if on column layer
            if 'column' in layer.lower() or 'col' in layer.lower() or 'c-' in layer.lower():
                self.data['entities']['columns'].append({
                    'type': 'circle',
                    'layer': layer,
                    'center': {'x': float(center.x), 'y': float(center.y), 'z': float(center.z)},
                    'radius': float(radius)
                })
        except Exception as e:
            logger.debug(f"Error processing circle: {e}")
    
    def _process_arc(self, entity, layer: str):
        """Process ARC entity."""
        try:
            self.data['entities']['arcs'].append({
                'layer': layer,
                'center': {
                    'x': float(entity.dxf.center.x),
                    'y': float(entity.dxf.center.y),
                    'z': float(entity.dxf.center.z)
                },
                'radius': float(entity.dxf.radius),
                'start_angle': float(entity.dxf.start_angle),
                'end_angle': float(entity.dxf.end_angle),
                'color': entity.dxf.color
            })
        except Exception as e:
            logger.debug(f"Error processing arc: {e}")
    
    def _process_text(self, entity, layer: str):
        """Process TEXT and MTEXT entities."""
        try:
            text_str = entity.dxf.text if hasattr(entity.dxf, 'text') else ''
            
            if entity.dxftype() == 'MTEXT':
                text_str = entity.text
            
            self.data['entities']['text'].append({
                'layer': layer,
                'text': str(text_str),
                'position': {
                    'x': float(entity.dxf.insert.x) if hasattr(entity.dxf, 'insert') else 0,
                    'y': float(entity.dxf.insert.y) if hasattr(entity.dxf, 'insert') else 0,
                    'z': float(entity.dxf.insert.z) if hasattr(entity.dxf, 'insert') else 0
                },
                'height': float(entity.dxf.height) if hasattr(entity.dxf, 'height') else 0
            })
        except Exception as e:
            logger.debug(f"Error processing text: {e}")
    
    def _process_insert(self, entity, layer: str):
        """Process INSERT (block reference) entity."""
        try:
            self.data['entities']['blocks'].append({
                'layer': layer,
                'name': entity.dxf.name,
                'insertion_point': {
                    'x': float(entity.dxf.insert.x),
                    'y': float(entity.dxf.insert.y),
                    'z': float(entity.dxf.insert.z)
                },
                'scale': {
                    'x': float(entity.dxf.xscale),
                    'y': float(entity.dxf.yscale),
                    'z': float(entity.dxf.zscale)
                },
                'rotation': float(entity.dxf.rotation)
            })
        except Exception as e:
            logger.debug(f"Error processing insert: {e}")
    
    def _process_dimension(self, entity, layer: str):
        """Process DIMENSION entity."""
        try:
            self.data['entities']['dimensions'].append({
                'layer': layer,
                'type': entity.dxftype(),
                'measurement_value': float(entity.dxf.measurement) if hasattr(entity.dxf, 'measurement') else 0,
                'text': entity.dxf.text if hasattr(entity.dxf, 'text') else ''
            })
        except Exception as e:
            logger.debug(f"Error processing dimension: {e}")
    
    def _analyze_floor_plans(self):
        """Analyze floor plan structure."""
        # Look for closed polylines that might represent floor plans
        floor_count = 0
        
        for i, polyline in enumerate(self.data['entities']['polylines']):
            if polyline.get('closed'):
                floor_count += 1
                self.data['floor_plans'].append({
                    'index': floor_count,
                    'layer': polyline['layer'],
                    'points': polyline['points'],
                    'type': 'extracted_from_polyline'
                })
        
        logger.info(f"Identified {floor_count} potential floor plans")
    
    def _extract_dimensions(self):
        """Extract and analyze dimensions."""
        total_dimensions = len(self.data['entities']['dimensions'])
        logger.info(f"Extracted {total_dimensions} dimension annotations")
    
    def _generate_statistics(self):
        """Generate extraction statistics."""
        self.data['statistics'] = {
            'total_walls': len(self.data['entities']['walls']),
            'total_doors': len(self.data['entities']['doors']),
            'total_windows': len(self.data['entities']['windows']),
            'total_columns': len(self.data['entities']['columns']),
            'total_lines': len(self.data['entities']['lines']),
            'total_polylines': len(self.data['entities']['polylines']),
            'total_circles': len(self.data['entities']['circles']),
            'total_arcs': len(self.data['entities']['arcs']),
            'total_text': len(self.data['entities']['text']),
            'total_blocks': len(self.data['entities']['blocks']),
            'total_dimensions': len(self.data['entities']['dimensions']),
            'total_layers': len(self.data['layers']),
            'total_floor_plans': len(self.data['floor_plans'])
        }
        
        logger.info("Extraction Statistics:")
        for key, value in self.data['statistics'].items():
            logger.info(f"  {key}: {value}")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <dxf_file> [output_json]")
        print(f"Example: {sys.argv[0]} SUBMISSION-04.dxf output.json")
        sys.exit(1)
    
    dxf_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'extraction_output.json'
    
    try:
        extractor = DXFExtractor(dxf_file)
        extracted_data = extractor.extract_all()
        
        # Save to JSON
        output_path = Path(output_file)
        with open(output_path, 'w') as f:
            json.dump(extracted_data, f, indent=2)
        
        logger.info(f"Extraction saved to: {output_path}")
        return 0
    
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
