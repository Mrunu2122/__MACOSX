import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './ModelViewer.css';

export default function ModelViewer({ projectId, selectedFloor = 7, onFloorSelect, selectedApartmentType = 'Type A' }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentFloor, setCurrentFloor] = useState(selectedFloor);
  const [currentApt, setCurrentApt] = useState(selectedApartmentType);
  const [showSurroundings, setShowSurroundings] = useState(true);
  const [showFloorLabels, setShowFloorLabels] = useState(true);
  const [showApartmentUnits, setShowApartmentUnits] = useState(true);
  const [wireframeView, setWireframeView] = useState(false);
  const [explodedView, setExplodedView] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurementDist, setMeasurementDist] = useState(null);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const floorGroupsRef = useRef({});
  const allMeshesRef = useRef([]);
  const surroundingsGroupRef = useRef(null);
  const measurePointsRef = useRef([]);
  const measureLineRef = useRef(null);
  const initialCamRef = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });

  useEffect(() => {
    if (selectedFloor !== undefined) setCurrentFloor(selectedFloor);
  }, [selectedFloor]);

  useEffect(() => {
    if (selectedApartmentType) setCurrentApt(selectedApartmentType);
  }, [selectedApartmentType]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationId;
    let isDisposed = false;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 580;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdbeafe); // Lighter sky blue ambient
    scene.fog = new THREE.FogExp2(0xdbeafe, 0.002);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1500);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x556677, 0.5);
    hemiLight.position.set(0, 100, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.3);
    sunLight.position.set(80, 120, 60);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    const shadowSize = 80;
    sunLight.shadow.camera.left = -shadowSize;
    sunLight.shadow.camera.right = shadowSize;
    sunLight.shadow.camera.top = shadowSize;
    sunLight.shadow.camera.bottom = -shadowSize;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.4);
    fillLight.position.set(-60, 40, -50);
    scene.add(fillLight);

    // 5. Ground and Surroundings
    const surroundingsGroup = new THREE.Group();
    surroundingsGroupRef.current = surroundingsGroup;
    scene.add(surroundingsGroup);

    // Road (front)
    const roadGeo = new THREE.PlaneGeometry(240, 26);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x33373b, roughness: 0.8 });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(30, -0.02, -18);
    roadMesh.receiveShadow = true;
    surroundingsGroup.add(roadMesh);

    // Road markings
    for (let rx = -80; rx < 140; rx += 8) {
      const stripeGeo = new THREE.PlaneGeometry(4, 0.35);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(rx, 0.03, -18);
      surroundingsGroup.add(stripe);
    }

    // Sidewalk
    const walkGeo = new THREE.PlaneGeometry(240, 8);
    const walkMat = new THREE.MeshStandardMaterial({ color: 0xccd1d9, roughness: 0.9 });
    const walkMesh = new THREE.Mesh(walkGeo, walkMat);
    walkMesh.rotation.x = -Math.PI / 2;
    walkMesh.position.set(30, -0.01, -2);
    walkMesh.receiveShadow = true;
    surroundingsGroup.add(walkMesh);

    // Green lawn
    const lawnGeo = new THREE.PlaneGeometry(240, 160);
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x76a052, roughness: 0.9 });
    const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
    lawnMesh.rotation.x = -Math.PI / 2;
    lawnMesh.position.set(30, -0.03, 40);
    lawnMesh.receiveShadow = true;
    surroundingsGroup.add(lawnMesh);

    // Trees
    const treeTrunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.9 });
    const foliageGeo = new THREE.DodecahedronGeometry(2.0, 1);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x477a33, roughness: 0.8 });

    const treePositions = [
      [-10, 0, -4], [-2, 0, -4], [62, 0, -4], [70, 0, -4],
      [-8, 0, 15], [-8, 0, 30], [-8, 0, 45],
      [68, 0, 15], [68, 0, 30], [68, 0, 45],
      [10, 0, 52], [25, 0, 52], [40, 0, 52], [55, 0, 52]
    ];
    treePositions.forEach(([tx, ty, tz]) => {
      const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
      trunk.position.set(tx, ty + 1.25, tz);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      surroundingsGroup.add(trunk);

      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.set(tx, ty + 3.2, tz);
      foliage.scale.set(1.1, 1.25, 1.1);
      foliage.castShadow = true;
      surroundingsGroup.add(foliage);
    });

    // 6. Materials Palette
    const baseMaterials = {
      // Warm contemporary architectural palette with contrasting trim, rich bronze, teak accents & azure glazing
      concrete: new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.5, metalness: 0.2 }), // Sleek charcoal architectural slab bands
      exterior_wall: new THREE.MeshStandardMaterial({ color: 0xf7ede2, roughness: 0.6, metalness: 0.05 }), // Warm cream/ivory stucco
      glass: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.05, metalness: 0.7, transparent: true, opacity: 0.75 }), // Reflective luminous azure glazing
      column: new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.4, metalness: 0.3 }), // Deep slate architectural columns
      balcony_slab: new THREE.MeshStandardMaterial({ color: 0x8d5b4c, roughness: 0.5, metalness: 0.15 }), // Warm terracotta/timber underside
      railing: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.85 }), // Anodized black metal railings
      door: new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.4, metalness: 0.2 }), // Rich amber teakwood
      roof: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.2 }),
      ground: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }),
      parking: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 })
    };

    // 7. Load and Build Geometry
    const loadGeometry = async () => {
      try {
        const res = await fetch('/test-project-geometry.json');
        if (!res.ok) throw new Error('Failed to load geometry: ' + res.status);
        const data = await res.json();

        const floorGroups = {};
        for (let f = 0; f <= 8; f++) {
          const g = new THREE.Group();
          g.name = 'FloorGroup_' + f;
          g.userData = { floorNumber: f };
          floorGroups[f] = g;
          scene.add(g);
        }
        floorGroupsRef.current = floorGroups;

        const allMeshes = [];

        data.objects.forEach((obj) => {
          if (obj.type === 'ground') return;

          const c = obj.center || { x: 0, y: 0, z: 0 };
          const d = obj.dimensions || {};
          const fNum = obj.floor_number ?? 0;
          const targetGroup = floorGroups[fNum] || scene;

          let mat = (baseMaterials[obj.material] || baseMaterials.concrete).clone();

          let geom;
          if (obj.type === 'floor') {
            geom = new THREE.BoxGeometry(d.width || 60, d.thickness || 0.3, d.depth || 40);
          } else if (obj.type === 'wall') {
            const isSide = obj.orientation === 'east' || obj.orientation === 'west';
            geom = isSide
              ? new THREE.BoxGeometry(d.thickness || 0.3, d.height || 3.15, d.length || 40)
              : new THREE.BoxGeometry(d.length || 60, d.height || 3.15, d.thickness || 0.3);
          } else if (obj.type === 'column') {
            const r = (obj.diameter || 0.6) / 2;
            geom = new THREE.CylinderGeometry(r, r, obj.height || 4.2, 16);
          } else if (obj.type === 'window') {
            geom = new THREE.BoxGeometry(d.width || 1.5, d.height || 1.8, d.depth || 0.15);
          } else if (obj.type === 'door') {
            geom = new THREE.BoxGeometry(d.width || 1.2, d.height || 2.1, 0.1);
          } else if (obj.type === 'balcony') {
            geom = new THREE.BoxGeometry(d.width || 54, d.thickness || 0.3, d.depth || 2.5);
          } else if (obj.type === 'railing') {
            geom = new THREE.BoxGeometry(d.length || 54, d.height || 1.1, d.thickness || 0.1);
          } else {
            geom = new THREE.BoxGeometry(d.width || 2, d.height || 2, d.depth || 2);
          }

          if (geom) {
            const mesh = new THREE.Mesh(geom, mat);
            // Transform coordinate system: DXF (x, y, z=height) -> Three.js (x, Y=z, Z=y)
            mesh.position.set(c.x, c.z, c.y);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = {
              name: obj.name,
              type: obj.type,
              floor_number: fNum,
              apartment_type: obj.apartment_type || null,
              materialKey: obj.material || 'concrete',
              origColor: mat.color.getHex(),
              origOpacity: mat.opacity
            };

            targetGroup.add(mesh);
            allMeshes.push(mesh);
          }
        });

        allMeshesRef.current = allMeshes;

        // 8. Proper Initial Camera Framing
        const centerX = 30;
        const centerY = 13.7;
        const centerZ = 20;
        const target = new THREE.Vector3(centerX, centerY, centerZ);

        const camDistance = 68;
        const initialCamPos = new THREE.Vector3(
          centerX + camDistance * 0.72,
          centerY + 24,
          centerZ - camDistance * 0.78
        );

        camera.position.copy(initialCamPos);
        camera.lookAt(target);
        initialCamRef.current = { pos: initialCamPos.clone(), target: target.clone() };

        setLoading(false);
      } catch (err) {
        console.error('Model loading error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadGeometry();

    // 9. Smooth Orbit & Pan Interaction
    let isDragging = false;
    let dragMode = null;
    let prevMouse = { x: 0, y: 0 };
    const curTarget = new THREE.Vector3(30, 13.7, 20);

    const onMouseDown = (e) => {
      if (measureMode) {
        handleMeasureClick(e);
        return;
      }
      isDragging = true;
      dragMode = e.button === 2 ? 'pan' : 'rotate';
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      if (dragMode === 'rotate') {
        const offset = camera.position.clone().sub(curTarget);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -dx * 0.006);
        const right = new THREE.Vector3().crossVectors(offset, camera.up).normalize();
        offset.applyAxisAngle(right, -dy * 0.006);
        camera.position.copy(curTarget).add(offset);
        camera.lookAt(curTarget);
      } else if (dragMode === 'pan') {
        const panSpeed = 0.06;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        const move = right.clone().multiplyScalar(-dx * panSpeed).add(up.clone().multiplyScalar(dy * panSpeed));
        camera.position.add(move);
        curTarget.add(move);
        camera.lookAt(curTarget);
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      const offset = camera.position.clone().sub(curTarget);
      const newLen = offset.length() * zoomFactor;

      if (newLen > 15 && newLen < 300) {
        offset.setLength(newLen);
        camera.position.copy(curTarget).add(offset);
        camera.lookAt(curTarget);
      }
    };

    const onContextMenu = (e) => e.preventDefault();

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    domEl.addEventListener('contextmenu', onContextMenu);

    // Measurement Tool Raycasting
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    const handleMeasureClick = (e) => {
      const rect = domEl.getBoundingClientRect();
      mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseVec, camera);
      const intersects = raycaster.intersectObjects(allMeshesRef.current);

      if (intersects.length > 0) {
        const pt = intersects[0].point;
        const points = measurePointsRef.current;

        if (points.length >= 2) {
          points.length = 0;
          if (measureLineRef.current) scene.remove(measureLineRef.current);
          setMeasurementDist(null);
        }

        points.push(pt);

        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xff3b30 })
        );
        marker.position.copy(pt);
        scene.add(marker);

        if (points.length === 2) {
          const d = points[0].distanceTo(points[1]);
          setMeasurementDist(d.toFixed(2));

          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xff3b30, linewidth: 3 });
          const line = new THREE.Line(lineGeo, lineMat);
          measureLineRef.current = line;
          scene.add(line);
        }
      }
    };

    // Render Loop
    const animate = () => {
      if (isDisposed) return;
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
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
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('contextmenu', onContextMenu);
      renderer.dispose();
    };
  }, [projectId]);

  // Update Floor Highlighting
  useEffect(() => {
    const fNum = typeof currentFloor === 'string' ? (currentFloor.toLowerCase().includes('stilt') ? 0 : currentFloor.toLowerCase().includes('roof') ? 8 : parseInt(currentFloor.replace(/\D/g, ''), 10)) : currentFloor;

    allMeshesRef.current.forEach((mesh) => {
      const meshFloor = mesh.userData.floor_number;
      if (fNum === 'all' || fNum === null || fNum === undefined) {
        mesh.material.color.setHex(mesh.userData.origColor);
        mesh.material.opacity = mesh.userData.origOpacity;
        mesh.material.transparent = mesh.userData.origOpacity < 1.0;
        mesh.visible = true;
      } else if (meshFloor === fNum) {
        // Highlighting active floor in blue accent glow
        if (mesh.userData.type === 'floor' || mesh.userData.type === 'balcony') {
          mesh.material.color.setHex(0x2563eb); // Rich royal blue slab accent
          mesh.material.opacity = 1.0;
        } else if (mesh.userData.type === 'railing') {
          mesh.material.color.setHex(0x60a5fa); // Bright electric blue railing
          mesh.material.opacity = 1.0;
        } else {
          mesh.material.color.setHex(mesh.userData.origColor);
          mesh.material.opacity = 1.0;
        }
        mesh.visible = true;
      } else {
        // Keep normal architectural colors vibrant without graying out everything
        mesh.material.color.setHex(mesh.userData.origColor);
        mesh.material.opacity = mesh.userData.origOpacity;
        mesh.material.transparent = mesh.userData.origOpacity < 1.0;
        mesh.visible = true;
      }
    });
  }, [currentFloor]);

  // Update Wireframe
  useEffect(() => {
    allMeshesRef.current.forEach((mesh) => {
      mesh.material.wireframe = wireframeView;
    });
  }, [wireframeView]);

  // Update Surroundings
  useEffect(() => {
    if (surroundingsGroupRef.current) {
      surroundingsGroupRef.current.visible = showSurroundings;
    }
  }, [showSurroundings]);

  // Update Exploded View
  useEffect(() => {
    const floorGroups = floorGroupsRef.current;
    if (!floorGroups) return;

    for (let f = 0; f <= 8; f++) {
      const g = floorGroups[f];
      if (!g) continue;
      const targetY = explodedView ? f * 4.5 : 0;
      g.position.y = targetY;
    }
  }, [explodedView]);

  const handleResetView = () => {
    if (!cameraRef.current || !initialCamRef.current.pos) return;
    cameraRef.current.position.copy(initialCamRef.current.pos);
    cameraRef.current.lookAt(initialCamRef.current.target);
  };

  const selectFloor = (f) => {
    setCurrentFloor(f);
    if (onFloorSelect) onFloorSelect(f);
  };

  const getFloorNumber = (f) => {
    if (typeof f === 'string') {
      if (f.toLowerCase().includes('stilt')) return 0;
      if (f.toLowerCase().includes('roof')) return 8;
      return parseInt(f.replace(/\D/g, ''), 10) || 7;
    }
    return f ?? 7;
  };

  const activeFloorNum = getFloorNumber(currentFloor);

  return (
    <div className="model-viewer-wrapper">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Constructing 3D Building Geometry from Architectural Drawings...</p>
        </div>
      )}

      {error && (
        <div className="error-overlay">
          <div className="error-content">
            <h3>Failed to load 3D Model</h3>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="model-viewer-container">
        {/* Floor Selector (Left Side Overlay) */}
        <div className="viewer-left-panel">
          <div className="floor-section">
            <span className="section-label">FLOORS</span>
            <div className="floor-buttons">
              <button
                className={`floor-btn rooftop-btn ${activeFloorNum === 8 ? 'active' : ''}`}
                onClick={() => selectFloor(8)}
              >
                Rooftop
              </button>
              {[7, 6, 5, 4, 3, 2, 1].map((f) => (
                <button
                  key={f}
                  className={`floor-btn ${activeFloorNum === f ? 'active' : ''}`}
                  onClick={() => selectFloor(f)}
                >
                  F{f}
                </button>
              ))}
              <button
                className={`floor-btn stilt-btn ${activeFloorNum === 0 ? 'active' : ''}`}
                onClick={() => selectFloor(0)}
              >
                Stilt
              </button>
            </div>
          </div>
        </div>

        {/* Selected Floor Banner */}
        {showFloorLabels && (
          <div className="selected-floor-banner">
            <div className="banner-title">
              Selected Floor ({activeFloorNum === 8 ? 'Rooftop' : activeFloorNum === 0 ? 'Stilt' : `F${activeFloorNum}`})
            </div>
            <div className="banner-subtitle">
              {activeFloorNum === 0
                ? 'Open Parking Bays & Structural Columns'
                : activeFloorNum === 8
                ? 'Open Terrace & Parapet Safety Walls'
                : 'Type A (Front) | Type B (Rear) — 2 x 4BHK Apartments'}
            </div>
          </div>
        )}

        {/* 3D Canvas */}
        <div className="model-viewer" ref={containerRef} />

        {/* View Controls (Right Side Overlay) */}
        <div className="viewer-control-panel">
          <div className="control-label">View Controls</div>
          <div className="control-guide">
            <div className="guide-item"><span>🖱️ Rotate:</span> Left Drag</div>
            <div className="guide-item"><span>🔍 Zoom:</span> Scroll Wheel</div>
            <div className="guide-item"><span>✋ Pan:</span> Right Drag</div>
          </div>

          <div className="control-buttons">
            <button className="control-action-btn" onClick={handleResetView}>
              🔄 Reset View
            </button>
            <button
              className={`control-action-btn ${explodedView ? 'active' : ''}`}
              onClick={() => setExplodedView(!explodedView)}
            >
              📑 Exploded View
            </button>
            <button
              className={`control-action-btn ${measureMode ? 'active' : ''}`}
              onClick={() => setMeasureMode(!measureMode)}
            >
              📏 {measureMode ? 'Exit Measure' : 'Measure Tool'}
            </button>
          </div>

          {measureMode && (
            <div className="measure-status">
              {measurementDist ? (
                <span>Distance: <strong>{measurementDist} m</strong></span>
              ) : (
                <span>Click 2 points on model</span>
              )}
            </div>
          )}

          <div className="control-toggles">
            <label>
              <input
                type="checkbox"
                checked={showSurroundings}
                onChange={(e) => setShowSurroundings(e.target.checked)}
              />
              Show Surroundings
            </label>
            <label>
              <input
                type="checkbox"
                checked={showFloorLabels}
                onChange={(e) => setShowFloorLabels(e.target.checked)}
              />
              Show Floor Labels
            </label>
            <label>
              <input
                type="checkbox"
                checked={showApartmentUnits}
                onChange={(e) => setShowApartmentUnits(e.target.checked)}
              />
              Show Apartment Units
            </label>
            <label>
              <input
                type="checkbox"
                checked={wireframeView}
                onChange={(e) => setWireframeView(e.target.checked)}
              />
              Wireframe View
            </label>
          </div>
        </div>

        {/* Bottom Apartment Selector Pill */}
        <div className="viewer-bottom-panel">
          <div className="apartment-selector">
            <button
              className={`apt-btn type-a ${currentApt === 'Type A' ? 'active' : ''}`}
              onClick={() => setCurrentApt('Type A')}
            >
              Type A (Front)
            </button>
            <button
              className={`apt-btn type-b ${currentApt === 'Type B' ? 'active' : ''}`}
              onClick={() => setCurrentApt('Type B')}
            >
              Type B (Rear)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
