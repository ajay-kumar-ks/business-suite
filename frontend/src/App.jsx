import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import Login from './modules/auth/pages/Login'
import Dashboard from './modules/dashboard/pages/Dashboard'
import CRMPage from './modules/crm/pages/CRMPage'
import TasksPage from './modules/tasks/pages/TasksPage'
import HRPage from './modules/hr/pages/HRPage'
import EmployeeDashboard from './modules/hr/pages/EmployeeDashboard'
import AccountsModule from './modules/accounts/AccountsModule'
import PageShell from './components/PageShell'
import Loader from './components/ui/Loader'
import { TaskNotificationProvider } from './context/TaskNotificationContext'
import './App.css'

function App() {
  const { isAuthenticated, loading, user } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) return <Loader fullScreen={true} />

  return (
    <div className="app">
      {isAuthenticated && (
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<Navigate to="/dashboard" />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />

            <Route
              path="/dashboard"
              element={<TaskNotificationProvider><Dashboard /></TaskNotificationProvider>}
            />

            <Route
              path="/crm"
              element={<TaskNotificationProvider><PageShell><CRMPage /></PageShell></TaskNotificationProvider>}
            />

            <Route
              path="/tasks"
              element={<TaskNotificationProvider><PageShell><TasksPage /></PageShell></TaskNotificationProvider>}
            />

            <Route path="/task" element={<Navigate to="/tasks" />} />

            <Route
              path="/hr"
              element={
                <TaskNotificationProvider>
                  <PageShell>
                    {user?.is_admin ? <HRPage /> : <EmployeeDashboard />}
                  </PageShell>
                </TaskNotificationProvider>
              }
            />

        <Route
          path="/accounts"
          element={isAuthenticated ? <TaskNotificationProvider><PageShell><AccountsModule /></PageShell></TaskNotificationProvider> : <Navigate to="/login" />}
        />

            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </NotificationProvider>
      )}

      {!isAuthenticated && (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </div>
  )
}

export default App
