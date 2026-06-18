import React, { createContext, useContext, useState, useCallback } from 'react'

const TaskNotificationContext = createContext()

export const TaskNotificationProvider = ({ children }) => {
  const [overdueCount, setOverdueCount] = useState(0)

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
