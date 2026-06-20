import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { crmAPI } from '../services/api'

const TaskNotificationContext = createContext()

export const TaskNotificationProvider = ({ children }) => {
  const [overdueCount, setOverdueCount] = useState(0)

  // Fetch due follow-ups on mount and poll every 60s
  useEffect(() => {
    let mounted = true
    const fetchDue = async () => {
      try {
        const res = await crmAPI.getDueFollowups()
        if (mounted && res && res.data) {
          setOverdueCount(res.data.count || 0)
        }
      } catch (err) {
        // ignore errors for now
      }
    }

    fetchDue()
    const t = setInterval(fetchDue, 60000)
    return () => { mounted = false; clearInterval(t) }
  }, [])

  const updateOverdueCount = useCallback((count) => {
    setOverdueCount(count)
  }, [])

  return (
    <TaskNotificationContext.Provider value={{ overdueCount, updateOverdueCount }}>
      {children}
    </TaskNotificationContext.Provider>
  )
}

export const useTaskNotifications = () => {
  const ctx = useContext(TaskNotificationContext)
  if (!ctx) throw new Error('useTaskNotifications must be used within TaskNotificationProvider')
  return ctx
}

export default TaskNotificationContext
