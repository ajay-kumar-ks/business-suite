import React from 'react'
import '../../styles/Avatar.css'

const Avatar = ({ src, name, size = 40 }) => {
  return (
    <div className="ui-avatar" style={{ width: size, height: size }}>
      {src ? <img src={src} alt={name || 'avatar'} /> : <div className="ui-avatar-fallback">{(name || '').charAt(0)}</div>}
    </div>
  )
}

export default Avatar
