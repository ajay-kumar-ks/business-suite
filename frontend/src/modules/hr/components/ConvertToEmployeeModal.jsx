import React, { useState, useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { recruitmentAPI } from '../services/recruitmentApi'

const ConvertToEmployeeModal = ({ isOpen, onClose, candidate, onConverted }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Pre-fill username suggestion from email when modal opens
  useEffect(() => {
    if (isOpen && candidate?.email) {
      const suggested = candidate.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '')
      setUsername(suggested || '')
    } else if (isOpen && candidate?.full_name) {
      const suggested = candidate.full_name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._]/g, '')
      setUsername(suggested || '')
    }
    // Reset fields on open
    setPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
    setConverting(false)
  }, [isOpen, candidate])

  if (!isOpen || !candidate) return null

  const handleConvert = async () => {
    // Validate
    if (!username.trim()) {
      setError('Username is required')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setConverting(true)
    setError('')
    try {
      await recruitmentAPI.convertToEmployee(candidate.id, {
        username: username.trim(),
        password,
      })
      setSuccess(true)
      if (onConverted) onConverted(candidate)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to convert candidate to employee')
    } finally {
      setConverting(false)
    }
  }

  const handleClose = () => {
    if (!converting) {
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>{success ? 'Employee Created' : 'Convert to Employee'}</h3>
          <button className="modal-close" onClick={handleClose} type="button" title="Close">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: '20px 24px', textAlign: 'center' }}>
            <CheckCircle2 size={48} style={{ color: '#22c55e', marginBottom: 12 }} />
            <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>
              {candidate.full_name} has been converted!
            </h4>
            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              An employee record and login account have been created.
            </p>

            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: '14px 16px',
              marginBottom: 12,
              textAlign: 'left',
            }}>
              <h5 style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Login Account Created
              </h5>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.8 }}>
                <div><strong style={{ color: '#374151' }}>Username:</strong> <code style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>{username}</code></div>
                <div><strong style={{ color: '#374151' }}>Email:</strong> {candidate.email || '—'}</div>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: '0.85rem',
              color: '#16a34a',
              textAlign: 'left',
            }}>
              <strong>Candidate status:</strong> Converted (still visible in recruitment history)
            </div>

            <div style={{ marginTop: 20 }}>
              <Button variant="primary" onClick={handleClose}>
                Got it
              </Button>
            </div>
          </div>
        ) : (
          <div className="modal-form" style={{ padding: '20px 24px' }}>
            {error && (
              <div className="form-error" style={{ marginBottom: 12 }}>
                <AlertCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {error}
              </div>
            )}

            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              This will create an Employee record and a login account for <strong>{candidate.full_name}</strong>.
            </p>

            {/* Candidate Preview */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
            }}>
              <table style={{ width: '100%', fontSize: '0.85rem' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#64748b', padding: '4px 8px 4px 0' }}>Name</td>
                    <td style={{ fontWeight: 600 }}>{candidate.full_name}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#64748b', padding: '4px 8px 4px 0' }}>Email</td>
                    <td>{candidate.email}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#64748b', padding: '4px 8px 4px 0' }}>Phone</td>
                    <td>{candidate.phone || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#64748b', padding: '4px 8px 4px 0' }}>Department</td>
                    <td>{candidate.department_name || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Login Credentials Form */}
            <h5 style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <UserPlus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Login Account Details
            </h5>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="conv_username">Username *</label>
                <input
                  id="conv_username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); if (error) setError('') }}
                  placeholder="e.g. john.doe"
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="conv_email">Email</label>
                <input
                  id="conv_email"
                  type="email"
                  value={candidate.email || ''}
                  disabled
                  style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="conv_password">Password *</label>
                <input
                  id="conv_password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="conv_confirm">Confirm Password *</label>
                <input
                  id="conv_confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                  placeholder="Re-enter password"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <Button variant="secondary" onClick={handleClose} disabled={converting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConvert}
                disabled={converting || !username.trim() || !password || !confirmPassword}
              >
                {converting ? 'Converting...' : (
                  <>
                    <UserPlus size={14} style={{ marginRight: 4 }} />
                    Convert to Employee
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConvertToEmployeeModal
