import React, { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Loader from '../../../components/ui/Loader'
import Select from '../../../components/ui/Select'
import { hrAPI } from '../../hr/services/hrApi'
import '../styles/LeadsView.css'

const LeadForm = ({ contact = null, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    contact_id: contact?.id || '',
    pipeline_id: '',
    phase_id: '',
    value: '',
    expected_close_date: '',
    assignee_id: '',
    source: '',
    notes: '',
  })
  const [pipelines, setPipelines] = useState([])
  const [phases, setPhases] = useState([])
  const [employees, setEmployees] = useState([])
  const [employeeLoading, setEmployeeLoading] = useState(true)
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const employeeDropdownRef = useRef(null)

  useEffect(() => {
    if (contact) {
      setFormData((prev) => ({
        ...prev,
        contact_id: contact.id,
        title: `${contact.name} Opportunity`,
      }))
    }
    fetchPipelines()
    fetchEmployees()
  }, [contact])

  useEffect(() => {
    if (formData.pipeline_id) {
      fetchPhases(formData.pipeline_id)
    } else {
      setPhases([])
      setFormData((prev) => ({ ...prev, phase_id: '' }))
    }
  }, [formData.pipeline_id])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target)) {
        setEmployeeDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/crm/pipelines/')
      if (!response.ok) throw new Error('Failed to fetch pipelines')
      const data = await response.json()
      setPipelines(data)
    } catch (error) {
      console.error('Failed to fetch pipelines:', error)
    }
  }

  const fetchPhases = async (pipelineId) => {
    try {
      const response = await fetch(`/api/crm/pipelines/${pipelineId}/phases`)
      if (!response.ok) throw new Error('Failed to fetch phases')
      const data = await response.json()
      setPhases(data)
    } catch (error) {
      console.error('Failed to fetch phases:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      setEmployeeLoading(true)
      const response = await hrAPI.getEmployees({ status: 'Active', limit: 100 })
      setEmployees(response.data.employees || [])
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      setEmployees([])
    } finally {
      setEmployeeLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const selectedEmployee = useMemo(
    () => employees.find((emp) => String(emp.id) === String(formData.assignee_id)),
    [employees, formData.assignee_id]
  )

  const roleColorFor = (role) => {
    const roleColors = ['#60a5fa', '#f472b6', '#34d399', '#f59e0b', '#a78bfa', '#f97316', '#22c55e']
    if (!role) return '#94a3b8'
    const index = Array.from(role).reduce((acc, char) => acc + char.charCodeAt(0), 0) % roleColors.length
    return roleColors[index]
  }

  const handleAssigneeSelect = (employee) => {
    setFormData((prev) => ({ ...prev, assignee_id: employee.id }))
    setErrors((prev) => ({ ...prev, assignee_id: '' }))
    setEmployeeDropdownOpen(false)
  }

  const validateForm = () => {
    const nextErrors = {}
    if (!formData.title.trim()) nextErrors.title = 'Title is required'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    try {
      const selectedEmployee = employees.find(
        (emp) => String(emp.id) === String(formData.assignee_id)
      )
      const response = await fetch('/api/crm/leads/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          contact_id: formData.contact_id || null,
          pipeline_id: formData.pipeline_id || null,
          phase_id: formData.phase_id || null,
          value: formData.value ? Number(formData.value) : undefined,
          expected_close_date: formData.expected_close_date || null,
          assignee: selectedEmployee
            ? selectedEmployee.user_name || selectedEmployee.full_name || String(selectedEmployee.id)
            : null,
          source: formData.source || null,
          notes: formData.notes || null,
        }),
      })
      if (!response.ok) throw new Error('Failed to save lead')
      const saved = await response.json()
      onSave(saved)
    } catch (error) {
      console.error(error)
      setErrors({ submit: 'Unable to save lead. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lead-form-panel">
      <div className="lead-form-title">
        <h3>{contact ? 'New Lead from Contact' : 'New Lead'}</h3>
        <button type="button" className="close-btn" onClick={onCancel}>
          <X size={18} />
        </button>
      </div>
      <form className="lead-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <Input
            label="Lead Title *"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            required
          />
        </div>

        <div className="form-row two-col">
          <Select
            label="Pipeline"
            name="pipeline_id"
            value={formData.pipeline_id}
            onChange={handleChange}
            options={[
              { value: '', label: 'Select Pipeline...' },
              ...pipelines.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <Select
            label="Phase"
            name="phase_id"
            value={formData.phase_id}
            onChange={handleChange}
            disabled={!formData.pipeline_id}
            options={[
              { value: '', label: 'Select Phase...' },
              ...phases.map((ph) => ({ value: ph.id, label: ph.name })),
            ]}
          />
        </div>

        <div className="form-row two-col">
          <Input
            label="Value"
            name="value"
            type="number"
            value={formData.value}
            onChange={handleChange}
          />
          <Input
            label="Expected Close Date"
            name="expected_close_date"
            type="date"
            value={formData.expected_close_date}
            onChange={handleChange}
          />
        </div>

        <div className="form-row two-col">
          <div className="custom-select-wrapper" ref={employeeDropdownRef}>
            <label className="custom-select-label">Assignee</label>
            <button
              type="button"
              className={`custom-select-trigger ${employeeDropdownOpen ? 'open' : ''}`}
              onClick={() => setEmployeeDropdownOpen((prev) => !prev)}
            >
              <span className={`custom-select-value ${selectedEmployee ? '' : 'placeholder'}`}>
                {selectedEmployee ? (
                  <>
                    <span>{selectedEmployee.user_name || selectedEmployee.full_name || `Employee #${selectedEmployee.id}`}</span>
                    {selectedEmployee.role_name && (
                      <span
                        className="custom-role-chip"
                        style={{ backgroundColor: roleColorFor(selectedEmployee.role_name) }}
                      >
                        {selectedEmployee.role_name}
                      </span>
                    )}
                  </>
                ) : (
                  'Select assignee...'
                )}
              </span>
            </button>
            {employeeDropdownOpen && (
              <div className="custom-select-menu">
                {employeeLoading ? (
                  <div className="custom-select-loading">
                    <Loader size={20} />
                    <span>Loading employees...</span>
                  </div>
                ) : employees.length === 0 ? (
                  <div className="custom-select-empty">No employees available</div>
                ) : (
                  employees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      className={`custom-select-item ${String(emp.id) === String(formData.assignee_id) ? 'selected' : ''}`}
                      onClick={() => handleAssigneeSelect(emp)}
                    >
                      <div className="custom-select-item-main">
                        <span className="custom-select-item-name">
                          {emp.user_name || emp.full_name || `Employee #${emp.id}`}
                        </span>
                        {emp.role_name && (
                          <span
                            className="custom-role-chip"
                            style={{ backgroundColor: roleColorFor(emp.role_name) }}
                          >
                            {emp.role_name}
                          </span>
                        )}
                      </div>
                      <span className="custom-select-item-subtitle">
                        {emp.department_name || emp.department || emp.email || ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <Input
            label="Source"
            name="source"
            value={formData.source}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <Input
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
          />
        </div>

        <div className="form-actions">
          <Button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Lead'}
          </Button>
        </div>

        {errors.submit && <div className="form-error">{errors.submit}</div>}
      </form>
    </div>
  )
}

export default LeadForm
