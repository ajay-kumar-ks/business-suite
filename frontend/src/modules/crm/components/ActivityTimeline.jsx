import React, { useState } from 'react'
import { MessageSquare, Phone, Mail, Calendar, FileText, Plus } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Select from '../../../components/ui/Select'
import Loader from '../../../components/ui/Loader'
import '../styles/ActivityTimeline.css'

const ActivityTimeline = ({ contactId, activities = [], onActivityAdd }) => {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    activity_type: 'note',
    title: '',
    description: '',
    follow_up_date: '',
    meta_data: {}
  })
  const [loading, setLoading] = useState(false)

  const activityIcons = {
    note: <MessageSquare size={16} />,
    call: <Phone size={16} />,
    email: <Mail size={16} />,
    meeting: <Calendar size={16} />,
    file: <FileText size={16} />
  }

  const activityLabels = {
    note: 'Note',
    call: 'Call',
    email: 'Email',
    meeting: 'Meeting',
    file: 'File'
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/crm/contacts/${contactId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to add activity')

      const newActivity = await response.json()
      onActivityAdd(newActivity)

      // Reset form
      setFormData({
        activity_type: 'note',
        title: '',
        description: '',
        follow_up_date: '',
        meta_data: {}
      })
      setShowForm(false)
    } catch (error) {
      console.error('Failed to add activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="activity-timeline">
      <div className="activity-header">
        <h3>Activity Timeline</h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="activity-add-btn"
          data-tooltip={showForm ? 'Close Activity Form' : 'Add Activity'}
          aria-label={showForm ? 'Close Activity Form' : 'Add Activity'}
        >
          <Plus size={18} />
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="activity-form">
          <div className="form-group">
            <Select
              label="Activity Type"
              name="activity_type"
              value={formData.activity_type}
              onChange={handleInputChange}
              options={Object.keys(activityLabels).map(key => ({
                value: key,
                label: activityLabels[key]
              }))}
            />
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Activity title..."
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Add details..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Follow-up Date</label>
            <input
              type="datetime-local"
              name="follow_up_date"
              value={formData.follow_up_date}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-actions">
            <Button type="button" className="btn-secondary" onClick={() => setShowForm(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <Loader size={16} /> Adding...
                </>
              ) : (
                'Add Activity'
              )}
            </Button>
          </div>
        </form>
      )}

      <div className="timeline">
        {activities && activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="timeline-item">
              <div className="timeline-marker">
                <div className={`icon ${activity.activity_type}`}>
                  {activityIcons[activity.activity_type]}
                </div>
              </div>
              <div className="timeline-content">
                <div className="activity-header-mini">
                  <h4>{activity.title}</h4>
                  <span className="activity-type">{activityLabels[activity.activity_type]}</span>
                </div>
                {activity.description && <p>{activity.description}</p>}
                <div className="activity-meta">
                  <span className="time">{formatDate(activity.created_at)}</span>
                  {activity.follow_up_date && (
                    <span className="follow-up">
                      Follow-up: {formatDate(activity.follow_up_date)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-timeline">
            <p>No activities yet. Add one to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityTimeline
