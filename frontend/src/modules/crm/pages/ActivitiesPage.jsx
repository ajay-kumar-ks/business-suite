import React, { useEffect, useState } from 'react'
import { MessageSquare, Phone, Mail, Calendar } from 'lucide-react'
import Loader from '../../../components/ui/Loader'
import { crmAPI } from '../../../services/api'
import '../styles/ActivityTimeline.css'

const activityIcons = {
  note: <MessageSquare size={16} />,
  call: <Phone size={16} />,
  email: <Mail size={16} />,
  meeting: <Calendar size={16} />,
}

const ActivitiesPage = () => {
  const [activities, setActivities] = useState([])
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [activitiesRes, followupsRes] = await Promise.all([
        crmAPI.listActivities(),
        crmAPI.getDueFollowups(),
      ])
      setActivities(activitiesRes.data || [])
      setFollowups(followupsRes.data?.items || [])
    } catch (err) {
      console.error('Failed to load activities', err)
      setError('Failed to load activities. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="loading-state">
        <Loader size={36} />
        <span>Loading activities...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="form-error" style={{ textAlign: 'center', padding: 24 }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Due Follow-ups */}
      <div className="activity-timeline">
        <div className="activity-header">
          <h3>Due Follow-ups</h3>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {followups.length} pending
          </span>
        </div>
        {followups.length === 0 ? (
          <div className="empty-timeline">
            <p>No follow-ups due. You're all caught up!</p>
          </div>
        ) : (
          <div className="timeline">
            {followups.map((f) => (
              <div key={f.id} className="timeline-item">
                <div className="timeline-marker">
                  <div className="icon note">
                    {activityIcons[f.activity_type] || <MessageSquare size={16} />}
                  </div>
                </div>
                <div className="timeline-content">
                  <div className="activity-header-mini">
                    <h4>{f.title}</h4>
                    <span className="activity-type">
                      {f.activity_type || 'Follow-up'}
                    </span>
                  </div>
                  <div className="activity-meta">
                    <span className="time">{formatDate(f.follow_up_date)}</span>
                    <span>Contact: {f.contact_id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activities */}
      <div className="activity-timeline">
        <div className="activity-header">
          <h3>Recent Activities</h3>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {activities.length} total
          </span>
        </div>
        {activities.length === 0 ? (
          <div className="empty-timeline">
            <p>No recent activities found.</p>
          </div>
        ) : (
          <div className="timeline">
            {activities.map((a) => (
              <div key={a.id} className="timeline-item">
                <div className="timeline-marker">
                  <div className={`icon ${a.activity_type || 'note'}`}>
                    {activityIcons[a.activity_type] || <MessageSquare size={16} />}
                  </div>
                </div>
                <div className="timeline-content">
                  <div className="activity-header-mini">
                    <h4>{a.title}</h4>
                    <span className="activity-type">
                      {a.activity_type || 'Activity'}
                    </span>
                  </div>
                  {a.description && <p>{a.description}</p>}
                  <div className="activity-meta">
                    <span className="time">{formatDate(a.created_at)}</span>
                    <span>Contact: {a.contact_id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivitiesPage
