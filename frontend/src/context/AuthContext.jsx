import React, { createContext, useEffect, useState, useCallback } from 'react'
import { authAPI } from '../services/api'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('access_token'),
  )

  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setIsAuthenticated(false)
        return
      }

      setLoading(true)
      try {
        const dashboardResponse = await authAPI.getDashboard()
        setUser(dashboardResponse.data.user)
        setIsAuthenticated(true)
      } catch (err) {
        localStorage.removeItem('access_token')
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    initializeUser()
  }, [])

  const login = useCallback(async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const response = await authAPI.login(username, password)
      const { access_token } = response.data
      localStorage.setItem('access_token', access_token)
      setIsAuthenticated(true)
      return true
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
      setIsAuthenticated(false)
      localStorage.removeItem('access_token')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
