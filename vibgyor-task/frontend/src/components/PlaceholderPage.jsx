import { useNavigate } from 'react-router-dom'
import './PlaceholderPage.css'

function PlaceholderPage({ title, description }) {
  const navigate = useNavigate()

  return (
    <div className="placeholder-page">
      <div className="placeholder-content">
        <h2>{title}</h2>
        <p>{description}</p>
        <button onClick={() => navigate('/')}>Return to Home</button>
      </div>
    </div>
  )
}

export default PlaceholderPage
