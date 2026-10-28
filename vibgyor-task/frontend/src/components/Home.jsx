import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBox, FiImage, FiGrid, FiFileText, FiCloud } from 'react-icons/fi'
import './Home.css'

function Home() {
  const navigate = useNavigate()
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = null

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      const file = files[0]
      validateAndSelectFile(file)
    }
  }

  const validateAndSelectFile = (file) => {
    setError(null)
    
    const validExtensions = ['.dxf', '.dwg']
    const fileExt = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!validExtensions.includes(fileExt)) {
      setError('Please upload a DXF or DWG file')
      return
    }

    const maxSize = 50 * 1024 * 1024 // 50 MB
    if (file.size > maxSize) {
      setError('File size exceeds 50 MB limit')
      return
    }

    setSelectedFile(file)
  }

  const handleFileChange = (e) => {
    const files = e.target.files
    if (files && files[0]) {
      validateAndSelectFile(files[0])
    }
  }

  const handleGenerate = async () => {
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await response.json()
      
      if (data.success && data.projectId) {
        // Store project ID in session/local storage and navigate to viewer
        sessionStorage.setItem('currentProjectId', data.projectId)
        navigate('/viewer')
      }
    } catch (err) {
      let errorMsg = err.message || 'Failed to generate model'
      
      // Provide helpful guidance for DWG conversion errors
      if (errorMsg.includes('DWG') || errorMsg.includes('dwg') || errorMsg.includes('DXF')) {
        errorMsg += '\n\nTip: If you have a DWG file, try converting it to DXF first using:'
        errorMsg += '\n• AutoCAD or AutoCAD Viewer (free)'
        errorMsg += '\n• LibreCAD (free, open-source)'
        errorMsg += '\n• Online tools: CloudConvert.com, Zamzar.com, or AnyConv.com'
      }
      
      setError(errorMsg)
      console.error('Upload error:', err)
    } finally {
      setLoading(false)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setError(null)
  }

  const featureCards = [
    {
      icon: FiBox,
      title: 'Interactive 3D Model',
      description: 'View, rotate and explore the building in 3D.'
    },
    {
      icon: FiImage,
      title: 'High-Quality Renders',
      description: 'Generate architectural renders from the model.'
    },
    {
      icon: FiGrid,
      title: 'Floor-wise Exploration',
      description: 'Select and view each floor with its details.'
    },
    {
      icon: FiFileText,
      title: 'Accurate from Drawings',
      description: 'Generate the building from your architectural plans.'
    }
  ]

  const steps = [
    {
      number: 1,
      title: 'Upload Drawings',
      description: 'Upload your DWG or DXF files.',
      icon: FiCloud
    },
    {
      number: 2,
      title: 'Automatic Processing',
      description: 'Extract geometry and generate the 3D model.',
      icon: FiBox
    },
    {
      number: 3,
      title: 'Explore in 3D',
      description: 'View the building and select individual floors.',
      icon: FiGrid
    },
    {
      number: 4,
      title: 'Get Renders & Plans',
      description: 'View the generated architectural renders and available floor plans.',
      icon: FiImage
    }
  ]

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <p className="hero-label">ARCHITECTURAL DRAWINGS TO 3D</p>
            <h1 className="hero-title">
              Generate a 3D Building Model<br />from Architectural Drawings
            </h1>
            <p className="hero-description">
              Upload your DWG/DXF files to automatically create an interactive 3D model with architectural renders, floor plans and more.
            </p>

            {/* Upload Area */}
            <div 
              className={`upload-area ${dragActive ? 'active' : ''} ${loading ? 'loading' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !loading && document.getElementById('fileInput')?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".dwg,.dxf"
                onChange={handleFileChange}
                disabled={loading}
                style={{ display: 'none' }}
              />

              <div className="upload-content">
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <p>Processing your drawing...</p>
                    <small>This may take a moment</small>
                  </>
                ) : selectedFile ? (
                  <>
                    <FiCloud className="upload-icon" />
                    <p className="file-name">✓ {selectedFile.name}</p>
                    <small>Ready to generate</small>
                  </>
                ) : (
                  <>
                    <FiCloud className="upload-icon" />
                    <p className="upload-text">Drag and drop your DWG/DXF files here</p>
                    <small>or click to browse</small>
                  </>
                )}
              </div>
              {!loading && <p className="upload-hint">Supported formats: .dwg, .dxf | Max size: 50 MB</p>}
            </div>

            {error && (
              <div className="error-message">
                <span>⚠️ {error.split('\n').map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}</span>
                {selectedFile && (
                  <button className="error-dismiss" onClick={removeFile}>✕</button>
                )}
              </div>
            )}

            {selectedFile && !loading && (
              <button 
                className="generate-btn"
                onClick={handleGenerate}
                disabled={loading}
              >
                Generate 3D Model →
              </button>
            )}
          </div>

          <div className="hero-image">
            <div className="building-illustration">
              <img 
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'%3E%3Crect fill='%23f0f0f0' width='300' height='400'/%3E%3Crect x='60' y='80' width='180' height='280' fill='%23d4a574' stroke='%23999' stroke-width='2'/%3E%3Crect x='80' y='100' width='20' height='30' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='120' y='100' width='20' height='30' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='160' y='100' width='20' height='30' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='200' y='100' width='20' height='30' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='80' y='150' width='20' height='25' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='120' y='150' width='20' height='25' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='160' y='150' width='20' height='25' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='200' y='150' width='20' height='25' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='80' y='200' width='20' height='25' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='120' y='200' width='20' height='25' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='160' y='200' width='20' height='25' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='200' y='200' width='20' height='25' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='80' y='250' width='20' height='25' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='120' y='250' width='20' height='25' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='160' y='250' width='20' height='25' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Crect x='200' y='250' width='20' height='25' fill='%238b7355' stroke='%23666' stroke-width='1'/%3E%3Cpolygon points='150,60 90,80 210,80' fill='%238b6f47'/%3E%3C/svg%3E"
                alt="Modern residential building illustration"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">What you'll get</h2>
        <div className="features-grid">
          {featureCards.map((card, index) => {
            const Icon = card.icon
            return (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  <Icon />
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="how-it-works-card">
          <h2>How it works</h2>
          <div className="steps-container">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="step">
                  <div className="step-number">{step.number}</div>
                  <Icon className="step-icon" />
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {index < steps.length - 1 && <div className="step-arrow">→</div>}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
