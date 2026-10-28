import { useState, useRef } from 'react'
import './FileUploader.css'

function FileUploader({ onUpload, loading }) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

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
      if (file.name.endsWith('.dxf') || file.name.endsWith('.dwg')) {
        setSelectedFile(file)
      } else {
        alert('Please upload a DXF or DWG file')
      }
    }
  }

  const handleChange = (e) => {
    const files = e.target.files
    if (files && files[0]) {
      setSelectedFile(files[0])
    }
  }

  const handleSubmit = () => {
    if (selectedFile) {
      onUpload(selectedFile)
      setSelectedFile(null)
    }
  }

  return (
    <div className="file-uploader">
      <div
        className={`drop-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".dxf,.dwg"
          onChange={handleChange}
          disabled={loading}
          style={{ display: 'none' }}
        />
        
        <div className="drop-zone-content">
          {loading ? (
            <>
              <div className="spinner"></div>
              <p>Processing your drawing...</p>
              <small>This may take a minute</small>
            </>
          ) : (
            <>
              <div className="upload-icon">📐</div>
              {selectedFile ? (
                <>
                  <p className="success">✓ {selectedFile.name}</p>
                  <p className="hint">Ready to upload</p>
                </>
              ) : (
                <>
                  <p className="main">Drop your DXF or DWG file here</p>
                  <p className="hint">or click to browse</p>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="uploader-info">
        <h3>📋 Supported Files</h3>
        <ul>
          <li>AutoCAD DXF (.dxf)</li>
          <li>AutoCAD DWG (.dwg)</li>
          <li>Maximum size: 50MB</li>
        </ul>
      </div>

      {selectedFile && !loading && (
        <button 
          className="upload-button"
          onClick={handleSubmit}
          disabled={loading}
        >
          🚀 Generate 3D Model
        </button>
      )}
    </div>
  )
}

export default FileUploader
