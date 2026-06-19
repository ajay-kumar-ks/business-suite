import React, { useState } from 'react'
import { Pencil, Trash2, Plus, X } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { hrAPI } from '../services/hrApi'
import '../styles/HRPage.css'

const RoleTable = ({ roles = [], loading, onRefresh }) => {
  const [editingRole, setEditingRole] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setForm({ name: '', description: '' })
    setEditingRole(null)
    setShowForm(false)
    setError('')
  }

  const handleAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (role) => {
    setEditingRole(role)
    setForm({ name: role.name, description: role.description || '' })
    setShowForm(true)
    setError('')
  }

  const handleDelete = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"?`)) return
    try {
      await hrAPI.deleteRole(role.id)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete role')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Role name is required')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (editingRole) {
        await hrAPI.updateRole(editingRole.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
        })
      } else {
        await hrAPI.createRole({
          name: form.name.trim(),
          description: form.description.trim() || null,
        })
      }
      resetForm()
      onRefresh()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to save role')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="table-status">
        <div className="spinner" />
        <span>Loading roles...</span>
      </div>
    )
  }

  return (
    <div className="role-management">
      {showForm && (
        <div className="inline-form">
          <div className="inline-form-header">
            <h4>{editingRole ? 'Edit Role' : 'Create Role'}</h4>
            <button className="modal-close" onClick={resetForm} type="button" title="Close">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="inline-form-body">
            {error && <div className="form-error">{error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="role_name">Name *</label>
                <input
                  id="role_name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Developer"
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="role_desc">Description</label>
                <input
                  id="role_desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : editingRole ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {!roles.length && !showForm ? (
        <div className="table-status empty">
          <span>No roles defined yet.</span>
          <Button variant="primary" onClick={handleAdd}>
            <Plus size={16} style={{ marginRight: 4 }} />
            Add First Role
          </Button>
        </div>
      ) : (
        <div>
          <div className="inline-table-header">
            <span className="count-badge">{roles.length} roles</span>
            <Button variant="primary" size="sm" onClick={handleAdd}>
              <Plus size={16} style={{ marginRight: 4 }} />
              Add Role
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
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td className="name-cell">{role.name}</td>
                    <td>{role.description || '—'}</td>
                    <td className="actions-cell">
                      <button
                        className="action-btn edit"
                        onClick={() => handleEdit(role)}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(role)}
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

export default RoleTable
