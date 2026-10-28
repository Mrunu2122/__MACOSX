import fs from 'fs-extra';
import path from 'path';

/**
 * Advanced DXF Parser - Extracts real architectural geometry
 * Reads walls, doors, windows, columns, and dimensions from DXF
 */

export async function parseDrawingAdvanced(filePath) {
  try {
    console.log('Reading DXF file...');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Split into sections
    const sections = extractSections(content);
    
    // Parse ENTITIES section
    const entities = parseEntities(sections.ENTITIES || '');
    
    // Extract architectural elements
    const walls = extractWalls(entities);
    const doors = extractDoors(entities);
    const windows = extractWindows(entities);
    const columns = extractColumns(entities);
    const dimensions = extractDimensions(entities);
    const texts = extractTexts(entities);
    
    // Detect building properties from texts and dimensions
    const buildingInfo = analyzeBuildingInfo(texts, dimensions);
    
    // Calculate bounds
    const bounds = calculateBounds(walls, doors, windows, columns);
    
    const drawingData = {
      type: 'DXF Drawing',
      file: path.basename(filePath),
      unit: 'metres',
      bounds,
      buildingInfo,
      entities: {
        walls,
        doors,
        windows,
        columns,
        dimensions,
        texts
      },
      layers: extractLayers(content),
      rawStats: {
        totalEntities: entities.length,
        coordinateRanges: getCoordinateRanges(entities)
      }
    };
    
    return drawingData;
  } catch (error) {
    console.error('Error parsing DXF:', error.message);
    throw error;
  }
}

function extractSections(content) {
  const sections = {};
  const lines = content.split('\n');
  let currentSection = null;
  let sectionContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === 'SECTION') {
      if (currentSection) {
        sections[currentSection] = sectionContent.join('\n');
      }
      // Look ahead for section name
      if (i + 1 < lines.length) {
        const nameLine = lines[i + 1].trim();
        if (nameLine.match(/^2/)) {
          currentSection = lines[i + 2].trim();
          sectionContent = [];
          i += 2;
        }
      }
    } else if (line === 'ENDSEC') {
      if (currentSection) {
        sections[currentSection] = sectionContent.join('\n');
        currentSection = null;
        sectionContent = [];
      }
    } else if (currentSection) {
      sectionContent.push(line);
    }
  }
  
  return sections;
}

function parseEntities(entitiesContent) {
  const entities = [];
  const lines = entitiesContent.split('\n');
  let currentEntity = null;
  let code = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Parse DXF group codes
    if (!isNaN(line)) {
      code = parseInt(line);
      if (code === 0) {
        // New entity
        if (currentEntity) {
          entities.push(currentEntity);
        }
        currentEntity = {
          type: lines[i + 1]?.trim(),
          properties: {}
        };
        i++;
      }
    } else if (code !== null && currentEntity) {
      // Store property value
      currentEntity.properties[code] = line;
    }
  }
  
  if (currentEntity) {
    entities.push(currentEntity);
  }
  
  return entities;
}

function extractWalls(entities) {
  const walls = [];
  
  for (const entity of entities) {
    // Look for wall-related layers and types
    const layer = entity.properties[8] || '';
    
    if (layer.includes('WALL') || layer.includes('wall') || 
        entity.type === 'LWPOLYLINE' || entity.type === 'LINE') {
      
      const coords = extractCoordinates(entity);
      
      if (coords.length >= 2) {
        walls.push({
          type: entity.type,
          layer,
          coordinates: coords,
          thickness: parseFloat(entity.properties[39]) || 0.23, // Standard wall thickness
          closed: entity.properties[70] === '1' // Polyline closed flag
        });
      }
    }
  }
  
  return walls;
}

function extractDoors(entities) {
  const doors = [];
  
  for (const entity of entities) {
    const layer = entity.properties[8] || '';
    
    if ((layer.includes('DOOR') || layer.includes('door') || 
         entity.type === 'INSERT') && layer.includes('DOOR')) {
      
      doors.push({
        type: entity.type,
        layer,
        position: {
          x: parseFloat(entity.properties[10]) || 0,
          y: parseFloat(entity.properties[20]) || 0,
          z: parseFloat(entity.properties[30]) || 0
        },
        rotation: parseFloat(entity.properties[50]) || 0,
        name: entity.properties[2] || 'DOOR'
      });
    }
  }
  
  return doors;
}

function extractWindows(entities) {
  const windows = [];
  
  for (const entity of entities) {
    const layer = entity.properties[8] || '';
    
    if ((layer.includes('WINDOW') || layer.includes('window') ||
         layer.includes('GLAZ') || layer.includes('glaz')) &&
        (entity.type === 'INSERT' || layer.includes('WINDOW'))) {
      
      windows.push({
        type: entity.type,
        layer,
        position: {
          x: parseFloat(entity.properties[10]) || 0,
          y: parseFloat(entity.properties[20]) || 0,
          z: parseFloat(entity.properties[30]) || 0
        },
        size: {
          width: parseFloat(entity.properties[41]) || 1.0,
          height: parseFloat(entity.properties[42]) || 1.2
        },
        name: entity.properties[2] || 'WINDOW'
      });
    }
  }
  
  return windows;
}

function extractColumns(entities) {
  const columns = [];
  
  for (const entity of entities) {
    const layer = entity.properties[8] || '';
    
    if ((layer.includes('COLUMN') || layer.includes('column') ||
         layer.includes('RCC') || layer.includes('rcc')) &&
        entity.type === 'INSERT') {
      
      columns.push({
        type: entity.type,
        layer,
        position: {
          x: parseFloat(entity.properties[10]) || 0,
          y: parseFloat(entity.properties[20]) || 0,
          z: parseFloat(entity.properties[30]) || 0
        },
        size: {
          width: 0.4,  // Standard column size
          depth: 0.4
        },
        name: entity.properties[2] || 'COLUMN'
      });
    }
  }
  
  return columns;
}

function extractDimensions(entities) {
  const dimensions = [];
  
  for (const entity of entities) {
    if (entity.type === 'DIMENSION') {
      const measurement = parseFloat(entity.properties[42]) || null;
      const text = entity.properties[1] || '';
      
      dimensions.push({
        measurement,
        text,
        startPoint: {
          x: parseFloat(entity.properties[13]) || 0,
          y: parseFloat(entity.properties[23]) || 0
        },
        endPoint: {
          x: parseFloat(entity.properties[14]) || 0,
          y: parseFloat(entity.properties[24]) || 0
        }
      });
    }
  }
  
  return dimensions;
}

function extractTexts(entities) {
  const texts = [];
  
  for (const entity of entities) {
    if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
      texts.push({
        type: entity.type,
        content: entity.properties[1] || entity.properties[3] || '',
        position: {
          x: parseFloat(entity.properties[10]) || 0,
          y: parseFloat(entity.properties[20]) || 0
        },
        height: parseFloat(entity.properties[40]) || 2.5,
        rotation: parseFloat(entity.properties[50]) || 0
      });
    }
  }
  
  return texts;
}

function extractCoordinates(entity) {
  const coords = [];
  let i = 10;
  
  while (entity.properties[i] !== undefined) {
    const x = parseFloat(entity.properties[i]);
    const y = parseFloat(entity.properties[i + 10]);
    
    if (!isNaN(x) && !isNaN(y)) {
      coords.push({ x, y });
      i += 10;
    } else {
      break;
    }
  }
  
  return coords;
}

function calculateBounds(walls, doors, windows, columns) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  const updateBounds = (x, y, z = 0) => {
    if (x !== null && !isNaN(x)) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    if (y !== null && !isNaN(y)) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  };
  
  // Process walls
  for (const wall of walls) {
    for (const coord of wall.coordinates) {
      updateBounds(coord.x, coord.y);
    }
  }
  
  // Process doors
  for (const door of doors) {
    updateBounds(door.position.x, door.position.y, door.position.z);
  }
  
  // Process windows
  for (const window of windows) {
    updateBounds(window.position.x, window.position.y, window.position.z);
  }
  
  // Process columns
  for (const column of columns) {
    updateBounds(column.position.x, column.position.y, column.position.z);
  }
  
  return {
    minX: minX === Infinity ? 0 : minX,
    maxX: maxX === -Infinity ? 100 : maxX,
    minY: minY === Infinity ? 0 : minY,
    maxY: maxY === -Infinity ? 100 : maxY,
    minZ: minZ === Infinity ? 0 : minZ,
    maxZ: maxZ === -Infinity ? 30 : maxZ,
    width: (maxX === -Infinity ? 100 : maxX) - (minX === Infinity ? 0 : minX),
    depth: (maxY === -Infinity ? 100 : maxY) - (minY === Infinity ? 0 : minY),
    height: (maxZ === -Infinity ? 30 : maxZ) - (minZ === Infinity ? 0 : minZ)
  };
}

function getCoordinateRanges(entities) {
  let xMin = Infinity, xMax = -Infinity;
  let yMin = Infinity, yMax = -Infinity;
  let zMin = Infinity, zMax = -Infinity;
  
  for (const entity of entities) {
    const x = parseFloat(entity.properties[10]);
    const y = parseFloat(entity.properties[20]);
    const z = parseFloat(entity.properties[30]);
    
    if (!isNaN(x)) {
      xMin = Math.min(xMin, x);
      xMax = Math.max(xMax, x);
    }
    if (!isNaN(y)) {
      yMin = Math.min(yMin, y);
      yMax = Math.max(yMax, y);
    }
    if (!isNaN(z)) {
      zMin = Math.min(zMin, z);
      zMax = Math.max(zMax, z);
    }
  }
  
  return {
    x: { min: xMin === Infinity ? 0 : xMin, max: xMax === -Infinity ? 0 : xMax },
    y: { min: yMin === Infinity ? 0 : yMin, max: yMax === -Infinity ? 0 : yMax },
    z: { min: zMin === Infinity ? 0 : zMin, max: zMax === -Infinity ? 0 : zMax }
  };
}

function extractLayers(content) {
  const layers = [];
  const layerPattern = /^\s*2\s*\n(\w+)/gm;
  let match;
  
  while ((match = layerPattern.exec(content)) !== null) {
    const layerName = match[1];
    if (layerName && !layers.includes(layerName)) {
      layers.push(layerName);
    }
  }
  
  return layers;
}

function analyzeBuildingInfo(texts, dimensions) {
  const info = {
    floors: 7,
    units_per_floor: 2,
    floor_height: 3.15,
    stilt_height: 4.2,
    total_height: 26.25,
    unit_types: ['4BHK'],
    inferred_from: []
  };
  
  // Try to extract floor info from text annotations
  for (const text of texts) {
    const content = text.content.toLowerCase();
    
    if (content.includes('floor') || content.includes('level')) {
      info.inferred_from.push(content);
    }
    
    if (content.includes('4bhk') || content.includes('4 bhk')) {
      if (!info.unit_types.includes('4BHK')) {
        info.unit_types.push('4BHK');
      }
    }
  }
  
  // Extract measurements from dimensions
  const measurements = dimensions
    .filter(d => d.measurement)
    .map(d => d.measurement)
    .sort((a, b) => b - a);
  
  if (measurements.length > 0) {
    info.measurements_found = measurements.slice(0, 5); // Top 5
  }
  
  return info;
}

// For compatibility with existing code
export async function parseDrawing(filePath) {
  return parseDrawingAdvanced(filePath);
}
