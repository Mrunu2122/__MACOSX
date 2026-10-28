// This file contains geometry loading logic for the 3D viewer
// It can load from API (production) or from static files (development/testing)

export const getMockProjectData = async (projectId) => {
  if (projectId === 'test-project-001' || projectId === 'e9f8892b-c65f-4ea7-8885-8dc0e85465f2') {
    try {
      // Try to load from static file served by Vite
      const response = await fetch('/test-project-geometry.json')
      if (response.ok) {
        const geometry = await response.json()
        return {
          projectId,
          geometry,
          metadata: geometry.metadata || {}
        }
      }
    } catch (e) {
      console.warn('Failed to load mock geometry:', e)
    }
  }
  return null
}
