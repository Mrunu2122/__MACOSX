import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { generateModel3D } from './modelGenerator.js';
import { parseDrawing } from './dxfParserAdvanced.js';  // Use advanced parser
import { generateRender } from './renderEngine.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.dxf', '.dwg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only DXF and DWG files are allowed'));
    }
  }
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Serve SPA - fallback to index.html for all non-API routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Upload and process drawing
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const projectId = uuidv4();
    let filePath = req.file.path;
    const originalExt = path.extname(req.file.originalname).toLowerCase();
    
    // Check if file format matches extension
    // DXF files start with ASCII "  0" or binary header
    const fileBuffer = fs.readFileSync(filePath, { encoding: 'latin1', flag: 'r' });
    const isActuallyDXF = fileBuffer.includes('SECTION') || fileBuffer.includes('ENDSEC');
    
    // If it's a DWG file that's actually DXF, rename it
    if (originalExt === '.dwg' && isActuallyDXF) {
      const newPath = filePath.replace('.dwg', '.dxf');
      fs.renameSync(filePath, newPath);
      filePath = newPath;
      console.log(`[AUTO-CONVERT] Renamed ${path.basename(req.file.path)} to DXF (was DWG extension)`);
    }

    const outputDir = path.join(__dirname, '../outputs', projectId);
    await fs.ensureDir(outputDir);

    // Generate 3D model using Python pipeline
    console.log(`Processing drawing: ${filePath}`);
    const model3D = await generateModel3D(filePath, outputDir);
    model3D.projectId = projectId;

    // Generate renders (optional)
    console.log('Generating renders...');
    try {
      const renders = await generateRender(model3D, outputDir);
    } catch (renderErr) {
      console.warn('Render generation skipped:', renderErr.message);
    }

    // Cleanup upload
    await fs.remove(filePath);

    res.json({
      projectId,
      success: true,
      message: 'Building model generated successfully',
      data: {
        model: {
          type: model3D.type,
          name: model3D.metadata.name,
          floors: model3D.metadata.floors,
          units: model3D.metadata.total_units,
          dimensions: model3D.metadata.dimensions,
          objects: model3D.stats.total_objects
        },
        statistics: model3D.stats
      }
    });
  } catch (error) {
    console.error('Error processing drawing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project data with model geometry
app.get('/api/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const outputDir = path.join(__dirname, '../outputs', projectId);
    
    // Check if the project directory exists
    if (!await fs.pathExists(outputDir)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Load model geometry if available
    let geometry = null;
    const modelJsonPath = path.join(outputDir, 'generated_geometry.json');
    
    if (await fs.pathExists(modelJsonPath)) {
      try {
        geometry = await fs.readJSON(modelJsonPath);
        console.log(`✓ Loaded geometry for project ${projectId}:`, { objectCount: geometry.objects?.length || 0 });
      } catch (e) {
        console.warn('Could not load model geometry:', e.message);
      }
    } else {
      console.warn(`No generated_geometry.json found at ${modelJsonPath}`);
    }
    
    // Build response
    const projectData = {
      projectId,
      geometry: geometry || {},
      metadata: geometry?.metadata || {}
    };
    
    // Add renders if available
    const rendersDir = path.join(outputDir, 'renders');
    if (await fs.pathExists(rendersDir)) {
      const files = await fs.readdir(rendersDir);
      projectData.renders = files
        .filter(f => f.endsWith('.png') || f.endsWith('.svg'))
        .sort()
        .map(name => `/api/project/${projectId}/renders/${name}`);
    }
    
    res.json(projectData);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Old endpoint for compatibility - Get project metadata
app.get('/api/project/:projectId/metadata', async (req, res) => {
  try {
    const { projectId } = req.params;
    const outputDir = path.join(__dirname, '../outputs', projectId);
    const metadataPath = path.join(outputDir, 'metadata.json');
    
    if (!await fs.pathExists(metadataPath)) {
      return res.status(404).json({ error: 'Metadata not found' });
    }
    
    const metadata = await fs.readJSON(metadataPath);
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get model file
app.get('/api/project/:projectId/model.glb', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Special handling for vibgyor project - check if model exists
    if (projectId === 'vibgyor') {
      const glbPath = path.join(__dirname, '../outputs', 'vibgyor_model.glb');
      if (await fs.pathExists(glbPath)) {
        return res.sendFile(glbPath);
      }
      // If GLB not found, return 404
      return res.status(404).json({ error: 'Model not found' });
    }

    res.status(404).json({ error: 'Model not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get model file
app.get('/api/project/:projectId/model', async (req, res) => {
  try {
    const { projectId } = req.params;
    const modelPath = path.join(__dirname, '../outputs', projectId, 'model.gltf');
    
    if (!await fs.pathExists(modelPath)) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.sendFile(modelPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get render image
app.get('/api/project/:projectId/renders/:filename', async (req, res) => {
  try {
    const { projectId, filename } = req.params;
    
    let imagePath;
    if (projectId === 'vibgyor') {
      imagePath = path.join(__dirname, '../outputs/renders', filename);
    } else {
      imagePath = path.join(__dirname, '../outputs', projectId, 'renders', filename);
    }
    
    if (!await fs.pathExists(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Set correct content-type based on file extension
    if (filename.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (filename.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }

    res.sendFile(imagePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SPA catch-all - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes or files
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
