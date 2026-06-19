import React, { useState, useEffect, useRef, useMemo } from 'react'
import { X, Paperclip, Upload, FileText, Check } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import { taskApi } from '../services/taskApi'

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

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  // Compute available status options based on current status
  const statusOptions = useMemo(() => {
    if (!isEditing) {
      // Creating new task - filter out OVERDUE (auto-assigned only)
      return ALL_STATUS_OPTIONS.filter((opt) => opt.value !== 'OVERDUE')
    }
    // Editing - only show allowed forward/backward transitions
    const currentOrder = STATUS_ORDER[task.status] ?? -1
    return ALL_STATUS_OPTIONS.filter((opt) => {
      if (opt.value === 'OVERDUE') return false  // cannot manually set to overdue

      const optOrder = STATUS_ORDER[opt.value] ?? -1

      // Forward transitions are always allowed
      if (optOrder > currentOrder) return true

      // Special backward transitions:
      //   OVERDUE → ON_REVIEW    (overdue task completed, send for review)
      //   ON_HOLD → ON_PROGRESS  (resume a held task)
      if (
        (task.status === 'OVERDUE' && opt.value === 'ON_REVIEW') ||
        (task.status === 'ON_HOLD' && opt.value === 'ON_PROGRESS')
      ) {
        return true
      }

      return false
    })
  }, [isEditing, task?.status])

  const reasonLabel = REASON_LABELS[status] || 'Reason note'
  const isReasonReadOnly = status === 'OVERDUE'

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !dueDate) return

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        assignee_id: assigneeId ? Number(assigneeId) : null,
        priority,
        due_date: new Date(dueDate).toISOString(),
      }
      if (isEditing) {
        payload.status = status
      }
      if (isEditing) {
        payload.reason_note = reasonNote.trim() || null
        payload.proof_attachment = proofAttachment.trim() || null
      }
      await onSave(payload, task?.id)
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

  return (
    <div className="task-modal-overlay" onClick={handleOverlayClick} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="task-modal">
        <div className="task-modal-header">
          <h2>{isEditing ? 'Edit Task' : 'Create Task'}</h2>
          <button className="task-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form className="task-modal-form" onSubmit={handleSubmit}>
          <Input
            label="Title"
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Enter task title"
          />

          <div className="filter-group reason-text">
            <label htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="filter-group">
              <label htmlFor="task-priority">Priority</label>
              <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
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
            <div className="filter-group">
              <label htmlFor="task-assignee">Assignee</label>
              <select id="task-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || emp.username || emp.email}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Due Date"
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
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
