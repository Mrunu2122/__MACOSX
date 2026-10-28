import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModelViewer from './ModelViewer';
import ProjectInfo from './ProjectInfo';
import FloorPlans from './FloorPlans';
import ApartmentViewer from './ApartmentViewer';
import RenderedViews from './RenderedViews';
import './ViewerPage.css';

export default function ViewerPage() {
  const navigate = useNavigate();
  const [selectedFloor, setSelectedFloor] = useState(7);
  const [selectedApartmentType, setSelectedApartmentType] = useState('Type A');
  const [activeBottomTab, setActiveBottomTab] = useState('floor-plan');

  const handleNewProject = () => {
    navigate('/');
  };

  const handleDownloadModel = async () => {
    try {
      const res = await fetch('/test-project-geometry.json');
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vibgyor-residential-model.gltf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading 3D model asset: ' + err.message);
    }
  };

  const handleViewRenders = () => {
    setActiveBottomTab('renders');
  };

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
  };

  const handleViewIn3D = (floor) => {
    setSelectedFloor(floor);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="viewer-page">
      {/* Top Header Bar */}
      <header className="viewer-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="header-title">3D Building Viewer</h1>
            <p className="header-subtitle">Interactive 3D model generated from architectural drawings</p>
          </div>

          <div className="header-actions">
            <button
              className="btn btn-outline"
              onClick={handleDownloadModel}
              title="Download GLTF/GLB Asset"
            >
              📥 Download Model (GLB)
            </button>

            <button
              className="btn btn-primary"
              onClick={handleViewRenders}
            >
              🎨 View Renders →
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleNewProject}
              title="Upload New Project"
            >
              ➕ New Project
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Large 3D Viewport + Right Project Info */}
      <div className="viewer-content">
        <div className="viewer-main-section">
          <ModelViewer
            projectId="vibgyor-main"
            selectedFloor={selectedFloor}
            onFloorSelect={handleFloorSelect}
            selectedApartmentType={selectedApartmentType}
          />
        </div>

        <aside className="viewer-right-panel">
          <ProjectInfo projectId="vibgyor-main" />
        </aside>
      </div>

      {/* Lower Content Area: Floor Plan & Details | Apartment Unit Views (Bonus) | Rendered Views */}
      <div className="viewer-bottom-section">
        <div className="bottom-tabs">
          <button
            className={`tab-button ${activeBottomTab === 'floor-plan' ? 'active' : ''}`}
            onClick={() => setActiveBottomTab('floor-plan')}
          >
            📐 Floor Plan & Details
          </button>
          <button
            className={`tab-button ${activeBottomTab === 'apartment' ? 'active' : ''}`}
            onClick={() => setActiveBottomTab('apartment')}
          >
            🏠 Apartment Unit Views (Bonus)
          </button>
          <button
            className={`tab-button ${activeBottomTab === 'renders' ? 'active' : ''}`}
            onClick={() => setActiveBottomTab('renders')}
          >
            🎬 Rendered Views
          </button>
        </div>

        <div className="bottom-content">
          {activeBottomTab === 'floor-plan' && (
            <FloorPlans
              selectedFloor={selectedFloor}
              onFloorSelect={handleFloorSelect}
              onViewIn3D={handleViewIn3D}
            />
          )}

          {activeBottomTab === 'apartment' && (
            <ApartmentViewer
              selectedApartmentType={selectedApartmentType}
              onApartmentTypeSelect={setSelectedApartmentType}
              selectedFloor={selectedFloor}
            />
          )}

          {activeBottomTab === 'renders' && (
            <RenderedViews />
          )}
        </div>
      </div>
    </div>
  );
}
