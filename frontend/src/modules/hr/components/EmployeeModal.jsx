import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import '../styles/HRPage.css'

const EMPTY_FORM = {
  user_id: '',
  employee_code: '',
  phone: '',
  joining_date: '',
  salary: '',
  status: 'Active',
}

const EmployeeModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  users = [],
}) => {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEditing = !!initialData

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          user_id: initialData.user_id?.toString() || '',
          employee_code: initialData.employee_code || '',
          phone: initialData.phone || '',
          joining_date: initialData.joining_date
            ? initialData.joining_date.split('T')[0]
            : '',
          salary: initialData.salary?.toString() || '',
          status: initialData.status || 'Active',
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.user_id) {
      setError('Please select a user')
      return
    }

    const payload = {
      user_id: parseInt(form.user_id, 10),
      employee_code: form.employee_code || undefined,
      phone: form.phone || undefined,
      joining_date: form.joining_date || undefined,
      salary: form.salary ? parseFloat(form.salary) : undefined,
      status: form.status,
    }

    setSaving(true)
    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to save employee')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Employee' : 'Add Employee'}</h3>
          <button className="modal-close" onClick={onClose} type="button" title="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="user_id">User *</label>
              <select
                id="user_id"
                value={form.user_id}
                onChange={handleChange('user_id')}
                disabled={isEditing}
                required
              >
                <option value="">Select a user...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.username} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <Input
                label="Employee Code"
                id="employee_code"
                value={form.employee_code}
                onChange={handleChange('employee_code')}
                placeholder="Auto-generated if empty"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <Input
                label="Phone"
                id="phone"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={handleChange('status')}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Resigned">Resigned</option>
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
              {saving ? 'Saving...' : isEditing ? 'Update Employee' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmployeeModal
