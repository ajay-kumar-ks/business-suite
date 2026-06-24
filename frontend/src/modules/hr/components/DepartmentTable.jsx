import React, { useState } from 'react'
import { Pencil, Trash2, Plus, X, UserPlus, Eye, UserMinus, Check } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { hrAPI } from '../services/hrApi'
import '../styles/HRPage.css'

const DepartmentTable = ({ departments = [], loading, onRefresh, allEmployees = [] }) => {
  // ── Add/Edit Department Modal ──
  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── View Members Modal ──
  const [viewDept, setViewDept] = useState(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)

  // ── Add Employee Modal ──
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addTargetDept, setAddTargetDept] = useState(null)
  const [addForm, setAddForm] = useState({ employee_id: '', department_id: '' })
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  // ── Helpers ──
  const getEmployeeCount = (deptId) =>
    allEmployees.filter((e) => e.department_id === deptId).length

  const getEmployeesInDept = (deptId) =>
    allEmployees.filter((e) => e.department_id === deptId)

  // ── Add/Edit Department Modal ──
  const openAddDeptModal = () => {
    setEditingDept(null)
    setForm({ name: '', description: '' })
    setError('')
    setDeptModalOpen(true)
  }

  const openEditDeptModal = (dept) => {
    setEditingDept(dept)
    setForm({ name: dept.name, description: dept.description || '' })
    setError('')
    setDeptModalOpen(true)
  }

  const closeDeptModal = () => {
    setDeptModalOpen(false)
    setEditingDept(null)
    setForm({ name: '', description: '' })
    setError('')
  }

  const handleSaveDept = async (e) => {
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
      closeDeptModal()
      onRefresh()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to save department')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──
  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"?`)) return
    try {
      await hrAPI.deleteDepartment(dept.id)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete department')
    }
  }

  // ── View Members ──
  const openViewModal = (dept) => {
    setViewDept(dept)
    setViewModalOpen(true)
  }

  const closeViewModal = () => {
    setViewModalOpen(false)
    setViewDept(null)
  }

  const handleRemoveEmployee = async (employee) => {
    if (!window.confirm(`Remove ${employee.user_name || `Employee #${employee.id}`} from ${viewDept?.name}?`)) return
    try {
      await hrAPI.updateEmployee(employee.id, { department_id: null })
      onRefresh()
      // Refresh the view modal data
      setViewDept((prev) => prev ? { ...prev } : null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove employee')
    }
  }

  // ── Add Employee Modal ──
  const openAddModal = (dept) => {
    setAddTargetDept(dept)
    setAddForm({ employee_id: '', department_id: dept.id.toString() })
    setAddError('')
    setAddModalOpen(true)
  }

  const closeAddModal = () => {
    setAddModalOpen(false)
    setAddTargetDept(null)
    setAddForm({ employee_id: '', department_id: '' })
    setAddError('')
  }

  const handleAddEmployee = async (e) => {
    e.preventDefault()
    if (!addForm.employee_id) {
      setAddError('Please select an employee')
      return
    }
    if (!addForm.department_id) {
      setAddError('Please select a department')
      return
    }

    setAddSaving(true)
    setAddError('')
    try {
      await hrAPI.updateEmployee(parseInt(addForm.employee_id, 10), {
        department_id: parseInt(addForm.department_id, 10),
      })
      closeAddModal()
      onRefresh()
    } catch (err) {
      setAddError(err.response?.data?.detail || err.message || 'Failed to add employee')
    } finally {
      setAddSaving(false)
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
      {/* ════════════════════════════════════════
          Add/Edit Department Modal
          ════════════════════════════════════════ */}
      {deptModalOpen && (
        <div className="modal-overlay" onClick={closeDeptModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{editingDept ? 'Edit Department' : 'Create Department'}</h3>
              <button className="modal-close" onClick={closeDeptModal} type="button" title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveDept} className="modal-form">
              {error && <div className="form-error">{error}</div>}
              <div className="form-group" style={{ marginBottom: 16 }}>
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
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="dept_desc">Description</label>
                <input
                  id="dept_desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={closeDeptModal}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : editingDept ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          View Members Modal
          ════════════════════════════════════════ */}
      {viewModalOpen && viewDept && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <h3>{viewDept.name} — Members</h3>
              <button className="modal-close" onClick={closeViewModal} type="button" title="Close">
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {viewDept.description && (
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px' }}>
                  {viewDept.description}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="count-badge">{getEmployeeCount(viewDept.id)} employees</span>
                <Button size="sm" variant="secondary" onClick={() => { closeViewModal(); openAddModal(viewDept) }}>
                  <UserPlus size={14} style={{ marginRight: 4 }} />
                  Add Employee
                </Button>
              </div>

              {getEmployeeCount(viewDept.id) === 0 ? (
                <div className="dept-empty-members" style={{ border: '1px dashed #d1d5db', borderRadius: 8, padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                  No employees in this department yet
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Code</th>
                        <th>Status</th>
                        <th style={{ width: 60 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {getEmployeesInDept(viewDept.id).map((emp) => (
                        <tr key={emp.id}>
                          <td className="name-cell">{emp.user_name || `User #${emp.user_id}`}</td>
                          <td className="code-cell">{emp.employee_code}</td>
                          <td>
                            <span
                              className="status-badge"
                              style={{
                                backgroundColor:
                                  emp.status === 'Active' ? '#22c55e' :
                                  emp.status === 'Inactive' ? '#9ca3af' : '#ef4444',
                              }}
                            >
                              {emp.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="action-btn delete"
                              onClick={() => handleRemoveEmployee(emp)}
                              title="Remove from department"
                              type="button"
                            >
                              <UserMinus size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border, #e2e8f0)', textAlign: 'right' }}>
              <Button variant="secondary" onClick={closeViewModal}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          Add Employee Modal
          ════════════════════════════════════════ */}
      {addModalOpen && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Add Employee to Department</h3>
              <button className="modal-close" onClick={closeAddModal} type="button" title="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="modal-form">
              {addError && <div className="form-error">{addError}</div>}

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="add_employee">Select Employee *</label>
                <select
                  id="add_employee"
                  value={addForm.employee_id}
                  onChange={(e) => setAddForm({ ...addForm, employee_id: e.target.value })}
                  required
                >
                  <option value="">Choose an employee...</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.user_name || `User #${emp.user_id}`} ({emp.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="add_department">Assign to Department *</label>
                <select
                  id="add_department"
                  value={addForm.department_id}
                  onChange={(e) => setAddForm({ ...addForm, department_id: e.target.value })}
                  required
                >
                  <option value="">Choose a department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({getEmployeeCount(d.id)} employees)
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={closeAddModal}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={addSaving}>
                  {addSaving ? 'Adding...' : (
                    <>
                      <Check size={15} style={{ marginRight: 5 }} />
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          Department List
          ════════════════════════════════════════ */}
      {!departments.length ? (
        <div className="table-status empty">
          <span>No departments defined yet.</span>
          <Button variant="primary" onClick={openAddDeptModal}>
            <Plus size={16} style={{ marginRight: 4 }} />
            Add First Department
          </Button>
        </div>
      ) : (
        <div>
          <div className="inline-table-header">
            <span className="count-badge">{departments.length} departments</span>
            <Button variant="primary" size="sm" onClick={openAddDeptModal}>
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
                  <th>Employees</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id}>
                    <td className="name-cell">{dept.name}</td>
                    <td>{dept.description || '—'}</td>
                    <td>
                      <span className="count-badge">{getEmployeeCount(dept.id)}</span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="action-btn view"
                        onClick={() => openViewModal(dept)}
                        title="View members"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() => openEditDeptModal(dept)}
                        title="Edit department"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="action-btn approve"
                        onClick={() => openAddModal(dept)}
                        title="Add employee to department"
                      >
                        <UserPlus size={16} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(dept)}
                        title="Delete department"
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
