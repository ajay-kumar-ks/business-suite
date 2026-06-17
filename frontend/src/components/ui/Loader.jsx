import React from 'react'
import './Loader.css'

const Loader = ({ fullScreen = false, size = 50 }) => {
  if (fullScreen) {
    return (
      <div className="loader-fullscreen">
        <div className="loader" style={{ width: `${size}px`, height: `${size}px` }}></div>
      </div>
    )
  }
  
  return <div className="loader" style={{ width: `${size}px`, height: `${size}px` }}></div>
}

export default Loader
