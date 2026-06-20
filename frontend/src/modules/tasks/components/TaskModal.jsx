import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { X, Paperclip, Upload, FileText, Check, Search, Building2, Briefcase, User, MessageSquare, History, Link2, ListChecks, Sparkles, Lightbulb, Clock, Target, ChevronDown, ChevronUp, Loader } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import TaskComments from './TaskComments'
import TaskActivityLog from './TaskActivityLog'
import TaskDependencies from './TaskDependencies'
import TaskChecklist from './TaskChecklist'
import { taskApi } from '../services/taskApi'
import { useAuth } from '../../../context/AuthContext'
import { taskAiApi } from '../services/taskAiApi'
import '../styles/TaskComments.css'
import '../styles/TaskActivityLog.css'
import '../styles/TaskDependencies.css'
import '../styles/TaskChecklist.css'

// Status progression order (higher = later in workflow)
const STATUS_ORDER = {
  TODO: 0,
  ON_PROGRESS: 1,
  ON_HOLD: 2,
  ON_REVIEW: 3,
  COMPLETED: 4,
  OVERDUE: 5,
}

const ALL_STATUS_OPTIONS = [
  { value: 'TODO', label: 'Todo' },
  { value: 'ON_PROGRESS', label: 'On Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'ON_REVIEW', label: 'On Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERDUE', label: 'Overdue' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const REASON_LABELS = {
  TODO: 'Reason for pending',
  ON_PROGRESS: 'Progress notes',
  ON_HOLD: 'Reason for hold',
  ON_REVIEW: 'Review notes / rejection reason',
  COMPLETED: 'Completion notes',
  OVERDUE: 'Auto-set by system',
}

const TaskModal = ({ task, employees, onSave, onClose }) => {
  const { user } = useAuth()
  const isAdmin = user?.is_admin
  const isEditing = !!task
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '')
  const [priority, setPriority] = useState(task?.priority || 'MEDIUM')
  const [status, setStatus] = useState(task?.status || 'TODO')
  const [reasonNote, setReasonNote] = useState(task?.reason_note || '')
  const [proofAttachment, setProofAttachment] = useState(task?.proof_attachment || '')
  const [dueDate, setDueDate] = useState(
    task?.due_date ? task.due_date.slice(0, 10) : ''
  )
  const [saving, setSaving] = useState(false)
  const [detailsTab, setDetailsTab] = useState('comments')

  // Employee search
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)
  const employeeDropdownRef = useRef(null)
  const employeeInputRef = useRef(null)

  // AI Suggestions state
  const [aiSuggestions, setAiSuggestions] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [pendingSubtasks, setPendingSubtasks] = useState([])
  const [newSubtaskInput, setNewSubtaskInput] = useState('')
  const aiDebounceRef = useRef(null)
  const subtaskInputRef = useRef(null)

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  // Can this user edit all fields, or only status/reason/proof?
  const isNonAdminEditing = isEditing && !isAdmin

  // ── AI Suggestions ──
  const fetchAiSuggestions = useCallback(async (taskTitle, taskDescription) => {
    if (!taskTitle.trim() || (isEditing && !isAdmin)) {
      setAiSuggestions(null)
      return
    }

    setAiLoading(true)
    setAiError('')

    try {
      const res = await taskAiApi.getSuggestions(taskTitle, taskDescription)
      setAiSuggestions(res.data)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to get AI suggestions'
      setAiError(msg)
      setAiSuggestions(null)
    } finally {
      setAiLoading(false)
    }
  }, [isEditing, isAdmin])

  // Debounced AI suggestions when title changes (longer debounce to avoid excessive API calls)
  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    setTitle(newTitle)

    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current)
    aiDebounceRef.current = setTimeout(() => {
      if (newTitle.trim().length >= 3) {
        fetchAiSuggestions(newTitle, description)
      }
    }, 1500)
  }

  // Also refetch when description changes
  const handleDescriptionChange = (e) => {
    const newDesc = e.target.value
    setDescription(newDesc)

    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current)
    aiDebounceRef.current = setTimeout(() => {
      if (title.trim().length >= 3 && newDesc.trim().length >= 3) {
        fetchAiSuggestions(title, newDesc)
      }
    }, 1500)
  }

  const handleToggleAiPanel = () => {
    const willOpen = !aiPanelOpen
    setAiPanelOpen(willOpen)
    if (willOpen && !aiSuggestions && !aiLoading && title.trim().length >= 3) {
      fetchAiSuggestions(title, description)
    }
  }

  const handleApplySubtask = (subtaskTitle) => {
    // Toggle subtask in pendingSubtasks list
    setPendingSubtasks((prev) => {
      if (prev.includes(subtaskTitle)) {
        return prev.filter((t) => t !== subtaskTitle)
      }
      return [...prev, subtaskTitle]
    })
  }

  const handleApplyPriority = (priority) => {
    setPriority(priority)
  }

  const handleApplyDescription = () => {
    if (aiSuggestions?.suggested_description) {
      setDescription(aiSuggestions.suggested_description)
    }
  }

  const handleAddCustomSubtask = () => {
    const title = newSubtaskInput.trim()
    if (!title) return
    setPendingSubtasks((prev) => {
      if (prev.includes(title)) return prev
      return [...prev, title]
    })
    setNewSubtaskInput('')
    setTimeout(() => subtaskInputRef.current?.focus(), 50)
  }

  const handleRemoveSubtask = (subtaskTitle) => {
    setPendingSubtasks((prev) => prev.filter((t) => t !== subtaskTitle))
  }

  const handleSubtaskInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCustomSubtask()
    }
  }

  // Compute available status options based on current status
  const statusOptions = useMemo(() => {
    if (!isEditing) {
      return ALL_STATUS_OPTIONS.filter((opt) => opt.value !== 'OVERDUE')
    }
    const currentOrder = STATUS_ORDER[task.status] ?? -1
    return ALL_STATUS_OPTIONS.filter((opt) => {
      if (opt.value === 'OVERDUE') return false

      const optOrder = STATUS_ORDER[opt.value] ?? -1

      // COMPLETED can only be reached from ON_REVIEW
      if (opt.value === 'COMPLETED' && task.status !== 'ON_REVIEW') return false

      if (optOrder > currentOrder) return true

      if (
        (task.status === 'OVERDUE' && opt.value === 'ON_REVIEW') ||
        (task.status === 'ON_HOLD' && opt.value === 'ON_PROGRESS') ||
        (task.status === 'ON_REVIEW' && opt.value === 'TODO' && isAdmin) ||
        (task.status === 'COMPLETED' && opt.value === 'ON_REVIEW' && isAdmin)
      ) {
        return true
      }

      return false
    })
  }, [isEditing, task?.status, isAdmin])

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees
    const search = employeeSearch.toLowerCase()
    return employees.filter(
      (emp) =>
        (emp.name || '').toLowerCase().includes(search) ||
        (emp.email || '').toLowerCase().includes(search) ||
        (emp.department || '').toLowerCase().includes(search) ||
        (emp.designation || '').toLowerCase().includes(search)
    )
  }, [employees, employeeSearch])

  // Selected employee display name
  const selectedEmployee = useMemo(() => {
    if (!assigneeId) return null
    return employees.find((e) => e.id === Number(assigneeId)) || null
  }, [employees, assigneeId])

  const reasonLabel = REASON_LABELS[status] || 'Reason note'
  const isReasonReadOnly = status === 'OVERDUE'

  // Close employee dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target)) {
        setShowEmployeeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clean up AI debounce timer on unmount
  useEffect(() => {
    return () => {
      if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current)
    }
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 10 MB.')
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
    setUploadError('')
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadError('')

    try {
      const res = await taskApi.uploadProof(selectedFile)
      setProofAttachment(res.data.url)
      setSelectedFile(null)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed. Please try again.'
      setUploadError(msg)
    } finally {
      setUploading(false)
    }
  }

  const createPendingSubtasks = async (taskId) => {
    // Create all pending subtasks via API
    const created = []
    for (const st of pendingSubtasks) {
      try {
        const res = await taskApi.createSubtask(taskId, { title: st })
        created.push(res.data)
      } catch (err) {
        console.error('Failed to create subtask:', st, err)
      }
    }
    return created
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !dueDate) return

    setSaving(true)
    try {
      let payload

      if (isNonAdminEditing) {
        // Non-admin employees can only update status, reason_note, proof_attachment
        payload = {
          status,
          reason_note: reasonNote.trim() || null,
          proof_attachment: proofAttachment.trim() || null,
        }
      } else if (isEditing) {
        payload = {
          title: title.trim(),
          description: description.trim() || null,
          assignee_id: assigneeId ? Number(assigneeId) : null,
          priority,
          due_date: new Date(dueDate).toISOString(),
          status,
          reason_note: reasonNote.trim() || null,
          proof_attachment: proofAttachment.trim() || null,
        }
      } else {
        payload = {
          title: title.trim(),
          description: description.trim() || null,
          assignee_id: assigneeId ? Number(assigneeId) : null,
          priority,
          due_date: new Date(dueDate).toISOString(),
        }
      }

      // Save the task and get the result (which includes the task ID)
      const result = await onSave(payload, task?.id)

      // Create pending subtasks if we have a task ID
      const taskId = result?.id || task?.id
      if (taskId && pendingSubtasks.length > 0) {
        await createPendingSubtasks(taskId)
      }

      // Close the modal AFTER all operations complete
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSelectEmployee = (emp) => {
    setAssigneeId(String(emp.id))
    setEmployeeSearch('')
    setShowEmployeeDropdown(false)
  }

  const handleClearAssignee = () => {
    setAssigneeId('')
    setEmployeeSearch('')
  }

  return (
    <div className="task-modal-overlay" onClick={handleOverlayClick} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="task-modal">
        <div className="task-modal-header">
          <h2>{isEditing ? 'Edit Task' : 'Create Task'}</h2>
          <button className="task-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form className="task-modal-form" onSubmit={handleSubmit}>            <Input
              label="Title"
              id="task-title"
              value={title}
              onChange={handleTitleChange}
              required
              placeholder="Enter task title"
              disabled={isNonAdminEditing}
            />

            <div className="filter-group reason-text">
              <label htmlFor="task-desc">Description</label>
              <textarea
                id="task-desc"
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Optional description"
                rows={3}
                readOnly={isNonAdminEditing}
                style={isNonAdminEditing ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              />
            </div>

            {/* AI Suggestions Button & Panel */}
            {!isNonAdminEditing && (
              <div className="ai-suggestions-section">
                <button
                  type="button"
                  className="ai-suggestions-toggle"
                  onClick={handleToggleAiPanel}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <Loader size={15} className="ai-spinner" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  <span>
                    {aiLoading
                      ? 'AI is thinking...'
                      : aiPanelOpen
                        ? 'Hide AI Suggestions'
                        : 'Show AI Suggestions'}
                  </span>
                  {aiPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {aiPanelOpen && (
                  <div className="ai-suggestions-panel">
                    {aiLoading && (
                      <div className="ai-suggestions-loading">
                        <Loader size={20} className="ai-spinner" />
                        <span>Analysing task and generating suggestions...</span>
                      </div>
                    )}

                    {aiError && !aiLoading && (
                      <div className="ai-suggestions-error">
                        <p>{aiError}</p>
                        <button
                          type="button"
                          className="ai-retry-btn"
                          onClick={() => fetchAiSuggestions(title, description)}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {!aiLoading && !aiError && !aiSuggestions && title.trim().length < 3 && (
                      <div className="ai-suggestions-empty">
                        <Lightbulb size={18} />
                        <span>Type at least 3 characters in the title to get AI suggestions.</span>
                      </div>
                    )}

                    {!aiLoading && !aiError && aiSuggestions && (
                      <div className="ai-suggestions-content">
                        {/* Explanation */}
                        {aiSuggestions.explanation && (
                          <p className="ai-explanation">{aiSuggestions.explanation}</p>
                        )}

                        <div className="ai-suggestions-grid">
                          {/* Suggested Description */}
                          {aiSuggestions.suggested_description && (
                            <div className="ai-suggestion-block">
                              <div className="ai-suggestion-block-header">
                                <FileText size={14} />
                                <span>Suggested Description</span>
                              </div>
                              <p className="ai-suggested-desc-text">{aiSuggestions.suggested_description}</p>
                              {description !== aiSuggestions.suggested_description && (
                                <button
                                  type="button"
                                  className="ai-apply-btn ai-apply-desc-btn"
                                  onClick={handleApplyDescription}
                                >
                                  <Check size={12} />
                                  Apply Description
                                </button>
                              )}
                              {description === aiSuggestions.suggested_description && (
                                <span className="ai-applied-label">
                                  <Check size={12} />
                                  Applied
                                </span>
                              )}
                            </div>
                          )}

                          {/* Subtasks */}
                          {aiSuggestions.subtasks?.length > 0 && (
                            <div className="ai-suggestion-block">
                              <div className="ai-suggestion-block-header">
                                <ListChecks size={14} />
                                <span>Suggested Subtasks</span>
                              </div>
                              <ul className="ai-suggestion-list">
                                {aiSuggestions.subtasks.map((st, i) => {
                                  const isAdded = pendingSubtasks.includes(st)
                                  return (
                                    <li key={i} className={`ai-suggestion-item ${isAdded ? 'ai-suggestion-added' : ''}`}>
                                      <span className="ai-suggestion-text">{st}</span>
                                      <button
                                        type="button"
                                        className={`ai-apply-btn ${isAdded ? 'ai-remove-btn' : ''}`}
                                        onClick={() => handleApplySubtask(st)}
                                        title={isAdded ? 'Remove from checklist' : 'Add to checklist'}
                                      >
                                        {isAdded ? <X size={12} /> : <Check size={12} />}
                                      </button>
                                    </li>
                                  )
                                })}
                              </ul>
                              {pendingSubtasks.length > 0 && (
                                <div className="ai-pending-count">
                                  <ListChecks size={13} />
                                  <span>{pendingSubtasks.length} subtask{pendingSubtasks.length !== 1 ? 's' : ''} will be added to checklist on save</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Dependencies */}
                          {aiSuggestions.dependencies?.length > 0 && (
                            <div className="ai-suggestion-block">
                              <div className="ai-suggestion-block-header">
                                <Link2 size={14} />
                                <span>Suggested Dependencies</span>
                              </div>
                              <ul className="ai-suggestion-list">
                                {aiSuggestions.dependencies.map((dep, i) => (
                                  <li key={i} className="ai-suggestion-item">
                                    <span className="ai-suggestion-text">{dep}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Priority */}
                          {aiSuggestions.suggested_priority && (
                            <div className="ai-suggestion-block">
                              <div className="ai-suggestion-block-header">
                                <Target size={14} />
                                <span>Suggested Priority</span>
                              </div>
                              <div className="ai-priority-suggest">
                                <span className={`ai-priority-badge ai-priority-${aiSuggestions.suggested_priority.toLowerCase()}`}>
                                  {aiSuggestions.suggested_priority}
                                </span>
                                {priority !== aiSuggestions.suggested_priority && (
                                  <button
                                    type="button"
                                    className="ai-apply-btn"
                                    onClick={() => handleApplyPriority(aiSuggestions.suggested_priority)}
                                  >
                                    Apply
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Estimated Effort */}
                          {aiSuggestions.estimated_effort_hours && (
                            <div className="ai-suggestion-block">
                              <div className="ai-suggestion-block-header">
                                <Clock size={14} />
                                <span>Estimated Effort</span>
                              </div>
                              <p className="ai-effort-value">
                                ~{aiSuggestions.estimated_effort_hours} hour{aiSuggestions.estimated_effort_hours !== 1 ? 's' : ''}
                              </p>
                            </div>
                          )}

                          {/* Assignee Suggestion */}
                          {aiSuggestions.suggested_assignee && (
                            <div className="ai-suggestion-block">
                              <div className="ai-suggestion-block-header">
                                <User size={14} />
                                <span>Suggested Assignee Role</span>
                              </div>
                              <p className="ai-assignee-value">{aiSuggestions.suggested_assignee}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          <div className="form-row">              <div className="filter-group">
                <label htmlFor="task-priority">Priority</label>
                <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value)} disabled={isNonAdminEditing}>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

            {isEditing && (
              <div className="filter-group">
                <label htmlFor="task-status">Status</label>
                <select id="task-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {statusOptions.length === 0 && (
                  <small style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>
                    No forward status changes available
                  </small>
                )}
              </div>
            )}
          </div>

          <div className="form-row">
            {/* Employee Selector with Search */}
            <div className="filter-group employee-select-group" ref={employeeDropdownRef}>
              <label htmlFor="task-assignee">Assign To</label>                <div className="employee-select-trigger">
                <div
                  className={`employee-select-input ${showEmployeeDropdown ? 'focused' : ''} ${isNonAdminEditing ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isNonAdminEditing) return
                    setShowEmployeeDropdown(!showEmployeeDropdown)
                    if (!showEmployeeDropdown) {
                      setTimeout(() => employeeInputRef.current?.focus(), 50)
                    }
                  }}
                >
                  {selectedEmployee ? (
                    <div className="employee-chip">
                      <User size={14} />
                      <span className="employee-chip-name">{selectedEmployee.name || selectedEmployee.email}</span>
                      {selectedEmployee.department && (
                        <span className="employee-chip-dept">{selectedEmployee.department}</span>
                      )}                        {!isNonAdminEditing && (
                          <button
                            type="button"
                            className="employee-chip-remove"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleClearAssignee()
                            }}
                          >
                            <X size={12} />
                          </button>
                        )}
                    </div>
                  ) : (
                    <span className="employee-input-placeholder">
                      <Search size={14} />
                      Search employee...
                    </span>
                  )}
                </div>

                {showEmployeeDropdown && (
                  <div className="employee-select-dropdown">
                    <div className="employee-search-input-wrapper">
                      <Search size={14} className="employee-search-icon" />
                      <input
                        ref={employeeInputRef}
                        type="text"
                        className="employee-search-input"
                        placeholder="Type to search..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="employee-options-list">
                      {filteredEmployees.length === 0 ? (
                        <div className="employee-no-results">No employees found</div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <div
                            key={emp.id}
                            className={`employee-option ${Number(assigneeId) === emp.id ? 'selected' : ''}`}
                            onClick={() => handleSelectEmployee(emp)}
                          >
                            <div className="employee-option-info">
                              <span className="employee-option-name">
                                {emp.name || emp.email || 'Unknown'}
                              </span>
                              <span className="employee-option-details">
                                {emp.department && (
                                  <span className="employee-option-dept">
                                    <Building2 size={11} />
                                    {emp.department}
                                  </span>
                                )}
                                {emp.designation && (
                                  <span className="employee-option-dept">
                                    <Briefcase size={11} />
                                    {emp.designation}
                                  </span>
                                )}
                              </span>
                            </div>
                            {emp.email && (
                              <span className="employee-option-email">{emp.email}</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Input
              label="Due Date"
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              disabled={isNonAdminEditing}
            />
          </div>

          {isEditing && (
            <div className="filter-group reason-text">
              <label htmlFor="task-reason">{reasonLabel}</label>
              <textarea
                id="task-reason"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder={isReasonReadOnly ? 'Auto-set by system' : `Enter ${reasonLabel.toLowerCase()}...`}
                readOnly={isReasonReadOnly}
                rows={2}
              />
              {isReasonReadOnly && (
                <small style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>
                  Reason is auto-set when status is Overdue
                </small>
              )}
            </div>
          )}

          {isEditing && status === 'COMPLETED' && (
            <>
              {/* Proof Attachment - File Upload (required for completed tasks) */}
              <div className="filter-group reason-text">
                <label htmlFor="task-proof" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Paperclip size={14} />
                  Proof Attachment
                </label>

                <input
                  ref={fileInputRef}
                  id="task-proof"
                  type="file"
                  onChange={handleFileSelect}
                  accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  style={{ display: 'none' }}
                />

                {proofAttachment && (
                  <div style={{
                    border: '1px solid #22c55e',
                    borderRadius: 12,
                    padding: '12px 16px',
                    background: 'rgba(34, 197, 94, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                  }}>
                    <Check size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text)', wordBreak: 'break-all', flex: 1 }}>
                      {proofAttachment}
                    </span>
                    <button
                      type="button"
                      onClick={() => setProofAttachment('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}

                {!proofAttachment && (
                  <>
                    {selectedFile ? (
                      <div style={{
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '12px 16px',
                        background: 'var(--bg)',
                        marginBottom: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <FileText size={20} style={{ opacity: 0.5, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {selectedFile.name}
                            </p>
                            <p style={{ fontSize: 11, opacity: 0.5, color: 'var(--text)' }}>
                              {formatFileSize(selectedFile.size)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={handleUpload}
                            disabled={uploading}
                            style={{ flexShrink: 0, fontSize: 12, padding: '6px 12px' }}
                          >
                            {uploading ? 'Uploading...' : 'Upload'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: '2px dashed var(--border)',
                          borderRadius: 12,
                          padding: '24px 16px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          background: 'var(--bg)',
                          marginBottom: 8,
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <Upload size={24} style={{ opacity: 0.3, marginBottom: 4 }} />
                        <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, marginBottom: 2 }}>
                          Click to upload proof
                        </p>
                        <p style={{ fontSize: 11, opacity: 0.4, color: 'var(--text)' }}>
                          PNG, JPG, PDF — up to 10 MB
                        </p>
                      </div>
                    )}
                  </>
                )}

                {uploadError && (
                  <p style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>{uploadError}</p>
                )}

                <small style={{ opacity: 0.5, fontSize: 12, marginTop: 4, display: 'block' }}>
                  Required when marking a task as completed. Upload a screenshot or document as evidence.
                </small>
              </div>
            </>
          )}

          {(isEditing && task?.id) && (
            <>
              {/* Details Tabs: Comments, Dependencies, Activity */}
              <div className="task-details-tabs">
                <button
                  type="button"
                  className={`task-details-tab ${detailsTab === 'comments' ? 'active' : ''}`}
                  onClick={() => setDetailsTab('comments')}
                >
                  <MessageSquare size={14} />
                  Comments
                </button>
                <button
                  type="button"
                  className={`task-details-tab ${detailsTab === 'checklist' ? 'active' : ''}`}
                  onClick={() => setDetailsTab('checklist')}
                >
                  <ListChecks size={14} />
                  Checklist
                </button>
                <button
                  type="button"
                  className={`task-details-tab ${detailsTab === 'dependencies' ? 'active' : ''}`}
                  onClick={() => setDetailsTab('dependencies')}
                >
                  <Link2 size={14} />
                  Dependencies
                </button>
                <button
                  type="button"
                  className={`task-details-tab ${detailsTab === 'activity' ? 'active' : ''}`}
                  onClick={() => setDetailsTab('activity')}
                >
                  <History size={14} />
                  Activity
                </button>
              </div>

              {detailsTab === 'comments' && <TaskComments taskId={task.id} />}
              {detailsTab === 'checklist' && <TaskChecklist taskId={task.id} />}
              {detailsTab === 'dependencies' && <TaskDependencies taskId={task.id} />}
              {detailsTab === 'activity' && <TaskActivityLog taskId={task.id} />}
            </>
          )}            {/* Interactive Checklist for new tasks */}
            {!isEditing && !isNonAdminEditing && (
              <div className="task-create-checklist">
                <div className="task-create-checklist-header">
                  <ListChecks size={16} />
                  <span>Checklist {pendingSubtasks.length > 0 ? `(${pendingSubtasks.length})` : ''}</span>
                </div>

                {/* Subtask input */}
                <div className="task-create-checklist-input-row">
                  <input
                    ref={subtaskInputRef}
                    type="text"
                    className="task-create-checklist-input"
                    placeholder="Add a checklist item..."
                    value={newSubtaskInput}
                    onChange={(e) => setNewSubtaskInput(e.target.value)}
                    onKeyDown={handleSubtaskInputKeyDown}
                  />
                  <button
                    type="button"
                    className="task-create-checklist-add-btn"
                    onClick={handleAddCustomSubtask}
                    disabled={!newSubtaskInput.trim()}
                  >
                    <Check size={14} />
                    Add
                  </button>
                </div>

                {/* List of pending subtasks */}
                {pendingSubtasks.length > 0 && (
                  <ul className="task-create-checklist-list">
                    {pendingSubtasks.map((st, i) => (
                      <li key={i} className="task-create-checklist-item">
                        <span className="task-create-checklist-number">{i + 1}.</span>
                        <span className="task-create-checklist-text">{st}</span>
                        <button
                          type="button"
                          className="task-create-checklist-remove"
                          onClick={() => handleRemoveSubtask(st)}
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {pendingSubtasks.length === 0 && (
                  <p className="task-create-checklist-empty">
                    No checklist items yet. Add items above or use AI suggestions.
                  </p>
                )}
              </div>
            )}

          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !title.trim() || !dueDate}>
              {saving ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal
