import React from 'react'
import '../../styles/Input.css'

const Input = ({ label, id, ...props }) => {
  return (
    <div className="ui-input">
      {label && (
        <label htmlFor={id} className="ui-input-label">
          {label}
        </label>
      )}
      <input id={id} className="ui-input-field" {...props} />
    </div>
  )
}

export default Input
