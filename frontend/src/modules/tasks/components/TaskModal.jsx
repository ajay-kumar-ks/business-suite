import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'

const STATUS_OPTIONS = [
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
  const [dueDate, setDueDate] = useState(
    task?.due_date ? task.due_date.slice(0, 10) : ''
  )
  const [saving, setSaving] = useState(false)

  const reasonLabel = REASON_LABELS[status] || 'Reason note'
  const isReasonReadOnly = status === 'OVERDUE'

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
        status,
        reason_note: reasonNote.trim() || null,
        due_date: new Date(dueDate).toISOString(),
      }
      await onSave(payload, task?.id)
    } finally {
      setSaving(false)
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
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

            <div className="filter-group">
              <label htmlFor="task-status">Status</label>
              <select id="task-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
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
