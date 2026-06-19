import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Button from '../../../components/ui/Button'
import '../styles/HRPage.css'

const EMPTY_FORM = {
  username: '',
  email: '',
  full_name: '',
  password: '',
  is_admin: false,
}

const UserModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM)
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleChange = (field) => (e) => {
    const value = field === 'is_admin' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.username.trim()) {
      setError('Username is required')
      return
    }
    if (!form.email.trim()) {
      setError('Email is required')
      return
    }
    if (!form.password) {
      setError('Password is required')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    const payload = {
      username: form.username.trim(),
      email: form.email.trim(),
      full_name: form.full_name.trim() || form.username.trim(),
      password: form.password,
      is_admin: form.is_admin,
    }

    setSaving(true)
    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create User</h3>
          <button className="modal-close" onClick={onClose} type="button" title="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                id="username"
                type="text"
                value={form.username}
                onChange={handleChange('username')}
                placeholder="e.g. john"
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                type="text"
                value={form.full_name}
                onChange={handleChange('full_name')}
                placeholder="e.g. John Doe"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="e.g. john@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.is_admin}
                  onChange={handleChange('is_admin')}
                />
                <span>Admin privileges</span>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserModal
