import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './ApartmentViewer.css';

export default function ApartmentViewer({ selectedApartmentType = 'Type A', onApartmentTypeSelect, selectedFloor = 7 }) {
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('3d-view');
  const [aptType, setAptType] = useState(selectedApartmentType);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const aptGroupRef = useRef(null);

  useEffect(() => {
    if (selectedApartmentType) setAptType(selectedApartmentType);
  }, [selectedApartmentType]);

  const handleSelectType = (type) => {
    setAptType(type);
    if (onApartmentTypeSelect) onApartmentTypeSelect(type);
  };

  const apartmentData = {
    'Type A': {
      name: 'Type A - Front Facing (4BHK)',
      tagline: 'Premium Road-Facing Residence with Grand Balcony',
      facing: 'South Facing (18m Main Road)',
      carpetArea: '142.5 sq.m (~1,534 sq.ft)',
      builtUpArea: '168.0 sq.m (~1,808 sq.ft)',
      rooms: [
        { name: 'Living & Dining Room', size: '7.8m × 4.8m', desc: 'Spacious central hall opening to front balcony', icon: '🛋️' },
        { name: 'Master Bedroom', size: '4.8m × 4.2m', desc: 'Private ensuite bathroom & dresser space', icon: '🛏️' },
        { name: 'Bedroom 2', size: '4.0m × 3.8m', desc: 'East garden window & attached bath', icon: '🛏️' },
        { name: 'Bedroom 3', size: '3.8m × 3.5m', desc: 'Corner room with dual cross ventilation', icon: '🛏️' },
        { name: 'Bedroom 4 / Study', size: '3.6m × 3.2m', desc: 'Flexible bedroom or home office', icon: '🖥️' },
        { name: 'Modular Kitchen & Utility', size: '4.2m × 3.0m', desc: 'L-shaped granite counter & wash yard', icon: '🍳' },
        { name: 'Bathrooms (4 Ensuite)', size: '2.4m × 1.8m each', desc: 'Premium ceramic fittings & shower zones', icon: '🚿' },
        { name: 'Front Viewing Balcony', size: '6.5m × 2.4m', desc: 'Deep covered outdoor deck overlooking 18m road', icon: '🌳' }
      ]
    },
    'Type B': {
      name: 'Type B - Rear Facing (4BHK)',
      tagline: 'Serene Courtyard-Facing Residence with Private Terrace',
      facing: 'North Facing (Quiet Internal Greens)',
      carpetArea: '139.8 sq.m (~1,505 sq.ft)',
      builtUpArea: '165.2 sq.m (~1,778 sq.ft)',
      rooms: [
        { name: 'Living & Lounge Hall', size: '7.5m × 4.8m', desc: 'Expansive family zone with garden vistas', icon: '🛋️' },
        { name: 'Master Suite', size: '4.8m × 4.2m', desc: 'Large bedroom with walk-in wardrobe', icon: '🛏️' },
        { name: 'Bedroom 2', size: '4.0m × 3.8m', desc: 'Attached bathroom and built-in alcove', icon: '🛏️' },
        { name: 'Bedroom 3', size: '3.8m × 3.5m', desc: 'Tranquil garden view and wardrobe niche', icon: '🛏️' },
        { name: 'Bedroom 4', size: '3.6m × 3.2m', desc: 'Guest bedroom or children study', icon: '🛏️' },
        { name: 'Kitchen & Breakfast Niche', size: '4.0m × 3.0m', desc: 'Modern parallel layout & dry utility', icon: '🍳' },
        { name: 'Bathrooms (4 Bath)', size: '2.4m × 1.8m each', desc: 'Vitrified anti-skid tile work', icon: '🚿' },
        { name: 'Rear Garden Balcony', size: '6.2m × 2.4m', desc: 'Peaceful breakfast sit-out', icon: '🌿' }
      ]
    }
  };

  const apt = apartmentData[aptType] || apartmentData['Type A'];

  // Initialize Cutaway 3D Dollhouse Apartment Scene
  useEffect(() => {
    if (activeTab !== '3d-view') return;
    const container = containerRef.current;
    if (!container) return;

    let animId;
    let isDisposed = false;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 500);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const aptSun = new THREE.DirectionalLight(0xfffaed, 1.2);
    aptSun.position.set(25, 40, 20);
    aptSun.castShadow = true;
    aptSun.shadow.mapSize.width = 1024;
    aptSun.shadow.mapSize.height = 1024;
    scene.add(aptSun);

    const fillLight = new THREE.DirectionalLight(0x99bbff, 0.4);
    fillLight.position.set(-20, 20, -20);
    scene.add(fillLight);

    // Group for Apartment Cutaway
    const aptGroup = new THREE.Group();
    aptGroupRef.current = aptGroup;
    scene.add(aptGroup);

    // Build Cutaway 3D Model
    buildCutawayApartment(aptGroup, aptType);

    // Framing: Dollhouse isometric cutaway view
    const target = new THREE.Vector3(12, 1.2, 10);
    camera.position.set(12 + 24, 26, 10 + 28);
    camera.lookAt(target);

    // Orbit Controls
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      const offset = camera.position.clone().sub(target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -dx * 0.008);
      const right = new THREE.Vector3().crossVectors(offset, camera.up).normalize();
      offset.applyAxisAngle(right, -dy * 0.008);

      camera.position.copy(target).add(offset);
      camera.lookAt(target);
    };

    const onMouseUp = () => { isDragging = false; };

    const onWheel = (e) => {
      e.preventDefault();
      const zoom = e.deltaY > 0 ? 1.08 : 0.92;
      const offset = camera.position.clone().sub(target);
      const newLen = offset.length() * zoom;
      if (newLen > 10 && newLen < 120) {
        offset.setLength(newLen);
        camera.position.copy(target).add(offset);
        camera.lookAt(target);
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Render loop
    const animate = () => {
      if (isDisposed) return;
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [activeTab, aptType]);

  const resetApartmentCamera = () => {
    if (!cameraRef.current) return;
    const target = new THREE.Vector3(12, 1.2, 10);
    cameraRef.current.position.set(12 + 24, 26, 10 + 28);
    cameraRef.current.lookAt(target);
  };

  return (
    <div className="apartment-viewer-panel">
      <div className="apartment-header">
        <div className="header-titles">
          <h3 className="panel-title">Apartment Unit Views (Bonus)</h3>
          <p className="panel-subtitle">Explore 3D dollhouse cutaways & architectural floor plans for 4BHK units</p>
        </div>

        <div className="apartment-controls-row">
          <div className="apt-type-pills">
            <button
              className={`pill-btn type-a ${aptType === 'Type A' ? 'active' : ''}`}
              onClick={() => handleSelectType('Type A')}
            >
              Type A (Front 4BHK)
            </button>
            <button
              className={`pill-btn type-b ${aptType === 'Type B' ? 'active' : ''}`}
              onClick={() => handleSelectType('Type B')}
            >
              Type B (Rear 4BHK)
            </button>
          </div>

          <div className="view-mode-tabs">
            <button
              className={`mode-btn ${activeTab === '3d-view' ? 'active' : ''}`}
              onClick={() => setActiveTab('3d-view')}
            >
              🏢 3D View
            </button>
            <button
              className={`mode-btn ${activeTab === 'floor-plan' ? 'active' : ''}`}
              onClick={() => setActiveTab('floor-plan')}
            >
              📐 Floor Plan
            </button>
            <button
              className={`mode-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              📋 Details
            </button>
          </div>
        </div>
      </div>

      <div className="apartment-body">
        {activeTab === '3d-view' && (
          <div className="apt-3d-container">
            <div className="apt-canvas-wrapper" ref={containerRef} />
            <div className="apt-3d-overlay">
              <div className="apt-chip-title">{apt.name} — Interactive 3D Cutaway</div>
              <button className="apt-reset-btn" onClick={resetApartmentCamera}>
                🔄 Reset View
              </button>
            </div>
            <div className="apt-3d-hint">
              Left drag to rotate • Scroll to zoom • Roof omitted for interior visibility
            </div>
          </div>
        )}

        {activeTab === 'floor-plan' && (
          <div className="apt-plan-container">
            <div className="plan-svg-card">
              <div className="plan-card-header">
                <h4>{apt.name} — Top-Down Floor Plan</h4>
                <span className="plan-area-badge">{apt.carpetArea}</span>
              </div>
              <div className="svg-frame">
                <ApartmentFloorPlanSVG aptType={aptType} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="apt-details-container">
            <div className="details-hero">
              <div className="hero-text">
                <h4>{apt.name}</h4>
                <p>{apt.tagline}</p>
                <span className="facing-badge">🧭 {apt.facing}</span>
              </div>
              <div className="hero-metrics">
                <div className="metric-box">
                  <span className="lbl">Carpet Area</span>
                  <span className="val">{apt.carpetArea}</span>
                </div>
                <div className="metric-box">
                  <span className="lbl">Built-Up Area</span>
                  <span className="val">{apt.builtUpArea}</span>
                </div>
              </div>
            </div>

            <div className="room-schedule-section">
              <h5 className="schedule-title">ROOM SPECIFICATIONS & ARCHITECTURAL DIMENSIONS</h5>
              <div className="rooms-grid-layout">
                {apt.rooms.map((rm, idx) => (
                  <div key={idx} className="room-card-spec">
                    <div className="rm-icon">{rm.icon}</div>
                    <div className="rm-info">
                      <div className="rm-name">{rm.name}</div>
                      <div className="rm-size">{rm.size}</div>
                      <div className="rm-desc">{rm.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Procedural 3D Dollhouse Model Generator
function buildCutawayApartment(group, type) {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xeeece8, roughness: 0.8 });
  const floorWoodMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.5 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.3 });
  const darkFurnitureMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.6 });
  const bedLinenMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.8 });
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, transparent: true, opacity: 0.5 });

  const wallH = 1.6; // Waist-high cutaway walls for dollhouse view
  const wallThick = 0.25;

  // 1. Flooring Base
  const baseGeo = new THREE.BoxGeometry(24, 0.2, 20);
  const baseMesh = new THREE.Mesh(baseGeo, floorWoodMat);
  baseMesh.position.set(12, 0, 10);
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Balcony Floor
  const balcGeo = new THREE.BoxGeometry(10, 0.2, 3);
  const balcMesh = new THREE.Mesh(balcGeo, tileMat);
  balcMesh.position.set(12, 0, type === 'Type A' ? -1.5 : 21.5);
  balcMesh.receiveShadow = true;
  group.add(balcMesh);

  // Balcony Glass Railing
  const railGeo = new THREE.BoxGeometry(10, 1.0, 0.08);
  const railMesh = new THREE.Mesh(railGeo, glassMat);
  railMesh.position.set(12, 0.6, type === 'Type A' ? -3 : 23);
  group.add(railMesh);

  // Helper to add cutaway wall
  const addWall = (x, z, w, d) => {
    const geo = new THREE.BoxGeometry(w, wallH, d);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(x, wallH / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  // Helper for simple furniture box
  const addBox = (x, y, z, w, h, d, mat) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Outer Walls (Cutaway at wallH)
  addWall(12, 0.1, 24, wallThick); // Front
  addWall(12, 19.9, 24, wallThick); // Rear
  addWall(0.1, 10, wallThick, 20); // Left
  addWall(23.9, 10, wallThick, 20); // Right

  // Internal Partitions for 4 BHK + Living + Kitchen + Baths
  addWall(7, 10, wallThick, 20); // Corridor divider 1
  addWall(17, 10, wallThick, 20); // Corridor divider 2
  addWall(3.5, 6.5, 7, wallThick); // Master Bed wall
  addWall(3.5, 13.5, 7, wallThick); // Bed 2 wall
  addWall(20.5, 6.5, 7, wallThick); // Bed 3 wall
  addWall(20.5, 13.5, 7, wallThick); // Bed 4 wall
  addWall(12, 14, 10, wallThick); // Kitchen separation

  // Furniture: Master Bed
  addBox(3.5, 0.1, 3.5, 2.4, 0.5, 2.6, darkFurnitureMat); // bed frame
  addBox(3.5, 0.6, 3.5, 2.2, 0.3, 2.4, bedLinenMat); // mattress

  // Bed 2
  addBox(3.5, 0.1, 16.5, 2.2, 0.5, 2.4, darkFurnitureMat);
  addBox(3.5, 0.6, 16.5, 2.0, 0.3, 2.2, bedLinenMat);

  // Bed 3
  addBox(20.5, 0.1, 3.5, 2.2, 0.5, 2.4, darkFurnitureMat);
  addBox(20.5, 0.6, 3.5, 2.0, 0.3, 2.2, bedLinenMat);

  // Bed 4
  addBox(20.5, 0.1, 16.5, 2.0, 0.5, 2.2, darkFurnitureMat);
  addBox(20.5, 0.6, 16.5, 1.8, 0.3, 2.0, bedLinenMat);

  // Living Room: Sofa Set & Coffee Table
  addBox(12, 0.1, 6, 4.0, 0.6, 1.4, sofaMat); // Sofa
  addBox(12, 0.1, 8.5, 2.2, 0.4, 1.2, darkFurnitureMat); // Coffee table
  addBox(9.5, 0.1, 7.5, 1.2, 0.5, 1.2, sofaMat); // Armchair

  // Dining Table + Chairs
  addBox(12, 0.1, 11.5, 2.8, 0.75, 1.6, darkFurnitureMat); // Table

  // Kitchen Counters
  addBox(12, 0.1, 18, 5.0, 0.85, 1.2, darkFurnitureMat); // Counter
}

// 2D Floor Plan SVG Renderer
function ApartmentFloorPlanSVG({ aptType }) {
  const isTypeA = aptType === 'Type A';

  return (
    <svg viewBox="0 0 800 550" className="floor-plan-svg-graphic" style={{ width: '100%', height: 'auto', display: 'block' }}>
      <rect x="10" y="10" width="780" height="530" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" rx="8" />

      {/* Main Apartment Perimeter */}
      <rect x="50" y="50" width="700" height="420" fill="#ffffff" stroke="#1e293b" strokeWidth="4" />

      {/* Front Balcony */}
      <rect
        x="240"
        y={isTypeA ? "15" : "470"}
        width="320"
        height="35"
        fill="#e0f2fe"
        stroke="#0284c7"
        strokeWidth="2"
        strokeDasharray="6 3"
      />
      <text x="400" y={isTypeA ? "37" : "492"} fill="#0369a1" fontSize="13" fontWeight="bold" textAnchor="middle">
        {isTypeA ? "FRONT BALCONY (OVERLOOKING 18m ROAD)" : "REAR COURTYARD BALCONY"}
      </text>

      {/* Master Bedroom */}
      <rect x="50" y="50" width="220" height="190" fill="#f1f5f9" stroke="#334155" strokeWidth="2" />
      <text x="160" y="130" fill="#0f172a" fontSize="15" fontWeight="bold" textAnchor="middle">MASTER BEDROOM</text>
      <text x="160" y="155" fill="#64748b" fontSize="13" textAnchor="middle">4.8m × 4.2m</text>

      {/* Master Bath */}
      <rect x="50" y="190" width="90" height="80" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
      <text x="95" y="235" fill="#334155" fontSize="11" fontWeight="bold" textAnchor="middle">TOILET</text>

      {/* Bedroom 2 */}
      <rect x="50" y="270" width="220" height="200" fill="#f1f5f9" stroke="#334155" strokeWidth="2" />
      <text x="160" y="360" fill="#0f172a" fontSize="15" fontWeight="bold" textAnchor="middle">BEDROOM 2</text>
      <text x="160" y="385" fill="#64748b" fontSize="13" textAnchor="middle">4.0m × 3.8m</text>

      {/* Living & Dining Central Hall */}
      <rect x="270" y="50" width="260" height="280" fill="#ffffff" stroke="#334155" strokeWidth="2" />
      <text x="400" y="160" fill="#1e3a8a" fontSize="18" fontWeight="bold" textAnchor="middle">LIVING & DINING</text>
      <text x="400" y="190" fill="#3b82f6" fontSize="14" fontWeight="600" textAnchor="middle">7.8m × 4.8m</text>

      {/* Kitchen & Utility */}
      <rect x="270" y="330" width="260" height="140" fill="#fffbeb" stroke="#f59e0b" strokeWidth="2" />
      <text x="400" y="395" fill="#b45309" fontSize="15" fontWeight="bold" textAnchor="middle">MODULAR KITCHEN & STORE</text>
      <text x="400" y="420" fill="#78350f" fontSize="13" textAnchor="middle">4.2m × 3.0m</text>

      {/* Bedroom 3 */}
      <rect x="530" y="50" width="220" height="190" fill="#f1f5f9" stroke="#334155" strokeWidth="2" />
      <text x="640" y="130" fill="#0f172a" fontSize="15" fontWeight="bold" textAnchor="middle">BEDROOM 3</text>
      <text x="640" y="155" fill="#64748b" fontSize="13" textAnchor="middle">3.8m × 3.5m</text>

      {/* Bedroom 4 / Study */}
      <rect x="530" y="240" width="220" height="230" fill="#f1f5f9" stroke="#334155" strokeWidth="2" />
      <text x="640" y="340" fill="#0f172a" fontSize="15" fontWeight="bold" textAnchor="middle">BEDROOM 4 / STUDY</text>
      <text x="640" y="365" fill="#64748b" fontSize="13" textAnchor="middle">3.6m × 3.2m</text>

      {/* Main Entrance Foyer Arrow */}
      <path d="M 400 500 L 400 470" stroke="#2563eb" strokeWidth="4" markerEnd="url(#arrow)" />
      <text x="400" y="520" fill="#2563eb" fontSize="13" fontWeight="bold" textAnchor="middle">MAIN ENTRANCE FOYER</text>
    </svg>
  );
}
