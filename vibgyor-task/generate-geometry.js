#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function generateVibgyorBuilding() {
  const config = {
    stilt_height: 3.2,
    floor_height: 3.15,
    num_floors: 7,
    terrace_height: 1.2,
    wall_thickness: 0.3,
    column_diameter: 0.6,
    window_width: 1.5,
    window_height: 1.8,
    window_sill_height: 0.9,
    door_width: 1.2,
    door_height: 2.1,
    balcony_depth: 2.5,
    railing_height: 1.1,
  };

  // Building footprint
  const min_x = 0.0;
  const min_y = 0.0;
  const width = 60.0;
  const depth = 40.0;
  const max_x = min_x + width;
  const max_y = min_y + depth;
  const center_x = (min_x + max_x) / 2;
  const center_y = (min_y + max_y) / 2;

  config.total_height =
    config.stilt_height +
    config.floor_height * config.num_floors +
    config.terrace_height;

  const materials = {
    exterior_wall: { color: '#E8D7C3', roughness: 0.7, metallic: 0.0 },
    concrete: { color: '#A9A9A9', roughness: 0.8, metallic: 0.0 },
    glass: { color: '#87CEEB', roughness: 0.1, metallic: 0.0 },
    balcony_slab: { color: '#9E9E9E', roughness: 0.6, metallic: 0.0 },
    railing: { color: '#4A4A4A', roughness: 0.5, metallic: 0.2 },
    column: { color: '#8B8B8B', roughness: 0.7, metallic: 0.1 },
    ground: { color: '#696969', roughness: 0.8, metallic: 0.0 },
    roof: { color: '#555555', roughness: 0.6, metallic: 0.0 },
    door: { color: '#8B4513', roughness: 0.7, metallic: 0.0 },
    parking: { color: '#C0C0C0', roughness: 0.7, metallic: 0.0 },
  };

  const objects = [];

  // Ground plane
  objects.push({
    type: 'ground',
    name: 'Ground_Plane',
    floor_number: -1,
    center: { x: center_x, y: center_y, z: 0.0 },
    dimensions: { width: width * 3, height: 1.0, depth: depth * 3 },
    material: 'ground',
    purpose: 'site',
  });

  // STILT LEVEL
  const stilt_z_center = config.stilt_height / 2;

  objects.push({
    type: 'floor',
    name: 'Stilt_Floor',
    floor_number: 0,
    level: 'stilt',
    center: { x: center_x, y: center_y, z: 0.05 },
    dimensions: { width: width + 0.6, thickness: 0.35, depth: depth + 0.6 },
    material: 'concrete',
    purpose: 'parking',
  });

  // Stilt columns
  const col_rows = 2;
  const col_cols = 3;
  const col_spacing_x = width / (col_cols + 1);
  const col_spacing_y = depth / (col_rows + 1);

  for (let row = 1; row <= col_rows; row++) {
    for (let col = 1; col <= col_cols; col++) {
      const col_x = min_x + col_spacing_x * col;
      const col_y = min_y + col_spacing_y * row;
      const col_z = config.stilt_height / 2;

      objects.push({
        type: 'column',
        name: `Column_Stilt_${row}_${col}`,
        floor_number: 0,
        center: { x: col_x, y: col_y, z: col_z },
        diameter: config.column_diameter,
        height: config.stilt_height,
        material: 'column',
        purpose: 'structural',
      });
    }
  }

  // RESIDENTIAL FLOORS
  for (let floor_num = 1; floor_num <= config.num_floors; floor_num++) {
    const floor_z_base = config.stilt_height + (floor_num - 1) * config.floor_height;
    const floor_z_top = floor_z_base + config.floor_height;
    const floor_z_slab = floor_z_base + 0.175;
    const wall_z_center = floor_z_base + 0.35 + (config.floor_height - 0.35) / 2;

    // Floor slab
    objects.push({
      type: 'floor',
      name: `Floor_${floor_num}`,
      floor_number: floor_num,
      level: floor_num,
      center: { x: center_x, y: center_y, z: floor_z_slab },
      dimensions: { width: width + 0.6, thickness: 0.35, depth: depth + 0.6 },
      material: 'concrete',
      purpose: 'residential',
      units: 2,
      unit_types: ['Type A (Front)', 'Type B (Rear)'],
      apartments_per_floor: 2,
      bedrooms_per_unit: 4,
    });

    const wall_offset = config.wall_thickness / 2;

    // Exterior walls
    objects.push({
      type: 'wall',
      name: `Wall_Front_F${floor_num}`,
      floor_number: floor_num,
      center: { x: center_x, y: min_y + wall_offset, z: wall_z_center },
      dimensions: { length: width, height: config.floor_height - 0.35, thickness: config.wall_thickness },
      material: 'exterior_wall',
      orientation: 'south',
      facade: 'Type A apartments',
    });

    objects.push({
      type: 'wall',
      name: `Wall_Rear_F${floor_num}`,
      floor_number: floor_num,
      center: { x: center_x, y: max_y - wall_offset, z: wall_z_center },
      dimensions: { length: width, height: config.floor_height - 0.35, thickness: config.wall_thickness },
      material: 'exterior_wall',
      orientation: 'north',
      facade: 'Type B apartments',
    });

    objects.push({
      type: 'wall',
      name: `Wall_Left_F${floor_num}`,
      floor_number: floor_num,
      center: { x: min_x + wall_offset, y: center_y, z: wall_z_center },
      dimensions: { length: depth, height: config.floor_height - 0.35, thickness: config.wall_thickness },
      material: 'exterior_wall',
      orientation: 'west',
    });

    objects.push({
      type: 'wall',
      name: `Wall_Right_F${floor_num}`,
      floor_number: floor_num,
      center: { x: max_x - wall_offset, y: center_y, z: wall_z_center },
      dimensions: { length: depth, height: config.floor_height - 0.35, thickness: config.wall_thickness },
      material: 'exterior_wall',
      orientation: 'east',
    });

    // Windows on front facade
    const num_front_windows = 5;
    const window_spacing = width / (num_front_windows + 1);
    const window_z = floor_z_base + config.window_sill_height + config.window_height / 2;

    for (let w = 1; w <= num_front_windows; w++) {
      const win_x = min_x + window_spacing * w;
      objects.push({
        type: 'window',
        name: `Window_Front_F${floor_num}_W${w}`,
        floor_number: floor_num,
        center: { x: win_x, y: min_y - 0.2, z: window_z },
        dimensions: { width: config.window_width, height: config.window_height, depth: 0.15 },
        material: 'glass',
        orientation: 'south',
      });
    }

    // Windows on rear facade
    for (let w = 1; w <= num_front_windows; w++) {
      const win_x = min_x + window_spacing * w;
      objects.push({
        type: 'window',
        name: `Window_Rear_F${floor_num}_W${w}`,
        floor_number: floor_num,
        center: { x: win_x, y: max_y + 0.2, z: window_z },
        dimensions: { width: config.window_width, height: config.window_height, depth: 0.15 },
        material: 'glass',
        orientation: 'north',
      });
    }

    // Main entrance (F1 only)
    if (floor_num === 1) {
      const door_z = floor_z_base + config.door_height / 2;
      objects.push({
        type: 'door',
        name: `Door_Main_F${floor_num}`,
        floor_number: floor_num,
        center: { x: center_x - 5, y: min_y - 0.15, z: door_z },
        dimensions: { width: config.door_width, height: config.door_height },
        material: 'door',
        orientation: 'south',
        purpose: 'main_entrance',
      });
    }

    // Emergency exits
    if ([1, 4, 7].includes(floor_num)) {
      const door_z = floor_z_base + config.door_height / 2;
      objects.push({
        type: 'door',
        name: `Door_Emergency_F${floor_num}`,
        floor_number: floor_num,
        center: { x: center_x, y: max_y + 0.15, z: door_z },
        dimensions: { width: config.door_width, height: config.door_height },
        material: 'door',
        orientation: 'north',
        purpose: 'emergency_exit',
      });
    }

    // Balconies
    const balcony_z_slab = floor_z_base + 0.15;
    const balcony_width = width * 0.9;

    objects.push({
      type: 'balcony',
      name: 'Balcony_Front_F' + floor_num,
      floor_number: floor_num,
      center: { x: center_x, y: min_y + config.balcony_depth / 2, z: balcony_z_slab },
      dimensions: { width: balcony_width, depth: config.balcony_depth, thickness: 0.3 },
      material: 'balcony_slab',
      orientation: 'south',
      apartment_type: 'Type A',
    });

    objects.push({
      type: 'balcony',
      name: 'Balcony_Rear_F' + floor_num,
      floor_number: floor_num,
      center: { x: center_x, y: max_y - config.balcony_depth / 2, z: balcony_z_slab },
      dimensions: { width: balcony_width, depth: config.balcony_depth, thickness: 0.3 },
      material: 'balcony_slab',
      orientation: 'north',
      apartment_type: 'Type B',
    });

    // Balcony railings
    const railing_z = balcony_z_slab + 0.15 + config.railing_height / 2;

    objects.push({
      type: 'railing',
      name: 'Railing_Front_F' + floor_num,
      floor_number: floor_num,
      center: { x: center_x, y: min_y + 0.1, z: railing_z },
      dimensions: { length: balcony_width, height: config.railing_height, thickness: 0.1 },
      material: 'railing',
    });

    objects.push({
      type: 'railing',
      name: 'Railing_Rear_F' + floor_num,
      floor_number: floor_num,
      center: { x: center_x, y: max_y - 0.1, z: railing_z },
      dimensions: { length: balcony_width, height: config.railing_height, thickness: 0.1 },
      material: 'railing',
    });
    // Structural columns
    for (let row = 1; row <= col_rows; row++) {
      for (let col = 1; col <= col_cols; col++) {
        const col_x = min_x + col_spacing_x * col;
        const col_y = min_y + col_spacing_y * row;
        const col_z = wall_z_center;

        objects.push({
          type: 'column',
          name: `Column_F${floor_num}_${row}_${col}`,
          floor_number: floor_num,
          center: { x: col_x, y: col_y, z: col_z },
          diameter: config.column_diameter,
          height: config.floor_height,
          material: 'column',
          purpose: 'structural',
        });
      }
    }
  }

  // TERRACE
  const terrace_z_base = config.stilt_height + config.num_floors * config.floor_height;
  const terrace_z = terrace_z_base + config.terrace_height / 2;

  objects.push({
    type: 'floor',
    name: 'Terrace_Floor',
    floor_number: 8,
    level: 'terrace',
    center: { x: center_x, y: center_y, z: terrace_z },
    dimensions: { width: width + 0.6, thickness: 0.4, depth: depth + 0.6 },
    material: 'concrete',
    purpose: 'terrace',
  });

  // Rooftop Core Enclosure (Lift machine room & staircase access)
  const core_height = 2.4;
  const core_z = terrace_z + config.terrace_height / 2 + core_height / 2;
  objects.push({
    type: 'floor',
    name: 'Rooftop_Machine_Room',
    floor_number: 8,
    center: { x: center_x, y: center_y, z: core_z },
    dimensions: { width: 14.0, height: core_height, depth: 10.0 },
    material: 'concrete',
    purpose: 'lift_machine_room',
  });

  // Statistics
  const by_floor = {};
  const by_type = {};
  const by_material = {};

  for (const obj of objects) {
    const floor = obj.floor_number ?? -1;
    by_floor[floor] = (by_floor[floor] ?? 0) + 1;

    const typ = obj.type ?? 'box';
    by_type[typ] = (by_type[typ] ?? 0) + 1;

    const mat = obj.material ?? 'concrete';
    by_material[mat] = (by_material[mat] ?? 0) + 1;
  }

  return {
    metadata: {
      name: 'VIBGYOR Residential Building',
      type: '3D Building Model',
      location: 'Prabhat Nagar, Ahmedabad',
      floors: config.num_floors,
      units_per_floor: 2,
      total_units: config.num_floors * 2,
      dimensions: { width, depth, total_height: config.total_height },
      structure: {
        stilt_height: config.stilt_height,
        floor_height: config.floor_height,
        num_floors: config.num_floors,
        terrace_height: config.terrace_height,
      },
    },
    materials,
    objects,
    statistics: {
      total_objects: objects.length,
      by_floor,
      by_type,
      by_material,
    },
  };
}

const building = generateVibgyorBuilding();

const outputPaths = [
  path.join(__dirname, 'frontend', 'public', 'test-project-geometry.json'),
  path.join(__dirname, 'frontend', 'dist', 'test-project-geometry.json'),
];

for (const outputPath of outputPaths) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(building, null, 2));
}

console.log(`✓ Generated ${building.statistics.total_objects} 3D objects`);
console.log(`✓ Total objects: ${building.statistics.total_objects}`);
console.log(`✓ By floor: ${JSON.stringify(building.statistics.by_floor)}`);
console.log(`✓ Building dimensions: W=${building.metadata.dimensions.width}m, D=${building.metadata.dimensions.depth}m, H=${building.metadata.dimensions.total_height}m`);
console.log(`✓ Written to ${outputPaths.join(' and ')}`);
