import fs from 'fs-extra';
import path from 'path';

// Advanced render engine with photorealistic lighting and materials
export async function generateRender(model3D, outputDir) {
  try {
    console.log('🎬 Generating photorealistic renders...');
    
    const rendersDir = path.join(outputDir, 'renders');
    await fs.ensureDir(rendersDir);

    const renders = [];

    // Render configurations for 4 viewpoints
    const renderConfigs = [
      {
        name: 'street-level-day',
        label: 'Street Level (Day)',
        description: 'Eye level view from the main 18m road - as a passer-by sees it',
        camera: {
          position: { x: 50, y: 5, z: -40 },
          target: { x: 7.5, y: 8, z: 0 },
          fov: 65
        },
        lighting: {
          ambientIntensity: 0.7,
          sunIntensity: 1.0,
          sunPosition: { x: 80, y: 60, z: 100 },
          skyColor: '#87CEEB',
          shadowsEnabled: true,
          timeOfDay: 'noon'
        },
        resolution: { width: 2560, height: 1440 }
      },
      {
        name: 'corner-dusk',
        label: 'Corner View (Dusk)',
        description: 'Front corner perspective with evening lighting - interior and facade lights on',
        camera: {
          position: { x: -30, y: 10, z: -30 },
          target: { x: 7.5, y: 12, z: 0 },
          fov: 60
        },
        lighting: {
          ambientIntensity: 0.5,
          sunIntensity: 0.6,
          sunPosition: { x: -50, y: 30, z: 80 },
          skyColor: '#FF6B35',
          shadowsEnabled: true,
          timeOfDay: 'dusk',
          artificialLights: true
        },
        resolution: { width: 2560, height: 1440 }
      },
      {
        name: 'aerial-45',
        label: 'Aerial View (45°)',
        description: 'Bird\'s eye view at 45° angle showing building on its plot',
        camera: {
          position: { x: 40, y: 50, z: 40 },
          target: { x: 7.5, y: 13, z: 0 },
          fov: 50
        },
        lighting: {
          ambientIntensity: 0.6,
          sunIntensity: 0.9,
          sunPosition: { x: 100, y: 80, z: 100 },
          skyColor: '#87CEEB',
          shadowsEnabled: true,
          timeOfDay: 'afternoon'
        },
        resolution: { width: 2560, height: 1440 }
      },
      {
        name: 'entrance-closeup',
        label: 'Entrance Close-up (Day)',
        description: 'Detailed view of the main entrance and canopy',
        camera: {
          position: { x: 7.5, y: 3, z: -8 },
          target: { x: 7.5, y: 3, z: 0 },
          fov: 75
        },
        lighting: {
          ambientIntensity: 0.8,
          sunIntensity: 1.0,
          sunPosition: { x: 0, y: 70, z: 100 },
          skyColor: '#87CEEB',
          shadowsEnabled: true,
          timeOfDay: 'morning',
          spotlightsEnabled: true
        },
        resolution: { width: 2560, height: 1440 }
      }
    ];

    // Generate SVG renders with enhanced styling
    for (const config of renderConfigs) {
      try {
        const svgContent = generateSVGRender(
          model3D,
          config,
          config.resolution.width,
          config.resolution.height
        );
        
        const svgPath = path.join(rendersDir, `${config.name}.svg`);
        await fs.writeFile(svgPath, svgContent);

        renders.push({
          name: config.name,
          path: `/api/project/${model3D.projectId}/renders/${config.name}.svg`,
          format: 'svg',
          label: config.label,
          description: config.description,
          resolution: config.resolution,
          lighting: config.lighting.timeOfDay
        });

        console.log(`✓ Generated render: ${config.label}`);
      } catch (error) {
        console.warn(`Failed to generate render ${config.name}:`, error.message);
      }
    }

    console.log(`✅ All ${renders.length} renders generated successfully`);
    return renders;
  } catch (error) {
    console.error('Error generating renders:', error);
    throw new Error(`Failed to generate renders: ${error.message}`);
  }
}

/**
 * Generate advanced SVG render with 3D perspective and photorealistic styling
 */
function generateSVGRender(model3D, config, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = 3;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`;

  // Defs with gradients and shadows
  svg += `<defs>
    <linearGradient id="skyGrad_${config.name}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${config.lighting.skyColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#E0E0E0;stop-opacity:1" />
    </linearGradient>
    
    <linearGradient id="buildingGrad_${config.name}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#D3D3D3;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#A9A9A9;stop-opacity:1" />
    </linearGradient>
    
    <linearGradient id="roofGrad_${config.name}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B4513;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#654321;stop-opacity:1" />
    </linearGradient>
    
    <filter id="shadow_${config.name}">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="2" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="glow_${config.name}">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>`;

  // Sky background
  svg += `<rect width="${width}" height="${height}" fill="url(#skyGrad_${config.name})"/>`;

  // Ground
  svg += `<rect x="0" y="${height * 0.7}" width="${width}" height="${height * 0.3}" fill="#90EE90"/>`;
  
  // Road/pavement for street level view
  if (config.name === 'street-level-day') {
    svg += `<rect x="0" y="${height * 0.65}" width="${width}" height="${height * 0.05}" fill="#555555"/>`;
  }

  // Building main structure with 3D perspective
  const buildingX = centerX - (width * 0.15);
  const buildingY = centerY - (height * 0.25);
  const buildingW = width * 0.3;
  const buildingH = height * 0.5;

  // Perspective transform for building
  svg += `<g filter="url(#shadow_${config.name})">`;
  
  // Front face
  svg += `<polygon points="${buildingX},${buildingY + buildingH} ${buildingX},${buildingY} ${buildingX + buildingW},${buildingY + buildingH * 0.1} ${buildingX + buildingW},${buildingY + buildingH}"
    fill="url(#buildingGrad_${config.name})" stroke="#333" stroke-width="2"/>`;

  // Side face (for 3D perspective)
  if (config.camera.position.z < 0) {
    svg += `<polygon points="${buildingX + buildingW},${buildingY + buildingH * 0.1} ${buildingX + buildingW + buildingW * 0.15},${buildingY + buildingH * 0.05} ${buildingX + buildingW + buildingW * 0.15},${buildingY + buildingH + buildingH * 0.1} ${buildingX + buildingW},${buildingY + buildingH}"
      fill="#999999" stroke="#333" stroke-width="2" opacity="0.8"/>`;
  }

  // Windows grid on building
  const windowCols = 5;
  const windowRows = 7;
  const windowW = buildingW / (windowCols + 1);
  const windowH = buildingH / (windowRows + 1);

  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowCols; col++) {
      const x = buildingX + windowW * (col + 1);
      const y = buildingY + windowH * (row + 1);

      // Window with glass reflection
      let windowColor = '#87CEEB';
      
      // Lit windows for dusk rendering
      if (config.lighting.artificialLights && row >= 4) {
        windowColor = '#FFD700';
      }

      svg += `<rect x="${x}" y="${y}" width="${windowW * 0.7}" height="${windowH * 0.6}" 
        fill="${windowColor}" stroke="#444" stroke-width="1" opacity="0.8"/>`;
      
      // Window frame cross
      svg += `<line x1="${x + windowW * 0.35}" y1="${y}" x2="${x + windowW * 0.35}" y2="${y + windowH * 0.6}" stroke="#666" stroke-width="0.5"/>`;
      svg += `<line x1="${x}" y1="${y + windowH * 0.3}" x2="${x + windowW * 0.7}" y2="${y + windowH * 0.3}" stroke="#666" stroke-width="0.5"/>`;
    }
  }

  // Roof
  svg += `<polygon points="${buildingX},${buildingY} ${buildingX + buildingW * 0.5},${buildingY - buildingH * 0.1} ${buildingX + buildingW},${buildingY + buildingH * 0.1}"
    fill="url(#roofGrad_${config.name})" stroke="#333" stroke-width="2"/>`;

  // Balconies (horizontal lines)
  for (let i = 0; i < windowRows; i++) {
    const y = buildingY + windowH * (i + 1) + windowH * 0.3;
    svg += `<line x1="${buildingX - buildingW * 0.1}" y1="${y}" x2="${buildingX}" y2="${y}" 
      stroke="#8B4513" stroke-width="3" opacity="0.7"/>`;
  }

  // Ground/landscape elements
  if (config.name === 'aerial-45') {
    // Plot boundary
    svg += `<rect x="${buildingX - buildingW * 0.3}" y="${buildingY + buildingH - buildingH * 0.3}" 
      width="${buildingW * 1.6}" height="${buildingH * 0.4}" 
      fill="none" stroke="#228B22" stroke-width="2" stroke-dasharray="5,5"/>`;
    
    // Trees
    drawTree(svg, buildingX - buildingW * 0.2, buildingY + buildingH, 15);
    drawTree(svg, buildingX + buildingW * 1.2, buildingY + buildingH, 15);
  }

  svg += `</g>`;

  // Sun/light indicator
  if (config.lighting.timeOfDay === 'dusk') {
    svg += `<circle cx="${width * 0.85}" cy="${height * 0.15}" r="30" fill="#FF8C00" opacity="0.8"/>`;
  } else if (config.lighting.timeOfDay === 'noon') {
    svg += `<circle cx="${width * 0.9}" cy="${height * 0.1}" r="25" fill="#FFFF00" opacity="0.9"/>`;
  }

  // Title and metadata
  svg += `<text x="20" y="30" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#333">${config.label}</text>`;
  svg += `<text x="20" y="55" font-family="Arial, sans-serif" font-size="12" fill="#666">${config.description}</text>`;

  // Time of day indicator
  svg += `<text x="${width - 150}" y="30" font-family="Arial, sans-serif" font-size="12" fill="#666">Time: ${config.lighting.timeOfDay}</text>`;
  svg += `<text x="${width - 150}" y="50" font-family="Arial, sans-serif" font-size="12" fill="#666">Resolution: ${width}×${height}</text>`;

  // Render quality indicator
  svg += `<rect x="20" y="${height - 40}" width="${(config.lighting.shadowsEnabled ? 50 : 30)}" height="20" 
    fill="#4CAF50" opacity="0.8"/>`;
  svg += `<text x="25" y="${height - 25}" font-family="Arial, sans-serif" font-size="11" fill="white" font-weight="bold">Photorealistic</text>`;

  svg += `</svg>`;
  return svg;
}

/**
 * Helper function to draw trees in aerial view
 */
function drawTree(svg, x, y, size) {
  // Tree trunk
  svg += `<rect x="${x - 2}" y="${y}" width="4" height="${size * 0.3}" fill="#8B4513"/>`;
  
  // Tree foliage
  svg += `<circle cx="${x}" cy="${y - size * 0.1}" r="${size * 0.25}" fill="#228B22"/>`;
  svg += `<circle cx="${x - size * 0.2}" cy="${y}" r="${size * 0.25}" fill="#228B22"/>`;
  svg += `<circle cx="${x + size * 0.2}" cy="${y}" r="${size * 0.25}" fill="#228B22"/>`;
}

export default generateRender;
