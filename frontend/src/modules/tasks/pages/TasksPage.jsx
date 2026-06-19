import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, RotateCcw, RotateCw } from 'lucide-react'
import Loader from '../../../components/ui/Loader'
import Button from '../../../components/ui/Button'
import TaskBoard from '../components/TaskBoard'
import { STATUS_LABELS } from '../components/TaskCard'
import TaskModal from '../components/TaskModal'
import ProofModal from '../components/ProofModal'
import TaskFilters from '../components/TaskFilters'
import { taskApi } from '../services/taskApi'
import { useAuth } from '../../../context/AuthContext'
import { useTaskNotifications } from '../../../context/TaskNotificationContext'
import '../styles/TasksPage.css'

const DEFAULT_FILTERS = {
  status: '',
  priority: '',
  assignee_id: '',
  search: '',
}

const TasksPage = () => {
  const { user } = useAuth()
  const { updateOverdueCount } = useTaskNotifications()

  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [saving, setSaving] = useState(false)
  const [proofPending, setProofPending] = useState(null) // { task, newStatus }
  // Undo/redo state: { taskId, prevStatus, prevProof, taskTitle, newStatus }
  const [lastChange, setLastChange] = useState(null)
  const [lastUndo, setLastUndo] = useState(null)
  const [undoAnimating, setUndoAnimating] = useState(false)
  const [redoAnimating, setRedoAnimating] = useState(false)
  const debounceRef = useRef(null)
  // Stable refs for keyboard shortcut handlers (avoids re-registering listeners on every render)
  // Refs are set to null initially, then populated after handlers are defined
  const handleUndoRef = useRef(null)
  const handleRedoRef = useRef(null)

  const fetchTasks = useCallback(async (appliedFilters = {}) => {
    try {
      setLoading(true)
      setError(null)
      const params = {}
      if (appliedFilters.status) params.status = appliedFilters.status
      if (appliedFilters.priority) params.priority = appliedFilters.priority
      if (appliedFilters.assignee_id) params.assignee_id = Number(appliedFilters.assignee_id)
      if (appliedFilters.search) params.search = appliedFilters.search

      const res = await taskApi.getTasks(params)
      const fetchedTasks = res.data

      // Update overdue notification count
      const overdueCount = fetchedTasks.filter(
        (t) => t.status === 'OVERDUE'
      ).length
      updateOverdueCount(overdueCount)

      setTasks(fetchedTasks)
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
      setError('Failed to load tasks. Make sure the server is running.')
    } finally {
      setLoading(false)
    }
  }, [updateOverdueCount])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await taskApi.getEmployees()
      setEmployees(res.data || [])
    } catch {
      // Employees endpoint may not have data yet
      setEmployees([])
    }
  }, [])
  useEffect(() => {
    fetchTasks(filters)
    fetchEmployees()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger when typing in an input/select
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndoRef.current()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        handleRedoRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, []) // Stable — uses refs to always call the latest handlers

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchTasks(filters)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const handleOpenCreate = () => {
    setEditingTask(null)
    setModalOpen(true)
  }

  const doStatusChange = useCallback(async (taskId, newStatus, proofUrl) => {
    // Capture previous state before optimistically updating
    let prevStatus = null
    let prevProof = null
    let taskTitle = ''

    // Optimistically update the UI
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId)
      if (task) {
        prevStatus = task.status
        prevProof = task.proof_attachment
        taskTitle = task.title
      }
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, proof_attachment: proofUrl } : t
      )
      updateOverdueCount(updated.filter((t) => t.status === 'OVERDUE').length)
      return updated
    })

    // Don't record undo if we couldn't capture the previous state
    if (prevStatus === null) return

    // Clear redo — a new change invalidates the redo stack
    setLastUndo(null)

    try {
      await taskApi.updateTask(taskId, { status: newStatus, proof_attachment: proofUrl })

      // Record as the latest change for undo (include proofUrl so redo can replay it)
      setLastChange({ taskId, prevStatus, prevProof, proofUrl, taskTitle, newStatus })
    } catch (err) {
      console.error('Failed to update task status:', err)
      setLastChange(null)
      fetchTasks(filters)
    }
  }, [filters, fetchTasks, updateOverdueCount])

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // Only require proof when moving to COMPLETED
    if (newStatus === 'COMPLETED') {
      setProofPending({ task, newStatus })
    } else {
      doStatusChange(taskId, newStatus, null)
    }
  }, [tasks, doStatusChange])

  const handleProofConfirm = useCallback((proofUrl) => {
    if (!proofPending) return
    const { task, newStatus } = proofPending
    setProofPending(null)
    doStatusChange(task.id, newStatus, proofUrl)
  }, [proofPending, doStatusChange])

  const handleProofCancel = useCallback(() => {
    setProofPending(null)
  }, [])

  const handleUndo = useCallback(async () => {
    if (!lastChange) return

    const { taskId, prevStatus, prevProof, proofUrl, taskTitle, newStatus } = lastChange
    setLastChange(null)

    // Store redo info so user can reapply (carry over proofUrl if it existed)
    setLastUndo({ taskId, prevStatus: newStatus, proofUrl, taskTitle, newStatus: prevStatus })

    // Show animation feedback
    setUndoAnimating(true)
    setTimeout(() => setUndoAnimating(false), 600)

    // Optimistically revert the UI
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, status: prevStatus, proof_attachment: prevProof } : t
      )
      updateOverdueCount(updated.filter((t) => t.status === 'OVERDUE').length)
      return updated
    })

    // Fire-and-forget the API call (no blocking)
    taskApi.updateTask(taskId, { status: prevStatus, proof_attachment: prevProof })
      .catch((err) => {
        console.error('Failed to undo status change:', err)
        fetchTasks(filters)
      })
  }, [lastChange, fetchTasks, updateOverdueCount])

  const handleRedo = useCallback(async () => {
    if (!lastUndo) return

    const { taskId, prevStatus: redoStatus, proofUrl, taskTitle } = lastUndo
    setLastUndo(null)

    // Store as a new change for undo
    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      setLastChange({ taskId, prevStatus: task.status, prevProof: task.proof_attachment, proofUrl, taskTitle, newStatus: redoStatus })
    }

    // Show animation feedback
    setRedoAnimating(true)
    setTimeout(() => setRedoAnimating(false), 600)

    // Optimistically re-apply the status
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, status: redoStatus, proof_attachment: proofUrl || null } : t
      )
      updateOverdueCount(updated.filter((t) => t.status === 'OVERDUE').length)
      return updated
    })

    // Fire-and-forget the API call
    taskApi.updateTask(taskId, { status: redoStatus, proof_attachment: proofUrl || null })
      .catch((err) => {
        console.error('Failed to redo status change:', err)
        fetchTasks(filters)
      })
  }, [lastUndo, tasks, fetchTasks, updateOverdueCount])

  // Keep refs in sync with latest handler closures
  handleUndoRef.current = handleUndo
  handleRedoRef.current = handleRedo

  const handleOpenEdit = (task) => {
    setEditingTask(task)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingTask(null)
  }

  const handleSave = async (payload, taskId) => {
    try {
      if (taskId) {
        await taskApi.updateTask(taskId, payload)
      } else {
        await taskApi.createTask(payload)
      }
      handleCloseModal()
      await fetchTasks(filters)
    } catch (err) {
      console.error('Failed to save task:', err)
      throw err
    }
  }

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div>
          <h1>Tasks</h1>
          <p>Manage, assign, and track team tasks</p>
        </div>
        <div className="header-actions">
          <div className={`undo-wrapper ${undoAnimating ? 'animating' : ''}`}>
            <button
              className="action-btn undo-btn"
              onClick={handleUndo}
              title={lastChange
                ? `Undo: Move "${lastChange.taskTitle}" back to ${STATUS_LABELS[lastChange.prevStatus] || lastChange.prevStatus} (Ctrl+Z)`
                : 'Undo last status change (Ctrl+Z)'
              }
            >
              <RotateCcw size={15} />
              <span className="action-btn-text">
                {lastChange ? (
                  <>
                    Undo <strong>"{lastChange.taskTitle}"</strong>
                  </>
                ) : (
                  'Undo'
                )}
              </span>
            </button>
          </div>
          <div className={`redo-wrapper ${redoAnimating ? 'animating' : ''}`}>
            <button
              className="action-btn redo-btn"
              onClick={handleRedo}
              title={lastUndo
                ? `Redo: Move "${lastUndo.taskTitle}" to ${STATUS_LABELS[lastUndo.newStatus] || lastUndo.newStatus} (Ctrl+Y)`
                : 'Redo undone status change (Ctrl+Y)'
              }
            >
              <RotateCw size={15} />
              <span className="action-btn-text">
                {lastUndo ? (
                  <>
                    Redo <strong>"{lastUndo.taskTitle}"</strong>
                  </>
                ) : (
                  'Redo'
                )}
              </span>
            </button>
          </div>
          {user?.is_admin && (
            <Button onClick={handleOpenCreate}>
              <Plus size={18} />
              New Task
            </Button>
          )}
        </div>
      </div>

      <TaskFilters
        filters={filters}
        onChange={handleFilterChange}
        employees={employees}
        onClear={handleClearFilters}
      />

      {loading && tasks.length === 0 ? (
        <div className="tasks-loading">
          <Loader size={32} />
          <span>Loading tasks...</span>
        </div>
      ) : error ? (
        <div className="tasks-error">{error}</div>
      ) : (
        <>
          <TaskBoard
            tasks={tasks}
            employees={employees}
            onTaskClick={handleOpenEdit}
            onStatusChange={handleStatusChange}
          />
          <div className="tasks-summary">
            <span className="summary-item">
              <span className="summary-dot" style={{ background: 'var(--primary)' }} />
              {tasks.length} total tasks
            </span>
            <span className="summary-item">
              <span className="summary-dot" style={{ background: '#ef4444' }} />
              {tasks.filter((t) => t.status === 'OVERDUE').length} overdue
            </span>
            <span className="summary-item">
              <span className="summary-dot" style={{ background: '#22c55e' }} />
              {tasks.filter((t) => t.status === 'COMPLETED').length} completed
            </span>
          </div>
        </>
      )}

      {modalOpen && (
        <TaskModal
          task={editingTask}
          employees={employees}
          onSave={handleSave}
          onClose={handleCloseModal}
        />
      )}

      {proofPending && (
        <ProofModal
          task={proofPending.task}
          newStatus={proofPending.newStatus}
          onConfirm={handleProofConfirm}
          onCancel={handleProofCancel}
        />
      )}
    </div>
  )
}

export default TasksPage
