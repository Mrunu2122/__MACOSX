import React, { useState } from 'react';
import './FloorPlans.css';

export default function FloorPlans({ selectedFloor = 7, onFloorSelect, onViewIn3D }) {
  const [activeFloor, setActiveFloor] = useState(selectedFloor);

  const handleFloorClick = (f) => {
    setActiveFloor(f);
    if (onFloorSelect) onFloorSelect(f);
  };

  const floorMeta = {
    8: { name: 'Rooftop / Terrace', level: 'Terrace', height: '1.2m Parapet', units: 0, desc: 'Open landscaped terrace, solar PV installation, elevator machine room & overhead water storage.' },
    7: { name: 'Floor 7', level: 'F7', height: '3.15m', units: 2, desc: 'Top residential floor with panoramic views and direct terrace staircase access.' },
    6: { name: 'Floor 6', level: 'F6', height: '3.15m', units: 2, desc: 'Standard residential floor comprising 2 spacious 4BHK apartments (Type A & Type B).' },
    5: { name: 'Floor 5', level: 'F5', height: '3.15m', units: 2, desc: 'Standard residential floor comprising 2 spacious 4BHK apartments (Type A & Type B).' },
    4: { name: 'Floor 4', level: 'F4', height: '3.15m', units: 2, desc: 'Standard residential floor with emergency fire evacuation access.' },
    3: { name: 'Floor 3', level: 'F3', height: '3.15m', units: 2, desc: 'Standard residential floor comprising 2 spacious 4BHK apartments (Type A & Type B).' },
    2: { name: 'Floor 2', level: 'F2', height: '3.15m', units: 2, desc: 'Standard residential floor comprising 2 spacious 4BHK apartments (Type A & Type B).' },
    1: { name: 'Floor 1', level: 'F1', height: '3.15m', units: 2, desc: 'First residential floor elevated above stilt parking with grand main pedestrian entrance.' },
    0: { name: 'Stilt Parking Level', level: 'Stilt', height: '4.2m', units: 0, desc: 'Ground-level covered parking bays, security cabin, double elevator lobby & utility cores.' }
  };

  const getFloorNumber = (f) => {
    if (typeof f === 'string') {
      if (f.toLowerCase().includes('stilt')) return 0;
      if (f.toLowerCase().includes('roof')) return 8;
      return parseInt(f.replace(/\D/g, ''), 10) || 7;
    }
    return f ?? 7;
  };

  const currentNum = getFloorNumber(activeFloor);
  const cur = floorMeta[currentNum] || floorMeta[7];

  return (
    <div className="floor-plans-panel">
      <div className="plans-content-grid">
        {/* Left Column: Floor List */}
        <div className="floor-list-column">
          <div className="column-title">FLOORS</div>
          <div className="floor-nav-buttons">
            <button
              className={`floor-nav-btn ${currentNum === 8 ? 'active' : ''}`}
              onClick={() => handleFloorClick(8)}
            >
              Rooftop
            </button>
            {[7, 6, 5, 4, 3, 2, 1].map((f) => (
              <button
                key={f}
                className={`floor-nav-btn ${currentNum === f ? 'active' : ''}`}
                onClick={() => handleFloorClick(f)}
              >
                F{f}
              </button>
            ))}
            <button
              className={`floor-nav-btn stilt ${currentNum === 0 ? 'active' : ''}`}
              onClick={() => handleFloorClick(0)}
            >
              Stilt
            </button>
          </div>
        </div>

        {/* Center Column: 2D Architectural Floor Plan Graphic */}
        <div className="floor-graphic-column">
          <div className="graphic-header-pills">
            <span className="pill front-pill">Type A (Front - 4BHK)</span>
            <span className="pill rear-pill">Type B (Rear - 4BHK)</span>
          </div>

          <div className="graphic-canvas-box">
            <FloorPlanSVG floorNum={currentNum} />
          </div>
        </div>

        {/* Right Column: Floor Details Card */}
        <div className="floor-details-column">
          <div className="details-card-box">
            <h4 className="details-card-title">{cur.name} Details</h4>

            <div className="details-table">
              <div className="table-row">
                <span className="row-label">Floor Number</span>
                <span className="row-val">{currentNum === 8 ? 'Terrace' : currentNum === 0 ? 'Stilt' : currentNum}</span>
              </div>
              <div className="table-row">
                <span className="row-label">Apartment Type A</span>
                <span className="row-val">{currentNum > 0 && currentNum < 8 ? '4BHK (Front)' : 'None'}</span>
              </div>
              <div className="table-row">
                <span className="row-label">Apartment Type B</span>
                <span className="row-val">{currentNum > 0 && currentNum < 8 ? '4BHK (Rear)' : 'None'}</span>
              </div>
              <div className="table-row">
                <span className="row-label">Total Apartments</span>
                <span className="row-val">{cur.units}</span>
              </div>
              <div className="table-row">
                <span className="row-label">Floor Height</span>
                <span className="row-val">{cur.height}</span>
              </div>
            </div>

            <p className="floor-summary-desc">{cur.desc}</p>

            <button
              className="view-in-3d-btn"
              onClick={() => {
                if (onViewIn3D) onViewIn3D(currentNum);
              }}
            >
              👁️ View in 3D
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2D Dual-Unit Floor Plan SVG Graphic
function FloorPlanSVG({ floorNum }) {
  const isStilt = floorNum === 0;
  const isRoof = floorNum === 8;

  if (isStilt) {
    return (
      <svg viewBox="0 0 600 340" className="floor-svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <rect x="10" y="10" width="580" height="320" fill="#f8fafc" stroke="#64748b" strokeWidth="2" rx="6" />
        <rect x="230" y="80" width="140" height="180" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
        <text x="300" y="150" fill="#0f172a" fontSize="13" fontWeight="bold" textAnchor="middle">CENTRAL CORE</text>
        <text x="300" y="175" fill="#475569" fontSize="11" textAnchor="middle">2 × High-Speed Lifts</text>
        <text x="300" y="195" fill="#475569" fontSize="11" textAnchor="middle">Emergency Fire Staircase</text>

        {/* Parking bays */}
        {[-140, 140].map((dx, i) => (
          <g key={i}>
            <rect x={300 + dx - 100} y="40" width="200" height="260" fill="#f1f5f9" stroke="#cbd5e1" strokeDasharray="4 4" />
            <text x={300 + dx} y="160" fill="#64748b" fontSize="13" fontWeight="bold" textAnchor="middle">
              COVERED PARKING BAYS
            </text>
            <text x={300 + dx} y="185" fill="#94a3b8" fontSize="11" textAnchor="middle">
              14 Resident Bays + Visitor Bays
            </text>
          </g>
        ))}
      </svg>
    );
  }

  if (isRoof) {
    return (
      <svg viewBox="0 0 600 340" className="floor-svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <rect x="10" y="10" width="580" height="320" fill="#f1f5f9" stroke="#475569" strokeWidth="3" rx="6" />
        <rect x="20" y="20" width="560" height="300" fill="#e2e8f0" stroke="#94a3b8" strokeDasharray="6 3" />
        <rect x="240" y="100" width="120" height="140" fill="#cbd5e1" stroke="#334155" strokeWidth="2" />
        <text x="300" y="160" fill="#0f172a" fontSize="13" fontWeight="bold" textAnchor="middle">LIFT MACHINE ROOM</text>
        <text x="300" y="180" fill="#475569" fontSize="11" textAnchor="middle">& Overhead Tanks</text>
        <text x="300" y="70" fill="#0284c7" fontSize="14" fontWeight="bold" textAnchor="middle">OPEN LANDSCAPED TERRACE DECK</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 600 340" className="floor-svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
      <rect x="10" y="10" width="580" height="320" fill="#ffffff" stroke="#1e293b" strokeWidth="3" rx="6" />

      {/* Type A (Left/Front Half) */}
      <rect x="20" y="20" width="240" height="300" fill="#f8fafc" stroke="#3b82f6" strokeWidth="1.5" />
      <text x="140" y="50" fill="#1d4ed8" fontSize="13" fontWeight="bold" textAnchor="middle">TYPE A (FRONT 4BHK)</text>
      <rect x="30" y="70" width="100" height="90" fill="#eff6ff" stroke="#93c5fd" />
      <text x="80" y="120" fill="#1e3a8a" fontSize="10" fontWeight="bold" textAnchor="middle">MASTER BED</text>
      <rect x="140" y="70" width="110" height="130" fill="#ffffff" stroke="#93c5fd" />
      <text x="195" y="140" fill="#1e3a8a" fontSize="10" fontWeight="bold" textAnchor="middle">LIVING & DINING</text>
      <rect x="30" y="170" width="100" height="80" fill="#eff6ff" stroke="#93c5fd" />
      <text x="80" y="215" fill="#1e3a8a" fontSize="10" fontWeight="bold" textAnchor="middle">BEDROOM 2</text>
      <rect x="30" y="260" width="220" height="50" fill="#dbeafe" stroke="#3b82f6" strokeDasharray="4 2" />
      <text x="140" y="290" fill="#1d4ed8" fontSize="10" fontWeight="bold" textAnchor="middle">FRONT ROAD BALCONY</text>

      {/* Central Stair & Elevator Core */}
      <rect x="260" y="40" width="80" height="260" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2" />
      <rect x="270" y="60" width="60" height="60" fill="#cbd5e1" stroke="#475569" />
      <text x="300" y="95" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">LIFT 1</text>
      <rect x="270" y="130" width="60" height="60" fill="#cbd5e1" stroke="#475569" />
      <text x="300" y="165" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">LIFT 2</text>
      <rect x="270" y="200" width="60" height="80" fill="#94a3b8" stroke="#334155" />
      <text x="300" y="245" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">STAIRS</text>

      {/* Type B (Right/Rear Half) */}
      <rect x="340" y="20" width="240" height="300" fill="#f8fafc" stroke="#ea580c" strokeWidth="1.5" />
      <text x="460" y="50" fill="#c2410c" fontSize="13" fontWeight="bold" textAnchor="middle">TYPE B (REAR 4BHK)</text>
      <rect x="350" y="70" width="110" height="130" fill="#ffffff" stroke="#fed7aa" />
      <text x="405" y="140" fill="#7c2d12" fontSize="10" fontWeight="bold" textAnchor="middle">LIVING & DINING</text>
      <rect x="470" y="70" width="100" height="90" fill="#fff7ed" stroke="#fed7aa" />
      <text x="520" y="120" fill="#7c2d12" fontSize="10" fontWeight="bold" textAnchor="middle">MASTER BED</text>
      <rect x="470" y="170" width="100" height="80" fill="#fff7ed" stroke="#fed7aa" />
      <text x="520" y="215" fill="#7c2d12" fontSize="10" fontWeight="bold" textAnchor="middle">BEDROOM 2</text>
      <rect x="350" y="260" width="220" height="50" fill="#ffedd5" stroke="#ea580c" strokeDasharray="4 2" />
      <text x="460" y="290" fill="#c2410c" fontSize="10" fontWeight="bold" textAnchor="middle">REAR GARDEN BALCONY</text>
    </svg>
  );
}
