import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Check, X, Trash2, ListChecks, Edit3 } from 'lucide-react'
import { taskApi } from '../services/taskApi'
import { useAuth } from '../../../context/AuthContext'
import '../styles/TaskChecklist.css'

const TaskChecklist = ({ taskId }) => {
  const { user } = useAuth()
  const isAdmin = user?.is_admin
  const [subtasks, setSubtasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const inputRef = useRef(null)
  const editInputRef = useRef(null)

  const fetchSubtasks = useCallback(async () => {
    try {
      setError('')
      const res = await taskApi.getSubtasks(taskId)
      setSubtasks(res.data || [])
    } catch (err) {
      setError('Failed to load checklist')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchSubtasks()
  }, [fetchSubtasks])

  // Focus add input when adding
  useEffect(() => {
    if (adding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [adding])

  // Focus edit input when editing
  useEffect(() => {
    if (editId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editId])

  const handleAdd = async (e) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return

    try {
      const res = await taskApi.createSubtask(taskId, { title })
      setSubtasks((prev) => [...prev, res.data])
      setNewTitle('')
      setAdding(false)
    } catch (err) {
      setError('Failed to add sub-task')
    }
  }

  const handleToggle = async (subtask) => {
    try {
      const res = await taskApi.updateSubtask(taskId, subtask.id, {
        completed: !subtask.completed,
      })
      setSubtasks((prev) =>
        prev.map((st) => (st.id === subtask.id ? res.data : st))
      )
    } catch (err) {
      setError('Failed to update sub-task')
    }
  }

  const handleStartEdit = (subtask) => {
    setEditId(subtask.id)
    setEditTitle(subtask.title)
  }

  const handleSaveEdit = async (subtaskId) => {
    const title = editTitle.trim()
    if (!title) {
      setEditId(null)
      return
    }

    try {
      const res = await taskApi.updateSubtask(taskId, subtaskId, { title })
      setSubtasks((prev) =>
        prev.map((st) => (st.id === subtaskId ? res.data : st))
      )
      setEditId(null)
    } catch (err) {
      setError('Failed to update sub-task')
    }
  }

  const handleCancelEdit = () => {
    setEditId(null)
    setEditTitle('')
  }

  const handleKeyDown = (e, subtaskId) => {
    if (e.key === 'Enter') {
      handleSaveEdit(subtaskId)
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleDelete = async (subtaskId) => {
    try {
      await taskApi.deleteSubtask(taskId, subtaskId)
      setSubtasks((prev) => prev.filter((st) => st.id !== subtaskId))
    } catch (err) {
      setError('Failed to delete sub-task')
    }
  }

  const completedCount = subtasks.filter((st) => st.completed).length
  const totalCount = subtasks.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <div className="checklist-section">
        <div className="checklist-loading">Loading checklist...</div>
      </div>
    )
  }

  return (
    <div className="checklist-section">
      <div className="checklist-header">
        <div className="checklist-header-left">
          <ListChecks size={15} />
          <span>Checklist</span>
          {totalCount > 0 && (
            <span className="checklist-count">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
        {totalCount > 0 && (
          <div className="checklist-progress-wrapper">
            <div className="checklist-progress-bar">
              <div
                className="checklist-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="checklist-progress-text">{progressPct}%</span>
          </div>
        )}
      </div>

      {error && <div className="checklist-error">{error}</div>}

      <div className="checklist-items">
        {subtasks.length === 0 ? (
          <div className="checklist-empty">
            <ListChecks size={20} />
            <span>No checklist items yet</span>
          </div>
        ) : (
          subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className={`checklist-item ${subtask.completed ? 'checklist-item-done' : ''}`}
            >
              <button
                type="button"
                className={`checklist-checkbox ${subtask.completed ? 'checklist-checkbox-checked' : ''}`}
                onClick={() => handleToggle(subtask)}
                title={subtask.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {subtask.completed ? <Check size={12} /> : null}
              </button>

              {editId === subtask.id ? (
                <div className="checklist-edit-wrapper">
                  <input
                    ref={editInputRef}
                    type="text"
                    className="checklist-edit-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, subtask.id)}
                    onBlur={() => handleSaveEdit(subtask.id)}
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <span className={`checklist-title ${subtask.completed ? 'checklist-title-done' : ''}`}>
                    {subtask.title}
                  </span>
                  {isAdmin && (
                    <div className="checklist-item-actions">
                      <button
                        type="button"
                        className="checklist-action-btn"
                        onClick={() => handleStartEdit(subtask)}
                        title="Edit"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        className="checklist-action-btn checklist-delete-btn"
                        onClick={() => handleDelete(subtask.id)}
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {isAdmin && (
        <>
          {adding ? (
            <div className="checklist-add-form">
              <input
                ref={inputRef}
                type="text"
                className="checklist-add-input"
                placeholder="Enter sub-task title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAdd(e)
                  } else if (e.key === 'Escape') {
                    setAdding(false)
                    setNewTitle('')
                  }
                }}
                autoFocus
              />
              <div className="checklist-add-actions">
                <button
                  type="button"
                  className="checklist-add-save"
                  disabled={!newTitle.trim()}
                  onClick={handleAdd}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="checklist-add-cancel"
                  onClick={() => {
                    setAdding(false)
                    setNewTitle('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="checklist-add-btn" onClick={() => setAdding(true)}>
              <Plus size={14} />
              Add item
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default TaskChecklist
