# VIBGYOR Residential — Complete 3D Architectural Visualization & Automation

Interactive, drawing-driven 3D architectural building visualization and automated model generation built with React, Three.js, and Python (`ezdxf`).

---

## 1. Architectural Program & Implementation

The application accurately models the **VIBGYOR Residential** project situated at Prabhat Nagar, Ahmedabad, conforming to the architectural program:
- **7 Typical Residential Floors (F1 – F7)** + **Stilt Parking Level (F0)** + **Rooftop / Terrace Level (F8)**.
- **2 Units per Typical Floor**:
  - **Type A (Front)**: 4BHK residence facing the 18-metre main road with deep balcony deck.
  - **Type B (Rear)**: 4BHK residence facing the quieter rear green space with breakfast balcony.
- **Floor Heights**: 3.15 m typical residential story height; 4.2 m ground/stilt parking level; 1.2 m terrace parapet walls.
- **Building Footprint**: 60.0 m × 40.0 m footprint, 27.45 m total structural height.
- **Elements Generated**:
  - Open stilt parking bays with structural columns (`Column_Stilt_r_c`).
  - Distinguishable residential floor slabs with floor-level demarcation.
  - Exterior front, rear, left, and right walls.
  - Glazed window assemblies on exterior wall openings.
  - Balcony slabs and protective safety railings.
  - Main pedestrian entrance (F1) and emergency exit doors (F1, F4, F7).
  - Rooftop parapet safety walls and core enclosure.
  - Site context: 18m road, zebra lane markings, pedestrian sidewalks, perimeter lawns, and boundary landscaping trees.

---

## 2. Root Causes of Previous Broken States & Solutions Applied

1. **Premature Container Query & Sizing Collapse**:
   - *Previous issue*: The Three.js canvas initialization read container dimensions before layout stabilization, resulting in zero or distorted viewports, or tiny squished boxes.
   - *Fix*: Integrated a `ResizeObserver` on the viewer container coupled with dynamic camera aspect ratio and renderer updates. Added default responsive height styles (`min-height: 540px`).
2. **Missing In-Line Orbit Controls & CDN Failure**:
   - *Previous issue*: `OrbitControls` was imported via dynamic modules that failed or relied on non-existent `window.THREE.OrbitControls`, falling back to basic event handlers that failed mouse-drag arithmetic.
   - *Fix*: Implemented quaternion and axis-angle rotation math and screen-space panning directly in Three.js without brittle external script injections. Added Orbit (left drag), Zoom (mouse wheel with clamp), Pan (right drag), and a dedicated Reset View button.
3. **Improper Camera Framing & Frustum Clipping**:
   - *Previous issue*: Camera was placed at arbitrary coordinates, clipping the bottom half or making the model look like a floating dark polygon.
   - *Fix*: Calculated the model bounding box and center point (`(30, 13.7, 20)`). Camera is positioned with a three-quarter perspective distance (`camDistance = 68m`) framing the complete stilt-to-rooftop building with balanced margins.
4. **Missing 3D Apartment Visualization**:
   - *Previous issue*: Displayed an empty placeholder card with an emoji icon.
   - *Fix*: Built a cutaway / dollhouse 3D interactive viewer for both **Type A (Front 4BHK)** and **Type B (Rear 4BHK)** featuring waist-high partition walls, room zones (Master Bed, Bed 2, Bed 3, Bed 4, Living & Dining, Kitchen, Bathrooms, and Balconies), and scaled 3D furniture assemblies.
5. **Render Gallery Placeholder Icons**:
   - *Previous issue*: Displayed generic weather and door emoji icons.
   - *Fix*: Embedded high-resolution architectural captures into `frontend/public/renders/` depicting the 3D model under Street View (Day), Front Corner View (Dusk), Aerial View, and Entrance View with a full-screen lightbox modal.

---

## 3. Implemented Bonus Features

- **Apartment Unit Views (Bonus)**: Interactive 3D cutaway dollhouse views with independent orbit controls for Type A and Type B, alongside top-down 2D floor plans and room specification tables.
- **Floor Highlighting & Selection**: Selecting any level (Stilt, F1–F7, Rooftop) highlights that floor in vivid architectural blue while dimming the rest of the structure.
- **Exploded View**: Vertically separates individual floor groups by model height (`f * 4.5m`) to inspect slab and unit separation in real time.
- **Measurement Tool**: Click any 2 points on the 3D model geometry to compute real-world euclidean distances in metres.
- **Show/Hide Surroundings**: Toggle roads, walkways, lawn, and perimeter trees.
- **Show/Hide Floor Labels**: Toggle active floor banner overlays.
- **Wireframe View**: Inspect underlying polygon mesh topology and structural grids.
- **GLB / GLTF Export**: Download Model button exports the building geometry asset.

---

## 4. How to Run the Application

### Option 1: Serve Production Build (Recommended)
```bash
# From the project root
node vibgyor-task/serve-frontend.js
```
Open [http://localhost:3000/viewer](http://localhost:3000/viewer) in your browser.

### Option 2: Run Vite Dev Server
```bash
cd vibgyor-task/frontend
npm run dev
```

### Option 3: Regenerate 3D Geometry
```bash
node vibgyor-task/generate-geometry.js
```

---

## 5. Output Locations

- **3D Geometry Dataset**: `vibgyor-task/frontend/public/test-project-geometry.json` & `vibgyor-task/frontend/dist/test-project-geometry.json`
- **Architectural Renders**: `vibgyor-task/frontend/public/renders/`
  - `01_street_day.png` (Street View Day)
  - `02_dusk_corner.png` (Front Corner View Dusk)
  - `03_aerial_45deg.png` (Aerial View)
  - `04_entrance_closeup.png` (Entrance Approach View)
- **Source DXF/DWG Drawings**: `vibgyor-task/SUBMISSION - 04.dxf` and `vibgyor-task/SUBMISSION - 04.dwg`
