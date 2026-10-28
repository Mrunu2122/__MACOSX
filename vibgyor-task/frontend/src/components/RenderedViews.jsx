import React, { useState } from 'react';
import './RenderedViews.css';

export default function RenderedViews() {
  const [selectedRender, setSelectedRender] = useState(null);

  const rendersList = [
    {
      id: 1,
      title: '1. Street View (Day)',
      subtitle: 'Front elevation view from the 18m main road',
      imgSrc: '/renders/01_street_day.png',
      aspectRatio: '16:9 Landscape',
      timeOfDay: 'Daylight (Sun 55°)',
      description: 'Captures the front south elevation of VIBGYOR Residential with active street context, boundary fencing, tree line, and prominent multi-level balconies.'
    },
    {
      id: 2,
      title: '2. Front Corner View (Dusk)',
      subtitle: 'Three-quarter architectural perspective at golden hour',
      imgSrc: '/renders/02_dusk_corner.png',
      aspectRatio: '16:9 Landscape',
      timeOfDay: 'Dusk (Golden Hour Glow)',
      description: 'Highlights building volume, textured exterior walls, glass transparency, and the vertical architectural rhythms of residential balconies and concrete floor slabs.'
    },
    {
      id: 3,
      title: '3. Aerial View',
      subtitle: "Bird's eye perspective showing site context & rooftop",
      imgSrc: '/renders/03_aerial_45deg.png',
      aspectRatio: '16:9 Landscape',
      timeOfDay: 'High Sun Perspective',
      description: 'Panoramic elevated angle depicting the terrace level, parapet walls, overall 60m × 40m building footprint, surrounding green buffer, and vehicle roadway.'
    },
    {
      id: 4,
      title: '4. Entrance View',
      subtitle: 'Ground level approach & stilt parking perspective',
      imgSrc: '/renders/04_entrance_closeup.png',
      aspectRatio: '16:9 Landscape',
      timeOfDay: 'Morning Entry Sun',
      description: 'Pedestrian approach perspective revealing the open 4.2m stilt parking level, structural column grid, security entrance gates, and landscape planters.'
    }
  ];

  return (
    <div className="rendered-views-panel">
      <div className="renders-header">
        <div className="renders-title-group">
          <h3 className="panel-title">Architectural Rendered Views</h3>
          <p className="panel-subtitle">4 high-resolution architectural captures generated directly from the 3D building geometry</p>
        </div>
      </div>

      <div className="renders-grid-container">
        {rendersList.map((item) => (
          <div
            key={item.id}
            className="render-card-item"
            onClick={() => setSelectedRender(item)}
          >
            <div className="render-image-wrapper">
              <img
                src={item.imgSrc}
                alt={item.title}
                className="render-actual-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.classList.add('img-fallback');
                }}
              />
              <div className="render-overlay-badge">{item.timeOfDay}</div>
            </div>

            <div className="render-info-block">
              <div className="render-card-title">{item.title}</div>
              <div className="render-card-sub">{item.subtitle}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {selectedRender && (
        <div className="render-modal-backdrop" onClick={() => setSelectedRender(null)}>
          <div className="render-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <h4>{selectedRender.title}</h4>
                <p>{selectedRender.subtitle}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedRender(null)}>
                ✕ Close
              </button>
            </div>

            <div className="modal-image-wrapper">
              <img src={selectedRender.imgSrc} alt={selectedRender.title} className="modal-full-img" />
            </div>

            <div className="modal-footer-caption">
              <p>{selectedRender.description}</p>
              <div className="modal-meta">
                <span>Resolution: <strong>2560 × 1440 HD</strong></span>
                <span>•</span>
                <span>Lighting: <strong>{selectedRender.timeOfDay}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
