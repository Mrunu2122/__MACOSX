import * as THREE from 'three'

/**
 * Generate architectural renders from different camera positions
 */
export class RenderGenerator {
  constructor(scene, camera, renderer) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
  }

  /**
   * Get building bounds for camera positioning
   */
  getBounds() {
    const bounds = new THREE.Box3().setFromObject(this.scene)
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const distance = maxDim / (2 * Math.tan((this.camera.fov * Math.PI) / 360))
    
    return { center, size, maxDim, distance }
  }

  /**
   * Generate Street View (Day) - front facade
   */
  generateStreetView() {
    const { center, distance } = this.getBounds()
    const prevPos = this.camera.position.clone()
    const prevTarget = this.camera.lookAt.bind(this.camera)
    
    // Position camera at front-left angle
    this.camera.position.set(
      center.x - distance * 0.3,
      center.y + distance * 0.4,
      center.z - distance * 0.5
    )
    this.camera.lookAt(center.x, center.y, center.z)
    this.camera.updateProjectionMatrix()
    
    const canvas = this.renderer.domElement.cloneNode()
    this.renderer.render(this.scene, this.camera)
    
    return this.renderer.domElement.toDataURL('image/png')
  }

  /**
   * Generate Front Corner View (Dusk) - warm lighting
   */
  generateCornerViewDusk() {
    const { center, distance } = this.getBounds()
    
    // Warm dusk lighting
    const lights = this.scene.children.filter(child => child instanceof THREE.Light)
    const originalIntensities = lights.map(light => light.intensity)
    
    // Adjust lighting for dusk
    lights.forEach(light => {
      if (light instanceof THREE.DirectionalLight) {
        light.color.setHex(0xffa87e) // Warm orange
        light.intensity = 1.5
      } else if (light instanceof THREE.AmbientLight) {
        light.intensity = 0.8
      }
    })
    
    // Position at 45-degree angle
    this.camera.position.set(
      center.x + distance * 0.4,
      center.y + distance * 0.5,
      center.z + distance * 0.4
    )
    this.camera.lookAt(center.x, center.y, center.z)
    this.camera.updateProjectionMatrix()
    
    this.renderer.render(this.scene, this.camera)
    const image = this.renderer.domElement.toDataURL('image/png')
    
    // Restore lighting
    lights.forEach((light, idx) => {
      light.intensity = originalIntensities[idx]
      if (light instanceof THREE.DirectionalLight) {
        light.color.setHex(0xffffff)
      }
    })
    
    return image
  }

  /**
   * Generate Aerial View - from above
   */
  generateAerialView() {
    const { center, distance, size } = this.getBounds()
    
    // High angle from above
    this.camera.position.set(
      center.x,
      center.y + distance * 0.8,
      center.z + distance * 0.3
    )
    this.camera.lookAt(center.x, center.y * 0.5, center.z)
    this.camera.updateProjectionMatrix()
    
    this.renderer.render(this.scene, this.camera)
    return this.renderer.domElement.toDataURL('image/png')
  }

  /**
   * Generate Entrance View - ground level perspective
   */
  generateEntranceView() {
    const { center, distance } = this.getBounds()
    
    // Eye-level from entrance side
    this.camera.position.set(
      center.x - distance * 0.5,
      center.y * 0.3,
      center.z - distance * 0.6
    )
    this.camera.lookAt(center.x, center.y * 0.5, center.z)
    this.camera.updateProjectionMatrix()
    
    this.renderer.render(this.scene, this.camera)
    return this.renderer.domElement.toDataURL('image/png')
  }

  /**
   * Generate all renders
   */
  generateAllRenders() {
    return {
      street: this.generateStreetView(),
      corner: this.generateCornerViewDusk(),
      aerial: this.generateAerialView(),
      entrance: this.generateEntranceView()
    }
  }
}

/**
 * Generate a placeholder render (for browser that don't support canvas rendering)
 */
export function generatePlaceholderRender(width = 800, height = 600) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#87ceeb')
  gradient.addColorStop(1, '#e0f6ff')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  // Text
  ctx.fillStyle = '#333'
  ctx.font = '24px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('3D Building Render', width / 2, height / 2)
  
  return canvas.toDataURL('image/png')
}
