import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Pencil, Trash2, Plus, X, UserMinus, UserPlus, ChevronDown } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { hrAPI } from '../services/hrApi'
import '../styles/HRPage.css'

const DepartmentTable = ({ departments = [], loading, onRefresh, allEmployees = [] }) => {
  const [editingDept, setEditingDept] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── Employee management state ──
  const [deptEmployees, setDeptEmployees] = useState([])
  const [deptEmpLoading, setDeptEmpLoading] = useState(false)
  const [addDropdownOpen, setAddDropdownOpen] = useState(false)
  const addDropdownRef = useRef(null)

  // Close add dropdown on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target)) {
        setAddDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch department employees when a department is being edited
  const fetchDeptEmployees = useCallback(async (deptId) => {
    setDeptEmpLoading(true)
    try {
      const res = await hrAPI.getEmployeesByDepartment(deptId)
      setDeptEmployees(res.data?.employees || [])
    } catch (err) {
      console.error('Failed to fetch department employees:', err)
      setDeptEmployees([])
    } finally {
      setDeptEmpLoading(false)
    }
  }, [])

  const resetForm = () => {
    setForm({ name: '', description: '' })
    setEditingDept(null)
    setShowForm(false)
    setError('')
    setDeptEmployees([])
    setAddDropdownOpen(false)
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
    setAddDropdownOpen(false)
    fetchDeptEmployees(dept.id)
  }

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"?`)) return
    try {
      await hrAPI.deleteDepartment(dept.id)
      onRefresh()
      if (editingDept?.id === dept.id) resetForm()
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

  // ── Employee management actions ──

  const handleRemoveEmployee = async (employee) => {
    if (!window.confirm(`Remove ${employee.user_name || `Employee #${employee.id}`} from this department?`)) return
    try {
      await hrAPI.updateEmployee(employee.id, { department_id: null })
      fetchDeptEmployees(editingDept.id)
      onRefresh() // refresh departments + employees
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove employee')
    }
  }

  const handleAddEmployee = async (employeeId) => {
    if (!editingDept) return
    try {
      await hrAPI.updateEmployee(employeeId, { department_id: editingDept.id })
      fetchDeptEmployees(editingDept.id)
      onRefresh()
      setAddDropdownOpen(false)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add employee')
    }
  }

  // Employees not currently in this department (for the add dropdown)
  const availableEmployees = allEmployees.filter(
    (emp) => emp.department_id !== editingDept?.id
  )

  // Count employees per department
  const getEmployeeCount = (deptId) =>
    allEmployees.filter((e) => e.department_id === deptId).length

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

          {/* ── Employee Management Section ── */}
          {editingDept && (
            <div className="dept-employees-section">
              <h4 className="dept-employees-header">
                <UserPlus size={16} />
                Department Members
                <span className="count-badge">{deptEmployees.length}</span>
              </h4>

              {/* Add Employee */}
              <div className="dept-add-wrapper" ref={addDropdownRef}>
                <button
                  type="button"
                  className="dept-add-trigger"
                  onClick={() => setAddDropdownOpen(!addDropdownOpen)}
                >
                  <UserPlus size={15} />
                  Add employee to department
                  <ChevronDown size={14} className={`chevron ${addDropdownOpen ? 'open' : ''}`} />
                </button>

                {addDropdownOpen && (
                  <div className="dept-add-dropdown">
                    {availableEmployees.length === 0 ? (
                      <div className="dept-empty-members">
                        All employees are already in this department
                      </div>
                    ) : (
                      availableEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          className="dept-add-item"
                          onClick={() => handleAddEmployee(emp.id)}
                        >
                          <UserPlus size={14} className="dept-add-item-icon" />
                          <span style={{ fontWeight: 500 }}>{emp.user_name || `User #${emp.user_id}`}</span>
                          <span className="dept-add-item-code">
                            {emp.employee_code}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Employee list */}
              {deptEmpLoading ? (
                <div className="table-status" style={{ padding: '20px' }}>
                  <div className="spinner" />
                  <span>Loading members...</span>
                </div>
              ) : deptEmployees.length === 0 ? (
                <div className="dept-empty-members">
                  No employees in this department yet
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Code</th>
                        <th>Role</th>
                        <th style={{ width: 70 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deptEmployees.map((emp) => (
                        <tr key={emp.id}>
                          <td className="name-cell">{emp.user_name || `User #${emp.user_id}`}</td>
                          <td className="code-cell">{emp.employee_code}</td>
                          <td>{emp.role_name || '—'}</td>
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
          )}
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
                  <th>Employees</th>
                  <th>Actions</th>
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
                        className="action-btn edit"
                        onClick={() => handleEdit(dept)}
                        title="Edit department & manage members"
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
