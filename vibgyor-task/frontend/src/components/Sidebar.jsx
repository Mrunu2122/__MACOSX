import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  FiHome, 
  FiBox, 
  FiGrid, 
  FiImage, 
  FiInfo,
  FiMenu,
  FiX
} from 'react-icons/fi'
import './Sidebar.css'

function Sidebar() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigationItems = [
    { label: 'Home', path: '/', icon: FiHome },
    { label: '3D Viewer', path: '/viewer', icon: FiBox },
    { label: 'Floor Plans', path: '/floor-plans', icon: FiGrid },
    { label: 'Renders', path: '/renders', icon: FiImage },
    { label: 'Project Info', path: '/project-info', icon: FiInfo }
  ]

  const isActive = (path) => location.pathname === path

  const handleNavClick = () => {
    setMobileOpen(false)
  }

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <FiX /> : <FiMenu />}
      </button>

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <h1>VIBGYOR</h1>
          <p>RESIDENTIAL</p>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {mobileOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  )
}

export default Sidebar
