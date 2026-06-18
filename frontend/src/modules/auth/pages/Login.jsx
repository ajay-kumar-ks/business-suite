import React from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Card from '../../../components/ui/Card'
import ThemeToggle from '../../../components/ui/ThemeToggle'
import Loader from '../../../components/ui/Loader'
import '../../../styles/Login.css'

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = React.useState('admin')
  const [password, setPassword] = React.useState('admin')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const success = await login(username, password)
    if (success) {
      if (onLoginSuccess) onLoginSuccess()
      else navigate('/dashboard')
    } else {
      setError('Invalid username or password')
    }
    setLoading(false)
  }

  return (
    <div className="login-viewport">
      <div className="login-left">
        <div className="brand-wrap">
          <h1 className="brand">Business Suite</h1>
          <p className="tagline">Complete company management — HR, CRM, Tasks, Accounts.</p>
        </div>
      </div>

      <div className="login-right">
        <Card className="login-card-new">
          <div className="login-top">
            <h2>Welcome back</h2>
            <ThemeToggle />
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <Input id="username" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <div className="login-actions">
              <label className="remember">
                <input type="checkbox" /> Remember me
              </label>
              <a className="forgot" href="#">Forgot password?</a>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader size={16} /> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default Login
