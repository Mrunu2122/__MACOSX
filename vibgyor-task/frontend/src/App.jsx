import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
import ViewerPage from './components/ViewerPage';
import FloorPlans from './components/FloorPlans';
import RenderedViews from './components/RenderedViews';
import ProjectInfo from './components/ProjectInfo';

function App() {
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <main className="app-main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/viewer" element={<ViewerPage />} />
            <Route
              path="/floor-plans"
              element={
                <div style={{ padding: '24px', background: 'white', minHeight: '100%' }}>
                  <FloorPlans />
                </div>
              }
            />
            <Route
              path="/renders"
              element={
                <div style={{ padding: '24px', background: 'white', minHeight: '100%' }}>
                  <RenderedViews />
                </div>
              }
            />
            <Route
              path="/project-info"
              element={
                <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100%', maxWidth: '640px' }}>
                  <ProjectInfo />
                </div>
              }
            />
            <Route path="*" element={<Navigate to="/viewer" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
