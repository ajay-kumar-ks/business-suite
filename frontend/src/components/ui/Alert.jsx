import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/Alert.css'

const Alert = ({
  icon,
  title,
  message,
  action,
  dismissible = true,
  variant = 'toast',
  position = 'top-right',
  timeout = 5000,
  type = 'success',
  portal = true,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!visible) return undefined

    const timer = window.setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, timeout)

    return () => {
      window.clearTimeout(timer)
    }
  }, [timeout, visible, onDismiss])

  const handleDismiss = () => {
    setVisible(false)
    onDismiss?.()
  }

  if (!visible) return null

  const card = (
    <div
      className={`alert-card alert-${type} ${variant === 'toast' ? 'alert-card-toast' : ''}`}
      role="status"
      aria-live="polite"
    >
      {icon ? <div className="alert-icon">{icon}</div> : null}
      <div className={`alert-content ${variant === 'toast' ? 'alert-content-toast' : ''}`}>
        {variant !== 'toast' && title ? <div className="alert-title">{title}</div> : null}
        <div className="alert-message">{message}</div>
        {action && variant !== 'toast' ? <div className="alert-action">{action}</div> : null}
      </div>
      {dismissible ? (
        <button className="alert-close" type="button" onClick={handleDismiss} aria-label="Dismiss alert">
          ×
        </button>
      ) : null}
    </div>
  )

  if (variant === 'toast') {
    if (!portal) return card
    if (!mounted) return null

  return createPortal(
    <div className={`alert-portal alert-position-${position}`}>
      {card}
    </div>,
    document.body
  )
  }

  return card
}

export default Alert
