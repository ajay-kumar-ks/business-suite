import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { taskApi } from '../modules/tasks/services/taskApi'

const NotificationContext = createContext()

const FALLBACK_POLL_INTERVAL = 120000 // 2 minutes (only if WebSocket disconnects)
const RECONNECT_DELAY = 3000 // 3 seconds before reconnecting

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef(null)
  const intervalRef = useRef(null)
  const reconnectTimerRef = useRef(null)

  // ── WebSocket connection ──
  const connectWebSocket = useCallback(() => {
    // Don't reconnect if already connected or connecting
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) return

    // Determine WS URL: use VITE_WS_URL if provided, otherwise derive from current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsBase = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}`
    const wsUrl = `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setWsConnected(true)
        setError(null)
        // Clear fallback polling while WebSocket is connected
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'notification' && data.notification) {
            const notif = data.notification
            // Prepend the new notification to the list
            setNotifications((prev) => [notif, ...prev].slice(0, 50))
            if (!notif.read) {
              setUnreadCount((prev) => prev + 1)
            }
          } else if (data.type === 'pong') {
            // Heartbeat response — do nothing
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
        wsRef.current = null
        // Start fallback polling when WebSocket disconnects
        startFallbackPolling()
        // Attempt to reconnect after a delay
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null
            connectWebSocket()
          }, RECONNECT_DELAY)
        }
      }

      ws.onerror = () => {
        // onerror will be followed by onclose, so we handle reconnection there
      }
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err)
      setWsConnected(false)
      startFallbackPolling()
    }
  }, [])

  // ── Fallback polling (used when WebSocket is not connected) ──
  const startFallbackPolling = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      fetchUnreadCount()
    }, FALLBACK_POLL_INTERVAL)
  }, [])

  const stopFallbackPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

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

  // ── Lifecycle ──
  useEffect(() => {
    // Initial fetch
    fetchUnreadCount()

    // Connect WebSocket
    connectWebSocket()

    return () => {
      // Cleanup WebSocket
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      // Cleanup timers
      stopFallbackPolling()
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }
  }, [connectWebSocket, fetchUnreadCount, stopFallbackPolling])

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
    wsConnected,
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
