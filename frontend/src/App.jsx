import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './modules/auth/pages/Login'
import Dashboard from './modules/dashboard/pages/Dashboard'
import CRMPage from './modules/crm/pages/CRMPage'
import TasksPage from './modules/tasks/pages/TasksPage'
import HRPage from './modules/hr/pages/HRPage'
import AccountsPage from './modules/accounts/pages/AccountsPage'
import PageShell from './components/PageShell'
import './App.css'

function App() {
  const { isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div>Loading...</div>

  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />

        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />

        <Route
          path="/crm"
          element={isAuthenticated ? <PageShell><CRMPage /></PageShell> : <Navigate to="/login" />}
        />

        <Route
          path="/tasks"
          element={isAuthenticated ? <PageShell><TasksPage /></PageShell> : <Navigate to="/login" />}
        />

        <Route path="/task" element={<Navigate to="/tasks" />} />

        <Route
          path="/hr"
          element={isAuthenticated ? <PageShell><HRPage /></PageShell> : <Navigate to="/login" />}
        />

        <Route
          path="/accounts"
          element={isAuthenticated ? <PageShell><AccountsPage /></PageShell> : <Navigate to="/login" />}
        />

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </div>
  )
}

export default App
