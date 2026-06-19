import React, { useState } from 'react'
import { Pencil, Trash2, Plus, X } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { hrAPI } from '../services/hrApi'
import '../styles/HRPage.css'

const DepartmentTable = ({ departments = [], loading, onRefresh }) => {
  const [editingDept, setEditingDept] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setForm({ name: '', description: '' })
    setEditingDept(null)
    setShowForm(false)
    setError('')
  }

  const handleAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (dept) => {
    setEditingDept(dept)
    setForm({ name: dept.name, description: dept.description || '' })
    setShowForm(true)
    setError('')
  }

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"?`)) return
    try {
      await hrAPI.deleteDepartment(dept.id)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete department')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Department name is required')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (editingDept) {
        await hrAPI.updateDepartment(editingDept.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
        })
      } else {
        await hrAPI.createDepartment({
          name: form.name.trim(),
          description: form.description.trim() || null,
        })
      }
      resetForm()
      onRefresh()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to save department')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="table-status">
        <div className="spinner" />
        <span>Loading departments...</span>
      </div>
    )
  }

  return (
    <div className="dept-management">
      {showForm && (
        <div className="inline-form">
          <div className="inline-form-header">
            <h4>{editingDept ? 'Edit Department' : 'Create Department'}</h4>
            <button className="modal-close" onClick={resetForm} type="button" title="Close">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="inline-form-body">
            {error && <div className="form-error">{error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dept_name">Name *</label>
                <input
                  id="dept_name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Development"
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="dept_desc">Description</label>
                <input
                  id="dept_desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : editingDept ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {!departments.length && !showForm ? (
        <div className="table-status empty">
          <span>No departments defined yet.</span>
          <Button variant="primary" onClick={handleAdd}>
            <Plus size={16} style={{ marginRight: 4 }} />
            Add First Department
          </Button>
        </div>
      ) : (
        <div>
          <div className="inline-table-header">
            <span className="count-badge">{departments.length} departments</span>
            <Button variant="primary" size="sm" onClick={handleAdd}>
              <Plus size={16} style={{ marginRight: 4 }} />
              Add Department
            </Button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id}>
                    <td className="name-cell">{dept.name}</td>
                    <td>{dept.description || '—'}</td>
                    <td className="actions-cell">
                      <button
                        className="action-btn edit"
                        onClick={() => handleEdit(dept)}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(dept)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default DepartmentTable
