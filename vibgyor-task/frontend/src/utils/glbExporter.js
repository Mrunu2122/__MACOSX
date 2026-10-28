import * as THREE from 'three'

/**
 * Export a THREE.js scene to GLB format
 * Uses THREE.js GLTFExporter if available
 */
export async function exportSceneToGLB(scene, filename = 'building.glb') {
  try {
    // Dynamic import of GLTFExporter
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
    
    const exporter = new GLTFExporter()
    
    return new Promise((resolve, reject) => {
      exporter.parse(
        scene,
        (gltf) => {
          // Convert to ArrayBuffer
          const output = JSON.stringify(gltf, null, 2)
          const blob = new Blob([output], { type: 'application/json' })
          resolve({ blob, filename })
        },
        (error) => {
          reject(error)
        },
        { binary: true }
      )
    })
  } catch (error) {
    console.error('GLB export error:', error)
    throw error
  }
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Simple geometry to JSON export for fallback
 */
export function exportGeometryToJSON(geometryData, filename = 'building.json') {
  const dataStr = JSON.stringify(geometryData, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  downloadBlob(blob, filename)
}

/**
 * Get scene statistics
 */
export function getSceneStats(scene) {
  let geometryCount = 0
  let meshCount = 0
  let materials = new Set()

  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshCount++
      if (object.geometry) {
        geometryCount++
      }
      if (object.material) {
        materials.add(object.material.type)
      }
    }
  })

  return {
    meshes: meshCount,
    geometries: geometryCount,
    materials: Array.from(materials),
    totalObjects: scene.children.length
  }
}
