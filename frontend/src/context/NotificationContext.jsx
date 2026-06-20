import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { taskApi } from '../modules/tasks/services/taskApi'

const NotificationContext = createContext()

const POLL_INTERVAL = 15000 // 15 seconds

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await taskApi.getUnreadCount()
      setUnreadCount(res.data?.count ?? 0)
      return res.data?.count ?? 0
    } catch (err) {
      // Silently fail — user may not be authenticated
      if (err.response?.status !== 401) {
        console.error('Failed to fetch unread count:', err)
      }
      return 0
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true)
    setError(null)
    try {
      const res = await taskApi.getNotifications()
      setNotifications(res.data || [])
      // Also update unread count
      const count = res.data?.filter((n) => !n.read).length ?? 0
      setUnreadCount(count)
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Failed to fetch notifications:', err)
        setError('Failed to load notifications')
      }
    } finally {
      setNotificationsLoading(false)
    }
  }, [])

  // Start polling when component mounts, stop on unmount
  useEffect(() => {
    // Initial fetch
    fetchUnreadCount()

    // Poll for unread count
    intervalRef.current = setInterval(() => {
      fetchUnreadCount()
    }, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchUnreadCount])

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await taskApi.markNotificationRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await taskApi.markAllNotificationsRead()
      const marked = res.data?.marked_read ?? 0
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      return marked
    } catch (err) {
      console.error('Failed to mark all as read:', err)
      return 0
    }
  }, [])

  const value = {
    unreadCount,
    notifications,
    notificationsLoading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return ctx
}

export default NotificationContext
