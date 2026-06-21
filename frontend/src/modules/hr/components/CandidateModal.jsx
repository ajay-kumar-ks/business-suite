import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import '../styles/HRPage.css'

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  role_id: '',
  position_applied: '',
  experience_years: '',
  notes: '',
}

const CandidateModal = ({ isOpen, onClose, onSave, initialData, roles = [] }) => {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEditing = !!initialData

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          full_name: initialData.full_name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          role_id: initialData.role_id?.toString() || '',
          position_applied: initialData.position_applied || '',
          experience_years: initialData.experience_years?.toString() || '',
          notes: initialData.notes || '',
        })
      } else {
        setForm(EMPTY_FORM)
      }
      setError('')
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (error) setError('')
  }

  const handleRoleChange = (e) => {
    const selectedRoleId = e.target.value
    const selectedRole = roles.find((r) => r.id.toString() === selectedRoleId)
    setForm((prev) => ({
      ...prev,
      role_id: selectedRoleId,
      // Auto-fill position from role name
      position_applied: selectedRole ? selectedRole.name : prev.position_applied,
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.full_name.trim()) {
      setError('Full name is required')
      return
    }
    if (!form.email.trim()) {
      setError('Email is required')
      return
    }
    if (!form.position_applied.trim()) {
      setError('Position applied is required')
      return
    }

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      role_id: form.role_id ? parseInt(form.role_id, 10) : undefined,
      position_applied: form.position_applied.trim(),
      experience_years: parseFloat(form.experience_years) || 0,
      notes: form.notes.trim() || null,
    }

    setSaving(true)
    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || `Failed to ${isEditing ? 'update' : 'create'} candidate`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Candidate' : 'Add Candidate'}</h3>
          <button className="modal-close" onClick={onClose} type="button" title="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="full_name">Full Name *</label>
              <input
                id="full_name"
                type="text"
                value={form.full_name}
                onChange={handleChange('full_name')}
                placeholder="e.g. Ajay Kumar"
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="e.g. ajay@example.com"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="text"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="e.g. +1 234 567 890"
              />
            </div>
            <div className="form-group">
              <label htmlFor="role_id">Role / Position</label>
              <select
                id="role_id"
                value={form.role_id}
                onChange={handleRoleChange}
                disabled={isEditing}
              >
                <option value="">Select a role (auto-fills pipeline)...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="position_applied">Position Applied *</label>
              <input
                id="position_applied"
                type="text"
                value={form.position_applied}
                onChange={handleChange('position_applied')}
                placeholder="e.g. Software Developer"
                required
              />
            </div>
            <div className="form-group">
              <Input
                label="Experience (Years)"
                id="experience_years"
                type="number"
                step="0.5"
                min="0"
                value={form.experience_years}
                onChange={handleChange('experience_years')}
                placeholder="e.g. 3"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={handleChange('notes')}
              placeholder="Additional notes about the candidate..."
              rows={3}
              style={{
                padding: '10px 12px',
                border: '1px solid var(--border, #d1d5db)',
                borderRadius: 8,
                fontSize: '0.9rem',
                background: 'var(--card-bg, #ffffff)',
                color: 'var(--text, #1e293b)',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Candidate' : 'Add Candidate'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CandidateModal
