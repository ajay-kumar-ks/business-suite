import React, { useState, useEffect } from 'react'
import { X, Info } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import '../styles/HRPage.css'

const ConvertToEmployeeModal = ({ isOpen, onClose, onConvert, candidate, departments = [], roles = [] }) => {
  const [form, setForm] = useState({
    department_id: '',
    role_id: '',
    employee_code: '',
    phone: '',
    joining_date: new Date().toISOString().split('T')[0],
    salary: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && candidate) {
      setForm({
        department_id: '',
        role_id: candidate.role_id?.toString() || '',
        employee_code: '',
        phone: candidate.phone || '',
        joining_date: new Date().toISOString().split('T')[0],
        salary: '',
      })
      setError('')
    }
  }, [isOpen, candidate])

  if (!isOpen || !candidate) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const payload = {
      department_id: form.department_id ? parseInt(form.department_id, 10) : undefined,
      role_id: form.role_id ? parseInt(form.role_id, 10) : undefined,
      employee_code: form.employee_code || undefined,
      phone: form.phone || undefined,
      joining_date: form.joining_date || undefined,
      salary: form.salary ? parseFloat(form.salary) : undefined,
    }

    setSaving(true)
    try {
      await onConvert(candidate.id, payload)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to convert candidate')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3>Convert to Employee</h3>
          <button className="modal-close" onClick={onClose} type="button" title="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem', color: '#16a34a' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                Converting <strong>{candidate.full_name}</strong> to an employee for <strong>{candidate.position_applied}</strong> position.
                <br /><br />
                <strong>Note:</strong> An employee record will be created. A user account will NOT be automatically created — use <strong>User Management</strong> to create login credentials separately.
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="employee_code">Employee Code</label>
              <input
                id="employee_code"
                type="text"
                value={form.employee_code}
                onChange={handleChange('employee_code')}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="text"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="Candidate phone"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="department_id">Department</label>
              <select
                id="department_id"
                value={form.department_id}
                onChange={handleChange('department_id')}
              >
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="role_id">Role</label>
              <select
                id="role_id"
                value={form.role_id}
                onChange={handleChange('role_id')}
              >
                <option value="">None</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <Input
                label="Joining Date"
                id="joining_date"
                type="date"
                value={form.joining_date}
                onChange={handleChange('joining_date')}
              />
            </div>
            <div className="form-group">
              <Input
                label="Salary"
                id="salary"
                type="number"
                step="0.01"
                value={form.salary}
                onChange={handleChange('salary')}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Converting...' : 'Convert to Employee'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ConvertToEmployeeModal
