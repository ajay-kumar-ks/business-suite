import React from 'react'
import { Users, UserPlus, UserCheck, UserX, ClipboardList, Briefcase } from 'lucide-react'

const STAGE_CARDS = [
  { key: 'total_candidates', label: 'Total Candidates', icon: Users, color: '#3b82f6', bg: '#eff6ff' },
  { key: 'applied', label: 'Applied', icon: ClipboardList, color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'in_interview', label: 'In Interview', icon: UserCheck, color: '#f59e0b', bg: '#fffbeb' },
  { key: 'selected', label: 'Selected', icon: UserPlus, color: '#22c55e', bg: '#f0fdf4' },
  { key: 'rejected', label: 'Rejected', icon: UserX, color: '#ef4444', bg: '#fef2f2' },
  { key: 'onboarded', label: 'Onboarded', icon: Briefcase, color: '#14b8a6', bg: '#f0fdfa' },
]

const RecruitmentDashboard = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="dashboard-cards">
        {STAGE_CARDS.map((card) => (
          <div key={card.key} className="dashboard-card" style={{ opacity: 0.5 }}>
            <div className="card-icon-wrapper" style={{ background: card.bg, color: card.color }}>
              <card.icon size={22} />
            </div>
            <div className="card-info">
              <span className="card-value">—</span>
              <span className="card-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  return (
    <>
      <div className="dashboard-cards">
        {STAGE_CARDS.map((card) => {
          const IconComp = card.icon
          return (
            <div key={card.key} className="dashboard-card">
              <div className="card-icon-wrapper" style={{ background: card.bg, color: card.color }}>
                <IconComp size={22} />
              </div>
              <div className="card-info">
                <span className="card-value">{stats[card.key] ?? 0}</span>
                <span className="card-label">{card.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {stats.hiring && (
        <div className="charts-section" style={{ marginBottom: 24 }}>
          <div className="chart-card">
            <h4>Hiring Success Rate</h4>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#22c55e' }}>
                {stats.hiring.success_rate}%
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                {stats.hiring.onboarded} onboarded out of {stats.hiring.total_candidates} total
              </div>
            </div>
          </div>
          <div className="chart-card">
            <h4>Candidates by Stage</h4>
            <div style={{ padding: '12px 0' }}>
              {(stats.by_stage || []).map((item) => (
                <div key={item.stage} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                  <span style={{ color: '#475569' }}>{item.stage}</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.count}</span>
                </div>
              ))}
              {(!stats.by_stage || stats.by_stage.length === 0) && (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: 12, fontSize: '0.85rem' }}>No data yet</div>
              )}
            </div>
          </div>
          <div className="chart-card">
            <h4>Open Positions</h4>
            <div style={{ padding: '12px 0' }}>
              {(stats.by_position || []).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                  <span style={{ color: '#475569' }}>{item.position}</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.count}</span>
                </div>
              ))}
              {(!stats.by_position || stats.by_position.length === 0) && (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: 12, fontSize: '0.85rem' }}>No data yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default RecruitmentDashboard
