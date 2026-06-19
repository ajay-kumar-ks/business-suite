import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './modules/auth/pages/Login'
import Dashboard from './modules/dashboard/pages/Dashboard'
import CRMPage from './modules/crm/pages/CRMPage'
import TasksPage from './modules/tasks/pages/TasksPage'
import HRPage from './modules/hr/pages/HRPage'
import EmployeeDashboard from './modules/hr/pages/EmployeeDashboard'
import AccountsPage from './modules/accounts/pages/AccountsPage'
import PageShell from './components/PageShell'
import Loader from './components/ui/Loader'
import { TaskNotificationProvider } from './context/TaskNotificationContext'
import './App.css'

function App() {
  const { isAuthenticated, user } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <Loader fullScreen={true} />

  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />

        <Route
          path="/dashboard"
          element={isAuthenticated ? <TaskNotificationProvider><Dashboard /></TaskNotificationProvider> : <Navigate to="/login" />}
        />

        <Route
          path="/crm"
          element={isAuthenticated ? <TaskNotificationProvider><PageShell><CRMPage /></PageShell></TaskNotificationProvider> : <Navigate to="/login" />}
        />

        <Route
          path="/tasks"
          element={isAuthenticated ? <TaskNotificationProvider><PageShell><TasksPage /></PageShell></TaskNotificationProvider> : <Navigate to="/login" />}
        />

        <Route path="/task" element={<Navigate to="/tasks" />} />

        <Route
          path="/hr"
          element={isAuthenticated ? (
            <TaskNotificationProvider>
              <PageShell>
                {user?.is_admin ? <HRPage /> : <EmployeeDashboard />}
              </PageShell>
            </TaskNotificationProvider>
          ) : <Navigate to="/login" />}
        />

        <Route
          path="/accounts"
          element={isAuthenticated ? <TaskNotificationProvider><PageShell><AccountsPage /></PageShell></TaskNotificationProvider> : <Navigate to="/login" />}
        />

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </div>
  )
}

export default App
