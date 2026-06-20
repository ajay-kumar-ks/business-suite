import React, { useState, useEffect, useRef } from 'react'
import { Bell, AtSign, ArrowRightLeft, CheckCheck, ExternalLink, Loader2 } from 'lucide-react'
import { useNotifications } from '../../../context/NotificationContext'
import '../styles/NotificationDropdown.css'

const NotificationDropdown = () => {
  const {
    unreadCount,
    notifications,
    notificationsLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch full list when opening
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  const handleToggle = () => {
    setOpen((prev) => !prev)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    // The user can click to go to the task — we close the dropdown
    handleClose()
  }

  const getIcon = (type) => {
    switch (type) {
      case 'mention':
        return <AtSign size={14} className="notif-icon mention-icon" />
      case 'status_change':
        return <ArrowRightLeft size={14} className="notif-icon status-icon" />
      default:
        return <Bell size={14} className="notif-icon default-icon" />
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="notification-dropdown-wrapper" ref={dropdownRef}>
      <button
        className="icon-btn notification-bell-btn"
        onClick={handleToggle}
        title="Notifications"
        aria-label="Toggle notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>
              <Bell size={16} />
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                className="notif-mark-all-btn"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-dropdown-body">
            {notificationsLoading && notifications.length === 0 ? (
              <div className="notif-loading">
                <Loader2 size={20} className="spin" />
                <span>Loading...</span>
              </div>
            ) : error ? (
              <div className="notif-error">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={24} />
                <span>No notifications yet</span>
                <p>You'll see notifications here when someone mentions you or updates a task.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? 'notif-unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="notif-icon-wrapper">
                    {getIcon(n.type)}
                  </div>
                  <div className="notif-content">
                    <p className="notif-message">{n.message}</p>
                    <div className="notif-meta">
                      {n.actor_name && (
                        <span className="notif-actor">{n.actor_name}</span>
                      )}
                      <span className="notif-time">{formatDate(n.created_at)}</span>
                    </div>
                  </div>
                  {!n.read && <span className="notif-dot" />}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-dropdown-footer">
              <button className="notif-goto-tasks" onClick={handleClose}>
                <ExternalLink size={12} />
                Go to Tasks
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown
