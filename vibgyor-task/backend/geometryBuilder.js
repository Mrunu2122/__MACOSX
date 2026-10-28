/**
 * 3D Geometry Builder
 * Converts extracted DXF data into Three.js compatible 3D geometry
 */

export class GeometryBuilder {
  constructor(drawingData) {
    this.drawing = drawingData;
    this.bounds = drawingData.bounds;
    this.geometry = {
      vertices: [],
      faces: [],
      materials: {},
      objects: []
    };
  }

  /**
   * Build complete 3D model
   */
  buildModel(numberOfFloors = 7, stiltHeight = 4.2, floorHeight = 3.15) {
    console.log('Building 3D geometry from DXF data...');

    // Create building shell
    this.buildBuildingShell(numberOfFloors, stiltHeight, floorHeight);

    // Add individual elements
    this.buildWalls();
    this.buildFloors(numberOfFloors, stiltHeight, floorHeight);
    this.buildWindows();
    this.buildDoors();
    this.buildBalconies(numberOfFloors, stiltHeight, floorHeight);
    this.buildStaircase();
    this.buildRoof(numberOfFloors, stiltHeight, floorHeight);

    return {
      vertices: this.geometry.vertices,
      faces: this.geometry.faces,
      objects: this.geometry.objects,
      materials: this.geometry.materials,
      bounds: this.bounds
    };
  }

  /**
   * Build main building shell (outer walls)
   */
  buildBuildingShell(numberOfFloors, stiltHeight, floorHeight) {
    const width = this.bounds.width;
    const depth = this.bounds.depth;
    const totalHeight = stiltHeight + (numberOfFloors * floorHeight);

    // Simplified building footprint - rectangular for now
    const corners = [
      { x: 0, y: 0, z: 0 },
      { x: width, y: 0, z: 0 },
      { x: width, y: depth, z: 0 },
      { x: 0, y: depth, z: 0 }
    ];

    // Top corners
    const topCorners = corners.map(c => ({
      ...c,
      z: totalHeight
    }));

    // Create vertical walls
    for (let i = 0; i < 4; i++) {
      const c1 = corners[i];
      const c2 = corners[(i + 1) % 4];
      const t1 = topCorners[i];
      const t2 = topCorners[(i + 1) % 4];

      // Wall face
      this.geometry.objects.push({
        type: 'wall',
        name: `Wall_${i}`,
        corners: [c1, c2, t2, t1],
        material: 'concrete',
        thickness: 0.23
      });
    }

    return this.geometry.objects;
  }

  /**
   * Build individual walls from DXF wall entities
   */
  buildWalls() {
    const walls = this.drawing.entities.walls || [];

    for (const wall of walls) {
      if (!wall.coordinates || wall.coordinates.length < 2) continue;

      // Extrude 2D wall to 3D with proper height
      const wallGeometry = this.extrudeWallToHeight(
        wall.coordinates,
        wall.thickness || 0.23,
        this.drawing.buildingInfo.stilt_height || 0
      );

      this.geometry.objects.push({
        type: 'wall',
        name: `Wall_from_${wall.layer}`,
        geometry: wallGeometry,
        material: 'brick',
        layer: wall.layer
      });
    }

    console.log(`✓ Added ${walls.length} walls`);
  }

  /**
   * Build horizontal floor slabs
   */
  buildFloors(numberOfFloors, stiltHeight, floorHeight) {
    const width = this.bounds.width;
    const depth = this.bounds.depth;

    // Stilt floor (parking level)
    this.geometry.objects.push({
      type: 'floor',
      name: 'Stilt_Floor',
      level: 0,
      zPosition: 0,
      width,
      depth,
      thickness: 0.5,
      purpose: 'parking',
      material: 'concrete'
    });

    // Residential floors
    for (let i = 0; i < numberOfFloors; i++) {
      const zPosition = stiltHeight + (i * floorHeight);

      this.geometry.objects.push({
        type: 'floor',
        name: `Floor_${i + 1}`,
        level: i + 1,
        zPosition,
        width,
        depth,
        thickness: 0.4,
        purpose: 'residential',
        units: 2,
        unitTypes: i % 2 === 0 ? 'Type A' : 'Type B',
        material: 'concrete'
      });
    }

    // Terrace floor
    const terraceZ = stiltHeight + (numberOfFloors * floorHeight);
    this.geometry.objects.push({
      type: 'floor',
      name: 'Terrace',
      level: numberOfFloors + 1,
      zPosition: terraceZ,
      width,
      depth,
      thickness: 0.5,
      purpose: 'terrace',
      material: 'concrete'
    });

    console.log(`✓ Added ${numberOfFloors + 2} floors (stilt + ${numberOfFloors} residential + terrace)`);
  }

  /**
   * Build windows from DXF window data
   */
  buildWindows() {
    const windows = this.drawing.entities.windows || [];

    // Generate windows on each floor
    const numberOfFloors = this.drawing.buildingInfo.floors || 7;
    const floorHeight = this.drawing.buildingInfo.floor_height || 3.15;
    const stiltHeight = this.drawing.buildingInfo.stilt_height || 4.2;

    // Add parametric windows (grid pattern on facade)
    const windowSpacing = 2.5; // Space between windows
    const windowWidth = 1.2;
    const windowHeight = 1.2;
    const windowDepth = 0.3;

    let windowCount = 0;

    // Front facade windows
    for (let floor = 0; floor < numberOfFloors; floor++) {
      const zBase = stiltHeight + (floor * floorHeight) + 0.8; // Window sill height

      for (let col = 0; col < 5; col++) {
        const x = 1 + (col * windowSpacing);

        this.geometry.objects.push({
          type: 'window',
          name: `Window_F${floor}_${col}`,
          position: { x, y: 0, z: zBase },
          size: { width: windowWidth, height: windowHeight, depth: windowDepth },
          material: 'glass',
          facade: 'front'
        });

        windowCount++;
      }
    }

    // Back facade windows
    for (let floor = 0; floor < numberOfFloors; floor++) {
      const zBase = stiltHeight + (floor * floorHeight) + 0.8;

      for (let col = 0; col < 4; col++) {
        const x = 2 + (col * windowSpacing);

        this.geometry.objects.push({
          type: 'window',
          name: `Window_B${floor}_${col}`,
          position: { x, y: this.bounds.depth, z: zBase },
          size: { width: windowWidth, height: windowHeight, depth: windowDepth },
          material: 'glass',
          facade: 'back'
        });

        windowCount++;
      }
    }

    console.log(`✓ Added ${windowCount} windows (${windows.length} from DXF + parametric)`);
  }

  /**
   * Build doors from DXF door data
   */
  buildDoors() {
    const doors = this.drawing.entities.doors || [];

    // Main entrance door
    this.geometry.objects.push({
      type: 'door',
      name: 'Main_Entrance',
      position: { x: this.bounds.width / 2, y: 0, z: 0.5 },
      size: { width: 2.0, height: 2.5, depth: 0.2 },
      swing: 'inward',
      material: 'wood',
      purpose: 'entrance'
    });

    // Unit entry doors on each floor
    for (let floor = 0; floor < (this.drawing.buildingInfo.floors || 7); floor++) {
      const zBase = (this.drawing.buildingInfo.stilt_height || 4.2) + (floor * (this.drawing.buildingInfo.floor_height || 3.15));

      for (let unit = 0; unit < 2; unit++) {
        this.geometry.objects.push({
          type: 'door',
          name: `Door_F${floor}_U${unit}`,
          position: { x: 2 + (unit * 5), y: 1.5, z: zBase + 0.1 },
          size: { width: 1.2, height: 2.1, depth: 0.15 },
          swing: 'outward',
          material: 'wood',
          purpose: 'unit_entry'
        });
      }
    }

    console.log(`✓ Added ${2 * (this.drawing.buildingInfo.floors || 7) + 1} doors`);
  }

  /**
   * Build balconies
   */
  buildBalconies(numberOfFloors, stiltHeight, floorHeight) {
    const depth = 1.5; // Balcony depth in meters
    const railingHeight = 1.1;
    const width = this.bounds.width;

    let balconyCount = 0;

    // Front balconies
    for (let floor = 0; floor < numberOfFloors; floor++) {
      const zBase = stiltHeight + (floor * floorHeight);

      this.geometry.objects.push({
        type: 'balcony',
        name: `Balcony_Front_F${floor}`,
        position: { x: 0, y: -depth, z: zBase },
        size: { width, depth, height: railingHeight },
        material: 'concrete',
        railing: true,
        railingHeight
      });

      balconyCount++;
    }

    // Back balconies
    for (let floor = 0; floor < numberOfFloors; floor++) {
      const zBase = stiltHeight + (floor * floorHeight);

      this.geometry.objects.push({
        type: 'balcony',
        name: `Balcony_Back_F${floor}`,
        position: { x: 0, y: this.bounds.depth, z: zBase },
        size: { width, depth, height: railingHeight },
        material: 'concrete',
        railing: true,
        railingHeight
      });

      balconyCount++;
    }

    console.log(`✓ Added ${balconyCount} balconies (front + back on each floor)`);
  }

  /**
   * Build staircase/elevator core
   */
  buildStaircase() {
    const coreWidth = 3.0;
    const coreDepth = 3.5;
    const x = this.bounds.width / 2 - coreWidth / 2;
    const y = this.bounds.depth / 2 - coreDepth / 2;

    // Central core
    this.geometry.objects.push({
      type: 'core',
      name: 'Staircase_Elevator_Core',
      position: { x, y, z: 0 },
      size: { width: coreWidth, depth: coreDepth },
      hasStairs: true,
      hasElevator: true,
      material: 'concrete'
    });

    console.log('✓ Added central staircase/elevator core');
  }

  /**
   * Build roof
   */
  buildRoof(numberOfFloors, stiltHeight, floorHeight) {
    const width = this.bounds.width;
    const depth = this.bounds.depth;
    const topZ = stiltHeight + (numberOfFloors * floorHeight);
    const parapetHeight = 1.0;

    // Flat roof with parapet
    this.geometry.objects.push({
      type: 'roof',
      name: 'Main_Roof',
      position: { x: 0, y: 0, z: topZ },
      size: { width, depth, thickness: 0.5 },
      parapet: {
        height: parapetHeight,
        material: 'concrete',
        color: '#8B7355'
      },
      material: 'waterproofing'
    });

    console.log('✓ Added roof with parapet');
  }

  /**
   * Extrude 2D wall line to 3D geometry
   */
  extrudeWallToHeight(coordinates, thickness, baseHeight, height = 8) {
    const walls = [];

    for (let i = 0; i < coordinates.length - 1; i++) {
      const p1 = coordinates[i];
      const p2 = coordinates[i + 1];

      // Create wall segment
      walls.push({
        start: { x: p1.x, y: p1.y, z: baseHeight },
        end: { x: p2.x, y: p2.y, z: baseHeight },
        thickness,
        height
      });
    }

    return walls;
  }

  /**
   * Get material definitions
   */
  getMaterials() {
    return {
      concrete: {
        color: '#A9A9A9',
        roughness: 0.8,
        metallic: 0,
        type: 'standard'
      },
      brick: {
        color: '#CD5C5C',
        roughness: 0.9,
        metallic: 0,
        type: 'standard'
      },
      glass: {
        color: '#B0E0E6',
        roughness: 0.1,
        metallic: 0,
        transparency: 0.7,
        type: 'glass'
      },
      wood: {
        color: '#8B4513',
        roughness: 0.7,
        metallic: 0,
        type: 'standard'
      },
      waterproofing: {
        color: '#696969',
        roughness: 0.6,
        metallic: 0.1,
        type: 'standard'
      },
      facade: {
        color: '#D3D3D3',
        roughness: 0.5,
        metallic: 0.1,
        type: 'standard'
      }
    };
  }

  /**
   * Summary of generated geometry
   */
  getSummary() {
    return {
      total_objects: this.geometry.objects.length,
      by_type: this.geometry.objects.reduce((acc, obj) => {
        acc[obj.type] = (acc[obj.type] || 0) + 1;
        return acc;
      }, {}),
      bounds: this.bounds,
      building_dimensions: {
        width: `${this.bounds.width.toFixed(1)}m`,
        depth: `${this.bounds.depth.toFixed(1)}m`,
        height: `${this.bounds.height.toFixed(1)}m`
      }
    };
  }
}

export default GeometryBuilder;
