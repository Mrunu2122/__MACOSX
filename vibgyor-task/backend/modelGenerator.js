import fs from 'fs-extra';
import path from 'path';
import { spawn, exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

/**
 * Build 3D model from uploaded DXF file using Python-based extraction and generation
 */
export async function generateModel3D(filePath, outputDir) {
  try {
    console.log('Starting 3D model generation pipeline...');
    
    // Step 1: Extract geometry from DXF using Python
    console.log('Step 1: Extracting geometry from DXF...');
    const extractedJsonPath = path.join(outputDir, 'extraction_output.json');
    const backendDir = path.dirname(filePath).includes('backend') 
      ? path.dirname(filePath) 
      : path.join(path.dirname(filePath), '..', 'backend');
    
    // Try simple fast extractor first
    console.log('[INFO] Using fast DXF extraction...');
    await new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [
        path.join(backendDir, 'dxf_extractor_simple.py'),
        filePath,
        extractedJsonPath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('[DXF Extractor]', data.toString().trim());
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('[DXF Extractor Error]', data.toString().trim());
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`DXF extraction failed with code ${code}: ${stderr}`));
        }
      });
    });
    
    if (!await fs.pathExists(extractedJsonPath)) {
      throw new Error('DXF extraction failed - no output file generated');
    }
    
    console.log('✓ DXF extraction complete');
    
    // Step 2: Generate 3D geometry from extracted data
    console.log('Step 2: Generating 3D geometry...');
    const generatedGeometryPath = path.join(outputDir, 'generated_geometry.json');
    
    await new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [
        path.join(backendDir, 'geometry_generator.py'),
        extractedJsonPath,
        generatedGeometryPath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('[Geometry Generator]', data.toString().trim());
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('[Geometry Generator Error]', data.toString().trim());
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Geometry generation failed with code ${code}: ${stderr}`));
        }
      });
    });
    
    if (!await fs.pathExists(generatedGeometryPath)) {
      throw new Error('Geometry generation failed - no output file generated');
    }
    
    console.log('✓ 3D geometry generation complete');
    
    // Step 3: Load the generated geometry
    const generatedGeometry = await fs.readJSON(generatedGeometryPath);
    const extractedData = await fs.readJSON(extractedJsonPath);
    
    // Step 4: Create model summary
    const model3D = {
      projectId: undefined, // Will be set by server
      type: 'VIBGYOR_RESIDENTIAL_BUILDING',
      metadata: generatedGeometry.metadata,
      geometry: generatedGeometry,
      extracted_data: extractedData,
      generated_at: new Date().toISOString(),
      
      // For quick access
      stats: {
        total_objects: generatedGeometry.statistics.total_objects,
        objects_by_type: generatedGeometry.statistics.by_type,
        objects_by_material: generatedGeometry.statistics.by_material,
        total_floors: generatedGeometry.metadata.floors,
        total_units: generatedGeometry.metadata.total_units
      }
    };

    // Generate metadata file
    const metadata = {
      building_name: 'VIBGYOR Residential',
      model_type: '3D Building Generation',
      dimensions: generatedGeometry.metadata.dimensions,
      structure: generatedGeometry.metadata.structure,
      units: 14,
      apartments_per_floor: 2,
      building_types: ['Type A (Front - 18m road)', 'Type B (Rear)'],
      bedrooms_per_unit: 4,
      total_floors: generatedGeometry.metadata.floors,
      amenities: ['Stilt Parking', 'Elevator', 'Staircase', 'Terrace'],
      generated_at: new Date().toISOString(),
      source: path.basename(filePath),
      extraction: {
        walls_extracted: extractedData.walls.length,
        columns_extracted: extractedData.columns.length,
        windows_extracted: extractedData.windows.length,
        doors_extracted: extractedData.doors.length,
        railings_extracted: extractedData.railings.length
      },
      geometry: {
        total_objects: generatedGeometry.statistics.total_objects,
        materials: Object.keys(generatedGeometry.materials).length,
        by_type: generatedGeometry.statistics.by_type
      }
    };

    await fs.writeJSON(path.join(outputDir, 'metadata.json'), metadata, { spaces: 2 });
    await fs.writeJSON(path.join(outputDir, 'model_3d.json'), model3D, { spaces: 2 });

    console.log('✓ 3D model generation pipeline complete');
    console.log(`   Building: ${metadata.building_name}`);
    console.log(`   Dimensions: ${metadata.dimensions.width}m × ${metadata.dimensions.depth}m × ${metadata.dimensions.total_height}m`);
    console.log(`   Floors: ${metadata.total_floors} residential + stilt + terrace`);
    console.log(`   Total Units: ${metadata.units} (${metadata.apartments_per_floor} per floor)`);
    console.log(`   Generated Objects: ${metadata.geometry.total_objects}`);

    return model3D;
  } catch (error) {
    console.error('Error generating 3D model:', error);
    throw new Error(`Failed to generate 3D model: ${error.message}`);
  }
}




