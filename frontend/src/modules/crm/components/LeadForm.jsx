import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { X, ChevronDown, Sparkles } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Loader from '../../../components/ui/Loader'
import { hrAPI } from '../../hr/services/hrApi'
import { crmAPI } from '../../../services/api'
import api from '../../../services/api'
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
  const [pipelineDropdownOpen, setPipelineDropdownOpen] = useState(false)
  const [phaseDropdownOpen, setPhaseDropdownOpen] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const employeeDropdownRef = useRef(null)
  const pipelineDropdownRef = useRef(null)
  const phaseDropdownRef = useRef(null)

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

  // Fetch AI assignee suggestions when form data changes
  const fetchAISuggestions = useCallback(async () => {
    if (!formData.pipeline_id || !formData.title.trim()) {
      setAiSuggestions([])
      return
    }
    setAiLoading(true)
    try {
      const res = await api.post('/crm/ai/suggest-assignee', {
        title: formData.title,
        value: formData.value ? Number(formData.value) : null,
        source: formData.source || null,
        notes: formData.notes || null,
        pipeline_id: formData.pipeline_id,
        contact_company: contact?.company || '',
      })
      setAiSuggestions(res.data.suggestions || [])
    } catch (e) {
      console.error('AI suggest error:', e)
      setAiSuggestions([])
    } finally {
      setAiLoading(false)
    }
  }, [formData.title, formData.value, formData.source, formData.notes, formData.pipeline_id])

  // Debounced AI suggestion fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAISuggestions()
    }, 600)
    return () => clearTimeout(timer)
  }, [fetchAISuggestions])

  // Click outside handlers for all three dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target)) {
        setEmployeeDropdownOpen(false)
      }
      if (pipelineDropdownRef.current && !pipelineDropdownRef.current.contains(event.target)) {
        setPipelineDropdownOpen(false)
      }
      if (phaseDropdownRef.current && !phaseDropdownRef.current.contains(event.target)) {
        setPhaseDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchPipelines = async () => {
    try {
      const response = await crmAPI.listPipelines()
      setPipelines(response.data)
    } catch (error) {
      console.error('Failed to fetch pipelines:', error)
    }
  }

  const fetchPhases = async (pipelineId) => {
    try {
      const response = await crmAPI.getPhases(pipelineId)
      setPhases(response.data)
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

  const selectedPipeline = useMemo(
    () => pipelines.find((p) => String(p.id) === String(formData.pipeline_id)),
    [pipelines, formData.pipeline_id]
  )

  const selectedPhase = useMemo(
    () => phases.find((ph) => String(ph.id) === String(formData.phase_id)),
    [phases, formData.phase_id]
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

  const handlePipelineSelect = (pipeline) => {
    setFormData((prev) => ({ ...prev, pipeline_id: pipeline.id, phase_id: '' }))
    setErrors((prev) => ({ ...prev, pipeline_id: '' }))
    setPipelineDropdownOpen(false)
  }

  const handlePhaseSelect = (phase) => {
    setFormData((prev) => ({ ...prev, phase_id: phase.id }))
    setErrors((prev) => ({ ...prev, phase_id: '' }))
    setPhaseDropdownOpen(false)
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
      const selectedEmp = employees.find(
        (emp) => String(emp.id) === String(formData.assignee_id)
      )
      const response = await crmAPI.createLead({
        title: formData.title,
        contact_id: formData.contact_id || null,
        pipeline_id: formData.pipeline_id || null,
        phase_id: formData.phase_id || null,
        value: formData.value ? Number(formData.value) : undefined,
        expected_close_date: formData.expected_close_date || null,
        assignee: selectedEmp
          ? selectedEmp.user_name || selectedEmp.full_name || String(selectedEmp.id)
          : null,
        source: formData.source || null,
        notes: formData.notes || null,
      })
      const saved = response.data
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
          {/* Pipeline custom dropdown */}
          <div className="custom-select-wrapper" ref={pipelineDropdownRef}>
            <label className="custom-select-label">Pipeline</label>
            <button
              type="button"
              className={`custom-select-trigger ${pipelineDropdownOpen ? 'open' : ''}`}
              onClick={() => setPipelineDropdownOpen((prev) => !prev)}
            >
              <span className={`custom-select-value ${selectedPipeline ? '' : 'placeholder'}`}>
                {selectedPipeline ? selectedPipeline.name : 'Select Pipeline...'}
              </span>
              <ChevronDown size={16} className={`dropdown-chevron ${pipelineDropdownOpen ? 'open' : ''}`} />
            </button>
            {pipelineDropdownOpen && (
              <div className="custom-select-menu">
                {pipelines.length === 0 ? (
                  <div className="custom-select-empty">No pipelines available</div>
                ) : (
                  pipelines.map((pipeline) => (
                    <button
                      key={pipeline.id}
                      type="button"
                      className={`custom-select-item ${String(pipeline.id) === String(formData.pipeline_id) ? 'selected' : ''}`}
                      onClick={() => handlePipelineSelect(pipeline)}
                    >
                      <div className="custom-select-item-main">
                        <span className="custom-select-item-name">{pipeline.name}</span>
                      </div>
                      {pipeline.description && (
                        <span className="custom-select-item-subtitle">{pipeline.description}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Phase custom dropdown */}
          <div className="custom-select-wrapper" ref={phaseDropdownRef}>
            <label className="custom-select-label" style={{ opacity: formData.pipeline_id ? 1 : 0.5 }}>
              Phase
            </label>
            <button
              type="button"
              className={`custom-select-trigger ${phaseDropdownOpen ? 'open' : ''}`}
              onClick={() => formData.pipeline_id && setPhaseDropdownOpen((prev) => !prev)}
              disabled={!formData.pipeline_id}
              style={{ opacity: formData.pipeline_id ? 1 : 0.5, cursor: formData.pipeline_id ? 'pointer' : 'not-allowed' }}
            >
              <span className={`custom-select-value ${selectedPhase ? '' : 'placeholder'}`}>
                {selectedPhase ? selectedPhase.name : 'Select Phase...'}
              </span>
              <ChevronDown size={16} className={`dropdown-chevron ${phaseDropdownOpen ? 'open' : ''}`} />
            </button>
            {phaseDropdownOpen && (
              <div className="custom-select-menu">
                {phases.length === 0 ? (
                  <div className="custom-select-empty">No phases available</div>
                ) : (
                  phases.map((phase) => (
                    <button
                      key={phase.id}
                      type="button"
                      className={`custom-select-item ${String(phase.id) === String(formData.phase_id) ? 'selected' : ''}`}
                      onClick={() => handlePhaseSelect(phase)}
                    >
                      <div className="custom-select-item-main">
                        <span
                          className="custom-select-item-name"
                          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: phase.color || 'var(--primary)',
                              display: 'inline-block',
                            }}
                          />
                          {phase.name}
                        </span>
                        {phase.is_terminal && (
                          <span className="phase-terminal-label" style={{ fontSize: '0.7rem' }}>
                            Terminal
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
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
                {/* AI Suggested Section */}
                {aiSuggestions.length > 0 && (
                  <>
                    <div className="custom-select-item" style={{ cursor: 'default', padding: '8px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <Sparkles size={12} style={{ marginRight: 4 }} />
                      AI Suggested
                    </div>
                    {aiSuggestions.map((s) => {
                      const matchedEmp = employees.find((e) => String(e.id) === String(s.employee_id))
                      return (
                        <button
                          key={`ai-${s.employee_id}`}
                          type="button"
                          className={`custom-select-item ${String(s.employee_id) === String(formData.assignee_id) ? 'selected' : ''}`}
                          onClick={() => matchedEmp && handleAssigneeSelect(matchedEmp)}
                        >
                          <div className="custom-select-item-main">
                            <span className="custom-select-item-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Sparkles size={12} style={{ color: 'var(--primary)' }} />
                              {s.name}
                            </span>
                            <span
                              className="custom-role-chip"
                              style={{
                                backgroundColor: s.confidence >= 80 ? '#22c55e' : s.confidence >= 60 ? '#eab308' : '#f97316',
                                fontSize: '0.65rem',
                              }}
                            >
                              {s.confidence}%
                            </span>
                          </div>
                          <span className="custom-select-item-subtitle" style={{ paddingLeft: 20 }}>
                            {s.reason} · {s.current_load} current lead(s)
                          </span>
                        </button>
                      )
                    })}
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  </>
                )}

                {/* AI Loading State */}
                {aiLoading && (
                  <div className="custom-select-loading">
                    <Loader size={16} />
                    <span>AI analyzing best assignee...</span>
                  </div>
                )}

                {/* Full Employee List */}
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
