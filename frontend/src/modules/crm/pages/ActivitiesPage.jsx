import React, { useEffect, useState } from 'react'
import { crmAPI } from '../../../services/api'
import '../styles/ActivityTimeline.css'

const ActivitiesPage = () => {
  const [activities, setActivities] = useState([])
  const [followups, setFollowups] = useState([])

  const fetchActivities = async () => {
    try {
      const res = await crmAPI.listActivities()
      setActivities(res.data || [])
    } catch (err) {
      console.error('Failed to load activities', err)
    }
  }

  const fetchFollowups = async () => {
    try {
      const res = await crmAPI.getDueFollowups()
      setFollowups(res.data.items || [])
    } catch (err) {
      console.error('Failed to load follow-ups', err)
    }
  }

  useEffect(() => {
    fetchActivities()
    fetchFollowups()
  }, [])

  return (
    <section className="crm-card">
      <h3>Activities</h3>

      <div style={{ marginTop: 12 }}>
        <h4>Due Follow-ups</h4>
        {followups.length === 0 ? (
          <p>No follow-ups due.</p>
        ) : (
          <ul>
            {followups.map(f => (
              <li key={f.id}>{f.title} — {new Date(f.follow_up_date).toLocaleString()} (Contact: {f.contact_id})</li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <h4>Recent Activities</h4>
        {activities.length === 0 ? (
          <p>No recent activities.</p>
        ) : (
          <ul>
            {activities.map(a => (
              <li key={a.id}>{a.title} — {new Date(a.created_at).toLocaleString()} (Contact: {a.contact_id})</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default ActivitiesPage
