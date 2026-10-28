import { useEffect, useState } from 'react'
import axios from 'axios'
import './RenderGallery.css'

function RenderGallery({ projectId }) {
  const [renders, setRenders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRender, setSelectedRender] = useState(null)
  const [renderImages, setRenderImages] = useState({})

  // Render descriptions
  const renderDescriptions = {
    'exterior-front': {
      title: 'Exterior Front View',
      description: 'Front facade of the building as viewed from the street'
    },
    'exterior-side': {
      title: 'Exterior Side View',
      description: 'Side profile showing depth and lateral dimensions'
    },
    'exterior-top': {
      title: 'Aerial/Top View',
      description: 'Bird\'s eye view showing the roof and floor layout'
    },
    'interior-ground': {
      title: 'Interior Ground Floor',
      description: 'Ground level interior view showing room layout'
    }
  }

  useEffect(() => {
    const loadRenders = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`/api/project/${projectId}`)
        
        console.log('API Response:', response.data)
        console.log('Renders array:', response.data.renders)
        
        // Parse renders - they come as full URLs from the API
        const renders = (response.data.renders || []).map((renderUrl) => {
          // Extract the render name from the URL
          const parts = renderUrl.split('/')
          const filename = parts[parts.length - 1] // e.g., "exterior-front.svg"
          const name = filename.replace('.svg', '') // e.g., "exterior-front"
          
          const desc = renderDescriptions[name] || { 
            title: name, 
            description: 'Building render' 
          }
          
          return {
            name,
            url: renderUrl,
            ...desc
          }
        })
        
        console.log('Parsed renders:', renders)
        setRenders(renders)
        
        // Create image map
        const images = {}
        for (const render of renders) {
          images[render.name] = render.url
        }
        setRenderImages(images)
        setLoading(false)
      } catch (err) {
        console.error('Error loading renders:', err)
        setError('Failed to load renders')
        setLoading(false)
      }
    }

    if (projectId) {
      loadRenders()
    }
  }, [projectId])

  if (loading) {
    return (
      <div className="render-gallery">
        <h3>🖼️ Rendered Views</h3>
        <div className="loading">Loading renders...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="render-gallery">
        <h3>🖼️ Rendered Views</h3>
        <div className="error">{error}</div>
      </div>
    )
  }

  if (selectedRender) {
    const imageUrl = renderImages[selectedRender.name]
    
    return (
      <div className="render-gallery">
        <div className="render-detail">
          <button 
            className="back-btn" 
            onClick={() => setSelectedRender(null)}
          >
            ← Back to Gallery
          </button>
          <h3>{selectedRender.title}</h3>
          <p className="render-description">{selectedRender.description}</p>
          <div className="render-preview">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={selectedRender.title}
                className="render-image"
              />
            ) : (
              <div className="render-placeholder-large">
                <div className="camera-icon">📸</div>
                <p>Render: {selectedRender.name}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="render-gallery">
      <h3>🖼️ Rendered Views</h3>
      <p className="gallery-subtitle">4 different camera angles of your building</p>
      {renders.length === 0 ? (
        <div className="no-renders">
          <p>Renders are being processed...</p>
        </div>
      ) : (
        <div className="renders-grid">
          {renders.map((render, index) => {
            const imageUrl = renderImages[render.name]
            
            return (
              <div 
                key={index} 
                className="render-item"
                onClick={() => setSelectedRender(render)}
              >
                <div className="render-thumbnail">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={render.title}
                      className="render-thumb-image"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  ) : null}
                  <div className="render-label">
                    <p className="render-title">{render.title}</p>
                    <p className="render-subtitle">{render.name}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="render-info-box">
        <p>💡 <strong>About Renders:</strong></p>
        <p>
          These are rendered views of your 3D model from different camera angles. 
          Each view shows the building from a different perspective to help visualize the structure 
          and spatial relationships in your architectural design.
        </p>
      </div>
    </div>
  )
}

export default RenderGallery
