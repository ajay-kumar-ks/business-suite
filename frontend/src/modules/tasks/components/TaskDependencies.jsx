import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Link2,
  Unlink,
  Plus,
  X,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import { taskApi } from '../services/taskApi'
import { useAuth } from '../../../context/AuthContext'
import '../styles/TaskDependencies.css'

const STATUS_ICONS = {
  COMPLETED: CheckCircle2,
  OVERDUE: AlertCircle,
  ON_PROGRESS: Clock,
}

const PRIORITY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

const STATUS_LABELS = {
  TODO: 'Todo',
  ON_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  ON_REVIEW: 'On Review',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
}

const TaskDependencies = ({ taskId }) => {
  const { user } = useAuth()
  const isAdmin = user?.is_admin

  const [blockedBy, setBlockedBy] = useState([])
  const [blocking, setBlocking] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Add dependency search
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  const searchRef = useRef(null)

  const fetchDependencies = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await taskApi.getDependencies(taskId)
      setBlockedBy(res.data.blocked_by || [])
      setBlocking(res.data.blocking || [])
    } catch (err) {
      console.error('Failed to fetch dependencies:', err)
      setError('Failed to load dependencies')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    if (taskId) fetchDependencies()
  }, [taskId, fetchDependencies])

  // Search tasks for adding dependency
  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await taskApi.getTasks({ search: query })
      // Filter out current task and already-added dependencies
      const existingIds = new Set([taskId, ...blockedBy.map((d) => d.depends_on_task_id)])
      setSearchResults((res.data || []).filter((t) => !existingIds.has(t.id)))
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [taskId, blockedBy])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) handleSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  const handleAddDependency = async (dependsOnTaskId) => {
    setAdding(true)
    try {
      await taskApi.createDependency(taskId, { depends_on_task_id: dependsOnTaskId })
      setShowAddForm(false)
      setSearchQuery('')
      setSearchResults([])
      await fetchDependencies()
    } catch (err) {
      console.error('Failed to add dependency:', err)
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveDependency = async (depId) => {
    try {
      await taskApi.deleteDependency(taskId, depId)
      await fetchDependencies()
    } catch (err) {
      console.error('Failed to remove dependency:', err)
    }
  }

  // Exclude current task and existing deps from search results
  const filteredResults = useMemo(() => {
    const existingIds = new Set([taskId, ...blockedBy.map((d) => d.depends_on_task_id)])
    return searchResults.filter((t) => !existingIds.has(t.id))
  }, [searchResults, taskId, blockedBy])

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="deps-section">
        <div className="deps-header">
          <Link2 size={16} />
          <span>Dependencies</span>
        </div>
        <div className="deps-loading">
          <div className="deps-skeleton" />
          <div className="deps-skeleton" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="deps-section">
        <div className="deps-header">
          <Link2 size={16} />
          <span>Dependencies</span>
        </div>
        <div className="deps-error">{error}</div>
      </div>
    )
  }

  const formatStatus = (status) => {
    if (!status) return ''
    return STATUS_LABELS[status] || status
  }

  return (
    <div className="deps-section">
      <div className="deps-header">
        <Link2 size={16} />
        <span>Dependencies</span>
        {(blockedBy.length + blocking.length) > 0 && (
          <span className="deps-count">{blockedBy.length + blocking.length}</span>
        )}
      </div>

      {blockedBy.length === 0 && blocking.length === 0 && !showAddForm ? (
        <div className="deps-empty">
          <Link2 size={24} />
          <span>No dependencies yet</span>
          {isAdmin && (
            <Button onClick={() => setShowAddForm(true)} size="small">
              <Plus size={14} />
              Add Dependency
            </Button>
          )}
        </div>
      ) : (
        <div className="deps-list">
          {/* Blocked By (this task depends on others) */}
          {blockedBy.length > 0 && (
            <div className="deps-group">
              <div className="deps-group-label">Blocked By</div>
              {blockedBy.map((dep) => (
                <div className="deps-item deps-item-blocked" key={dep.id}>
                  <div className="deps-item-connector" />
                  <div className="deps-item-content">
                    <div className="deps-item-title">{dep.title || 'Unknown task'}</div>
                    <div className="deps-item-meta">
                      {dep.status && (
                        <span className={`deps-status-badge deps-status-${dep.status.toLowerCase()}`}>
                          {formatStatus(dep.status)}
                        </span>
                      )}
                      {dep.priority && (
                        <span className={`deps-priority-badge deps-priority-${dep.priority.toLowerCase()}`}>
                          {PRIORITY_LABELS[dep.priority]}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      className="deps-remove-btn"
                      onClick={() => handleRemoveDependency(dep.id)}
                      title="Remove dependency"
                      type="button"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Blocking (others depend on this task) */}
          {blocking.length > 0 && (
            <div className="deps-group">
              <div className="deps-group-label">Blocking</div>
              {blocking.map((dep) => {
                const StatusIcon = STATUS_ICONS[dep.status] || null
                return (
                  <div className="deps-item deps-item-blocking" key={dep.id}>
                    <div className="deps-item-connector deps-connector-out" />
                    <div className="deps-item-content">
                      <div className="deps-item-title">{dep.title || 'Unknown task'}</div>
                      <div className="deps-item-meta">
                        {dep.status && (
                          <span className={`deps-status-badge deps-status-${dep.status.toLowerCase()}`}>
                            {StatusIcon && <StatusIcon size={11} />}
                            {formatStatus(dep.status)}
                          </span>
                        )}
                        {dep.priority && (
                          <span className={`deps-priority-badge deps-priority-${dep.priority.toLowerCase()}`}>
                            {PRIORITY_LABELS[dep.priority]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add Dependency Button */}
          {isAdmin && !showAddForm && (
            <button className="deps-add-btn" onClick={() => setShowAddForm(true)} type="button">
              <Plus size={14} />
              Add Dependency
            </button>
          )}
        </div>
      )}

      {/* Add Dependency Search Form */}
      {isAdmin && showAddForm && (
        <div className="deps-add-form">
          <div className="deps-search-wrapper">
            <Search size={14} className="deps-search-icon" />
            <input
              ref={searchRef}
              type="text"
              className="deps-search-input"
              placeholder="Search tasks by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button
              className="deps-search-close"
              onClick={() => { setShowAddForm(false); setSearchQuery(''); setSearchResults([]) }}
              type="button"
            >
              <X size={14} />
            </button>
          </div>

          {searchQuery && (
            <div className="deps-search-results">
              {searching ? (
                <div className="deps-search-status">Searching...</div>
              ) : filteredResults.length === 0 ? (
                <div className="deps-search-status">No tasks found</div>
              ) : (
                filteredResults.map((t) => (
                  <div
                    className="deps-search-result"
                    key={t.id}
                    onClick={() => handleAddDependency(t.id)}
                  >
                    <div className="deps-result-info">
                      <span className="deps-result-title">{t.title}</span>
                      <span className="deps-result-meta">
                        <span className={`deps-priority-badge deps-priority-${(t.priority || 'medium').toLowerCase()}`}>
                          {PRIORITY_LABELS[t.priority] || t.priority}
                        </span>
                        {t.due_date && <span>Due {formatDate(t.due_date)}</span>}
                      </span>
                    </div>
                    <ArrowRight size={14} className="deps-result-arrow" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskDependencies
