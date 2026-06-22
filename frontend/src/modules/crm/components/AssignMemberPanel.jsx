import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  ChevronDown, Users, UserPlus, Plus, X, Save, ArrowRight,
  RotateCcw, UserCheck, Target, Trash2, CheckCircle2, Loader2
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Alert from '../../../components/ui/Alert'
import { hrAPI } from '../../hr/services/hrApi'
import { crmAPI } from '../../../services/api'
import '../styles/LeadsView.css'
import '../styles/PipelineSettings.css'
import '../styles/AssignMember.css'

const MODE_INFO = {
  round_robin: {
    icon: RotateCcw,
    title: 'Round Robin',
    desc: 'Leads are distributed evenly among selected group members',
    color: '#3b82f6',
  },
  self_assign: {
    icon: UserCheck,
    title: 'Self Assign',
    desc: 'Lead creator assigns the lead. Admin can override assignee.',
    color: '#8b5cf6',
  },
  individual: {
    icon: Target,
    title: 'Individual Assigning',
    desc: 'All leads are assigned to one specific member in the group',
    color: '#f59e0b',
  },
}

const AssignMemberPanel = ({ onPipelineCreated }) => {
  const [pipelines, setPipelines] = useState([])
  const [selectedPipelineId, setSelectedPipelineId] = useState(null)
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Assignment config for selected pipeline
  const [deptConfigs, setDeptConfigs] = useState([])

  // Pipeline dropdown
  const [pipelineDropdownOpen, setPipelineDropdownOpen] = useState(false)
  const pipelineDropdownRef = useRef(null)

  // Add department dropdown
  const [addDeptOpen, setAddDeptOpen] = useState(false)
  const addDeptRef = useRef(null)

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [pipelinesRes, deptsRes, empsRes] = await Promise.all([
          crmAPI.listPipelines(),
          hrAPI.getDepartments(),
          hrAPI.getEmployees({ status: 'Active', limit: 200 }),
        ])
        setPipelines(pipelinesRes.data)
        setDepartments(deptsRes.data || [])
        setEmployees(empsRes.data?.employees || [])
      } catch (err) {
        console.error('Failed to load data:', err)
        setError('Failed to load initial data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Load assignment config when pipeline changes
  useEffect(() => {
    if (!selectedPipelineId) {
      setDeptConfigs([])
      return
    }
    const fetchAssignment = async () => {
      try {
        const res = await crmAPI.getPipelineAssignment(selectedPipelineId)
        setDeptConfigs(res.data?.departments_config || [])
      } catch {
        // No config yet — that's fine
        setDeptConfigs([])
      }
    }
    fetchAssignment()
  }, [selectedPipelineId])

  // Click outside for dropdowns
  useEffect(() => {
    const handleClick = (e) => {
      if (pipelineDropdownRef.current && !pipelineDropdownRef.current.contains(e.target)) {
        setPipelineDropdownOpen(false)
      }
      if (addDeptRef.current && !addDeptRef.current.contains(e.target)) {
        setAddDeptOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedPipeline = pipelines.find((p) => String(p.id) === String(selectedPipelineId))

  // Departments not already added
  const availableDepts = departments.filter(
    (d) => !deptConfigs.some((cfg) => cfg.department_id === d.id)
  )

  const addDepartment = (dept) => {
    setDeptConfigs((prev) => [
      ...prev,
      {
        department_id: dept.id,
        department_name: dept.name,
        assignment_mode: 'round_robin',
        selected_members: [],
        individual_assignee_id: null,
        round_robin_index: 0,
      },
    ])
    setAddDeptOpen(false)
  }

  const removeDepartment = (deptId) => {
    setDeptConfigs((prev) => prev.filter((cfg) => cfg.department_id !== deptId))
  }

  const updateConfig = (deptId, updates) => {
    setDeptConfigs((prev) =>
      prev.map((cfg) =>
        cfg.department_id === deptId ? { ...cfg, ...updates } : cfg
      )
    )
  }

  const toggleMember = (deptId, empId) => {
    setDeptConfigs((prev) =>
      prev.map((cfg) => {
        if (cfg.department_id !== deptId) return cfg
        const exists = cfg.selected_members.includes(empId)
        return {
          ...cfg,
          selected_members: exists
            ? cfg.selected_members.filter((id) => id !== empId)
            : [...cfg.selected_members, empId],
        }
      })
    )
  }

  // Employees belonging to a specific department
  const getDeptEmployees = (deptId) =>
    employees.filter((e) => e.department_id === deptId)

  const getEmployeeName = (empId) => {
    const emp = employees.find((e) => e.id === empId)
    return emp ? (emp.user_name || emp.full_name || `Employee #${emp.id}`) : 'Unknown'
  }

  // Save (upcoming leads)
  const handleSave = async () => {
    if (!selectedPipelineId) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await crmAPI.savePipelineAssignment(selectedPipelineId, {
        departments_config: deptConfigs,
      })
      setSuccess('Assignment settings saved. New leads will follow these rules.')
      if (onPipelineCreated) onPipelineCreated()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Apply to existing leads — auto-saves current config first
  const handleApply = async (deptId, mode) => {
    if (!selectedPipelineId) return
    setAssigning(true)
    setError('')
    setSuccess('')
    try {
      // First persist the latest config to DB
      await crmAPI.savePipelineAssignment(selectedPipelineId, {
        departments_config: deptConfigs,
      })
      // Then apply using the freshly saved config
      const res = await crmAPI.applyPipelineAssignment(selectedPipelineId, {
        department_id: deptId,
        assignment_mode: mode,
      })
      setSuccess(`${res.data.updated_count} lead(s) assigned successfully!`)
      if (onPipelineCreated) onPipelineCreated()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign leads')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="ps-container">
        <div className="ps-loading">
          <Loader2 size={36} className="am-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="ps-container">
      <div className="ps-header">
        <div>
          <h2 className="ps-title">Assign Members</h2>
          <p className="ps-subtitle">
            Configure which departments and members can access each pipeline, and how leads are assigned.
          </p>
        </div>
      </div>

      {error && (
        <Alert message={error} type="error" variant="toast" onDismiss={() => setError('')} dismissible />
      )}
      {success && (
        <Alert message={success} type="success" variant="toast" onDismiss={() => setSuccess('')} dismissible />
      )}

      {/* Pipeline Selector */}
      <div className="ps-selector">
        <div className="custom-select-wrapper" ref={pipelineDropdownRef}>
          <label className="custom-select-label">Select Pipeline</label>
          <button
            type="button"
            className={`custom-select-trigger ${pipelineDropdownOpen ? 'open' : ''}`}
            onClick={() => setPipelineDropdownOpen((prev) => !prev)}
          >
            <span className={`custom-select-value ${selectedPipeline ? '' : 'placeholder'}`}>
              {selectedPipeline ? selectedPipeline.name : 'Choose a pipeline...'}
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
                    className={`custom-select-item ${String(pipeline.id) === String(selectedPipelineId) ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedPipelineId(pipeline.id)
                      setPipelineDropdownOpen(false)
                    }}
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
      </div>

      {selectedPipeline && (
        <div className="am-panel">
          {/* Assigned Departments */}
          {deptConfigs.length > 0 && (
            <div className="am-dept-list">
              {deptConfigs.map((cfg) => {
                const ModeIcon = MODE_INFO[cfg.assignment_mode]?.icon || Users
                const deptEmployees = getDeptEmployees(cfg.department_id)
                return (
                  <div key={cfg.department_id} className="am-dept-card">
                    <div className="am-dept-header">
                      <div className="am-dept-title">
                        <div className="am-dept-icon">
                          <Users size={18} />
                        </div>
                        <div>
                          <h4>{cfg.department_name}</h4>
                          <span className="am-dept-count">
                            {deptEmployees.length} member{deptEmployees.length !== 1 ? 's' : ''} in department
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="ps-icon-btn danger"
                        onClick={() => removeDepartment(cfg.department_id)}
                        title="Remove department"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Assignment Mode Selector */}
                    <div className="am-mode-selector">
                      {Object.entries(MODE_INFO).map(([key, info]) => {
                        const Icon = info.icon
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`am-mode-btn ${cfg.assignment_mode === key ? 'active' : ''}`}
                            onClick={() =>
                              updateConfig(cfg.department_id, {
                                assignment_mode: key,
                                selected_members: [],
                                individual_assignee_id: null,
                              })
                            }
                          >
                            <Icon size={16} />
                            <div className="am-mode-text">
                              <span className="am-mode-title">{info.title}</span>
                              <span className="am-mode-desc">{info.desc}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Round Robin: Member Selection */}
                    {cfg.assignment_mode === 'round_robin' && (
                      <div className="am-section">
                        <div className="am-section-header">
                          <UserPlus size={14} />
                          <span>Select members for round-robin assignment</span>
                          <span className="am-badge">{cfg.selected_members.length} selected</span>
                        </div>
                        <div className="am-member-grid">
                          {deptEmployees.length === 0 ? (
                            <div className="am-empty-members">
                              No employees found in this department
                            </div>
                          ) : (
                            deptEmployees.map((emp) => {
                              const selected = cfg.selected_members.includes(emp.id)
                              return (
                                <button
                                  key={emp.id}
                                  type="button"
                                  className={`am-member-chip ${selected ? 'selected' : ''}`}
                                  onClick={() => toggleMember(cfg.department_id, emp.id)}
                                >
                                  <div className="am-member-avatar" style={{ background: selected ? '#3b82f6' : '#e2e8f0' }}>
                                    <span style={{ color: selected ? '#fff' : '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>
                                      {(emp.user_name || emp.full_name || '?')[0]?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                  <span className="am-member-name">{emp.user_name || emp.full_name || `#${emp.id}`}</span>
                                  {selected && (
                                    <CheckCircle2 size={14} className="am-check-icon" />
                                  )}
                                </button>
                              )
                            })
                          )}
                        </div>
                        {cfg.selected_members.length > 1 && (
                          <div className="am-info-box">
                            <RotateCcw size={14} />
                            <span>
                              Leads will be distributed evenly among {cfg.selected_members.length} selected member(s).
                              {cfg.round_robin_index > 0 && ` Next in rotation: ${getEmployeeName(cfg.selected_members[cfg.round_robin_index % cfg.selected_members.length])}`}
                            </span>
                          </div>
                        )}
                        <div className="am-actions">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleSave}
                            disabled={saving || cfg.selected_members.length < 1}
                          >
                            <Save size={14} />
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApply(cfg.department_id, 'round_robin')}
                            disabled={assigning || cfg.selected_members.length < 1}
                          >
                            <ArrowRight size={14} />
                            {assigning ? 'Assigning...' : 'Assign'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Self Assign: Info */}
                    {cfg.assignment_mode === 'self_assign' && (
                      <div className="am-section">
                        <div className="am-info-box">
                          <UserCheck size={14} />
                          <span>
                            When this mode is active, leads are not auto-assigned. The person who creates the lead
                            (or an admin) selects the assignee manually. No further configuration needed.
                          </span>
                        </div>
                        <div className="am-actions">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleSave}
                            disabled={saving}
                          >
                            <Save size={14} />
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Individual: Select Assignee */}
                    {cfg.assignment_mode === 'individual' && (
                      <div className="am-section">
                        <div className="am-section-header">
                          <Target size={14} />
                          <span>Select the team member to assign all leads to</span>
                        </div>
                        <div className="am-member-grid">
                          {deptEmployees.length === 0 ? (
                            <div className="am-empty-members">
                              No employees found in this department
                            </div>
                          ) : (
                            deptEmployees.map((emp) => {
                              const selected = cfg.individual_assignee_id === emp.id
                              return (
                                <button
                                  key={emp.id}
                                  type="button"
                                  className={`am-member-chip ${selected ? 'selected' : ''}`}
                                  onClick={() =>
                                    updateConfig(cfg.department_id, { individual_assignee_id: emp.id })
                                  }
                                >
                                  <div className="am-member-avatar" style={{ background: selected ? '#f59e0b' : '#e2e8f0' }}>
                                    <span style={{ color: selected ? '#fff' : '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>
                                      {(emp.user_name || emp.full_name || '?')[0]?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                  <span className="am-member-name">{emp.user_name || emp.full_name || `#${emp.id}`}</span>
                                  {selected && (
                                    <CheckCircle2 size={14} className="am-check-icon" style={{ color: '#f59e0b' }} />
                                  )}
                                </button>
                              )
                            })
                          )}
                        </div>
                        <div className="am-actions">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleSave}
                            disabled={saving || !cfg.individual_assignee_id}
                          >
                            <Save size={14} />
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApply(cfg.department_id, 'individual')}
                            disabled={assigning || !cfg.individual_assignee_id}
                          >
                            <ArrowRight size={14} />
                            {assigning ? 'Assigning...' : 'Assign'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add Department */}
          <div className="am-add-dept-wrapper" ref={addDeptRef}>
            {availableDepts.length > 0 ? (
              <button
                type="button"
                className="am-add-dept-btn"
                onClick={() => setAddDeptOpen((prev) => !prev)}
              >
                <Plus size={16} />
                Add Department Group
                <ChevronDown size={14} className={`chevron ${addDeptOpen ? 'open' : ''}`} />
              </button>
            ) : (
              <div className="am-info-box" style={{ justifyContent: 'center' }}>
                <Users size={16} />
                <span>All departments have been added to this pipeline</span>
              </div>
            )}

            {addDeptOpen && (
              <div className="am-add-dropdown">
                {availableDepts.map((dept) => {
                  const count = getDeptEmployees(dept.id).length
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      className="am-add-item"
                      onClick={() => addDepartment(dept)}
                    >
                      <Users size={15} className="am-add-item-icon" />
                      <div className="am-add-item-text">
                        <span className="am-add-item-name">{dept.name}</span>
                        <span className="am-add-item-desc">{count} employees in department</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AssignMemberPanel
