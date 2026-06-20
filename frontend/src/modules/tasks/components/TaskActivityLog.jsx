import React, { useState, useEffect, useCallback } from 'react'
import {
  History,
  PlusCircle,
  ArrowRight,
  UserCheck,
  Flag,
  Edit3,
  MessageSquare,
  Trash2,
  Clock,
} from 'lucide-react'
import Avatar from '../../../components/ui/Avatar'
import { taskApi } from '../services/taskApi'
import '../styles/TaskActivityLog.css'

const ACTION_CONFIG = {
  created: {
    icon: PlusCircle,
    color: '#22c55e',
    label: 'Created',
  },
  status_changed: {
    icon: ArrowRight,
    color: '#3b82f6',
    label: 'Status changed',
  },
  updated: {
    icon: Edit3,
    color: '#f59e0b',
    label: 'Updated',
  },
  commented: {
    icon: MessageSquare,
    color: '#8b5cf6',
    label: 'Commented',
  },
  deleted: {
    icon: Trash2,
    color: '#ef4444',
    label: 'Deleted',
  },
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

const formatValue = (fieldName, value) => {
  if (!value) return value

  if (fieldName === 'priority') {
    return PRIORITY_LABELS[value] || value
  }
  if (fieldName === 'status') {
    return STATUS_LABELS[value] || value
  }
  if (fieldName === 'due date' || fieldName === 'due_date') {
    try {
      return new Date(value).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    } catch {
      return value
    }
  }
  return value
}

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const TaskActivityLog = ({ taskId }) => {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await taskApi.getActivities(taskId)
      setActivities(res.data || [])
    } catch (err) {
      console.error('Failed to fetch activities:', err)
      setError('Failed to load activity log')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    if (taskId) fetchActivities()
  }, [taskId, fetchActivities])

  const getActionDescription = (activity) => {
    const { action, field_name, old_value, new_value } = activity

    switch (action) {
      case 'created':
        return <>created this task</>
      case 'deleted':
        return <>deleted this task</>
      case 'commented':
        return <>added a comment</>
      case 'status_changed':
        return (
          <>
            changed status from{' '}
            <span className="activity-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
              {STATUS_LABELS[old_value] || old_value}
            </span>
            {' '}→{' '}
            <span className="activity-badge" style={{ background: '#dcfce7', color: '#166534' }}>
              {STATUS_LABELS[new_value] || new_value}
            </span>
          </>
        )
      case 'updated':
        if (field_name === 'assignee') {
          return (
            <>
              changed assignee from{' '}
              <strong>{old_value || 'Unassigned'}</strong>
              {' '}→{' '}
              <strong>{new_value || 'Unassigned'}</strong>
            </>
          )
        }
        return (
          <>
            updated <strong>{field_name}</strong>{' '}
            {old_value !== undefined && new_value !== undefined && (
              <>
                from{' '}
                <span className="activity-value-old">{formatValue(field_name, old_value)}</span>
                {' '}→{' '}
                <span className="activity-value-new">{formatValue(field_name, new_value)}</span>
              </>
            )}
          </>
        )
      default:
        return <>{action}: {field_name}</>
    }
  }

  const groupByDate = (items) => {
    const groups = {}
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    items.forEach((item) => {
      const date = new Date(item.created_at).toDateString()
      let label
      if (date === today) label = 'Today'
      else if (date === yesterday) label = 'Yesterday'
      else label = new Date(item.created_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })

      if (!groups[label]) groups[label] = []
      groups[label].push(item)
    })
    return groups
  }

  if (loading) {
    return (
      <div className="activity-log-section">
        <div className="activity-log-header">
          <History size={16} />
          <span>Activity Log</span>
        </div>
        <div className="activity-log-loading">
          <div className="activity-skeleton" />
          <div className="activity-skeleton" />
          <div className="activity-skeleton" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="activity-log-section">
        <div className="activity-log-header">
          <History size={16} />
          <span>Activity Log</span>
        </div>
        <div className="activity-log-error">{error}</div>
      </div>
    )
  }

  const grouped = groupByDate(activities)

  return (
    <div className="activity-log-section">
      <div className="activity-log-header">
        <History size={16} />
        <span>Activity Log</span>
        {activities.length > 0 && (
          <span className="activity-log-count">{activities.length}</span>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="activity-log-empty">
          <History size={24} />
          <span>No activity recorded yet</span>
        </div>
      ) : (
        <div className="activity-log-list">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel} className="activity-date-group">
              <div className="activity-date-label">{dateLabel}</div>
              {items.map((activity) => {
                const config = ACTION_CONFIG[activity.action] || {
                  icon: Edit3, color: '#6b7280', label: activity.action,
                }
                const Icon = config.icon

                return (
                  <div className="activity-item" key={activity.id}>
                    <div
                      className="activity-dot"
                      style={{ background: config.color }}
                    >
                      <Icon size={12} />
                    </div>
                    <div className="activity-content">
                      <div className="activity-text">
                        <span className="activity-user">
                          {activity.user_name || activity.user_email || `User #${activity.user_id}`}
                        </span>
                        {' '}
                        {getActionDescription(activity)}
                      </div>
                      <div className="activity-time">
                        <Clock size={11} />
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TaskActivityLog
