import React, { useState, useEffect } from 'react';
import './ProjectInfo.css';

export default function ProjectInfo({ projectId }) {
  const [modelStats, setModelStats] = useState({
    projectName: 'VIBGYOR Residential',
    location: 'Prabhat Nagar, Ahmedabad',
    totalFloors: '7 Residential + Stilt + Terrace',
    apartmentsPerFloor: '2 (Type A + Type B)',
    typeA: '4BHK Front-Facing (Faces 18m road)',
    typeB: '4BHK Rear-Facing (Garden view)',
    floorHeight: '3.15 m (Typical) / 4.2m Stilt',
    totalHeight: '27.45 m (approx)',
    totalObjects: 189,
    format: 'GLTF / GLB',
    fileSize: '1.8 MB (Optimized)',
    generationDate: '28 Oct 2026',
    status: 'Ready',
    interactive: 'Available',
    drawingFile: 'SUBMISSION - 04.dxf',
    layersExtracted: 108,
    entitiesProcessed: 6229
  });

  return (
    <div className="project-info-panel">
      <div className="info-scroll-container">
        {/* Project Overview */}
        <div className="info-block">
          <h3 className="info-block-heading">Project Information</h3>

          <div className="info-row-item">
            <div className="info-icon">📄</div>
            <div className="info-meta">
              <span className="lbl">Project Name</span>
              <span className="val bold">{modelStats.projectName}</span>
            </div>
          </div>

          <div className="info-row-item">
            <div className="info-icon">📍</div>
            <div className="info-meta">
              <span className="lbl">Location</span>
              <span className="val">{modelStats.location}</span>
            </div>
          </div>

          <div className="info-row-item">
            <div className="info-icon">🏢</div>
            <div className="info-meta">
              <span className="lbl">Total Floors</span>
              <span className="val">{modelStats.totalFloors}</span>
            </div>
          </div>

          <div className="info-row-item">
            <div className="info-icon">🏠</div>
            <div className="info-meta">
              <span className="lbl">Apartments per Floor</span>
              <span className="val">{modelStats.apartmentsPerFloor}</span>
            </div>
          </div>

          <div className="info-row-item">
            <div className="info-icon">🔵</div>
            <div className="info-meta">
              <span className="lbl">Type A (Front)</span>
              <span className="val">{modelStats.typeA}</span>
            </div>
          </div>

          <div className="info-row-item">
            <div className="info-icon">🟠</div>
            <div className="info-meta">
              <span className="lbl">Type B (Rear)</span>
              <span className="val">{modelStats.typeB}</span>
            </div>
          </div>

          <div className="info-row-item">
            <div className="info-icon">📏</div>
            <div className="info-meta">
              <span className="lbl">Floor Height</span>
              <span className="val">{modelStats.floorHeight}</span>
            </div>
          </div>

          <div className="info-row-item">
            <div className="info-icon">📦</div>
            <div className="info-meta">
              <span className="lbl">Total 3D Objects</span>
              <span className="val bold">{modelStats.totalObjects}</span>
            </div>
          </div>
        </div>

        {/* Model Statistics */}
        <div className="info-block stats-section">
          <h4 className="info-sub-heading">Model Statistics</h4>

          <div className="stat-line">
            <span className="k">Format:</span>
            <span className="v">{modelStats.format}</span>
          </div>
          <div className="stat-line">
            <span className="k">File Size:</span>
            <span className="v">{modelStats.fileSize}</span>
          </div>
          <div className="stat-line">
            <span className="k">Generation Date:</span>
            <span className="v">{modelStats.generationDate}</span>
          </div>
          <div className="stat-line">
            <span className="k">Status:</span>
            <span className="v status-green">✓ {modelStats.status}</span>
          </div>
          <div className="stat-line">
            <span className="k">Interactive:</span>
            <span className="v status-green">✓ {modelStats.interactive}</span>
          </div>
        </div>

        {/* Verified Drawing Analysis */}
        <div className="info-block drawing-section">
          <h4 className="info-sub-heading">Drawing Analysis (Verified)</h4>
          <div className="stat-line">
            <span className="k">Source Drawing:</span>
            <span className="v font-mono">{modelStats.drawingFile}</span>
          </div>
          <div className="stat-line">
            <span className="k">AutoCAD Layers:</span>
            <span className="v">{modelStats.layersExtracted} layers</span>
          </div>
          <div className="stat-line">
            <span className="k">Entities Parsed:</span>
            <span className="v">{modelStats.entitiesProcessed} entities</span>
          </div>
          <div className="stat-line">
            <span className="k">Pipeline:</span>
            <span className="v">ezdxf → Procedural Three.js</span>
          </div>
        </div>
      </div>
    </div>
  );
}
