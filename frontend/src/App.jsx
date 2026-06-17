import React, { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import Login from './modules/auth/pages/Login'
import Dashboard from './modules/dashboard/pages/Dashboard'
import './App.css'

function App() {
  const { isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <div className="app">
      {isAuthenticated ? (
        <Dashboard />
      ) : (
        <Login onLoginSuccess={() => {}} />
      )}
    </div>
  )
}

export default App
