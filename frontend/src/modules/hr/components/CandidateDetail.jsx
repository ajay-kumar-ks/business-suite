import React from 'react'
import { X, Mail, Phone, Briefcase, Clock, User, ArrowDown } from 'lucide-react'

const ALL_STAGES = [
  'Applied',
  'Screening',
  'Interview',
  'Technical Round',
  'HR Round',
  'Selected',
  'Rejected',
  'Onboarded',
]

const STAGE_COLORS = {
  Applied: '#8b5cf6',
  Screening: '#3b82f6',
  Interview: '#f59e0b',
  'Technical Round': '#f97316',
  'HR Round': '#ec4899',
  Selected: '#22c55e',
  Rejected: '#ef4444',
  Onboarded: '#14b8a6',
}

const CandidateDetail = ({ candidate, onClose }) => {
  if (!candidate) return null

  const currentStageIndex = ALL_STAGES.indexOf(candidate.current_stage)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3>Candidate Details</h3>
          <button className="modal-close" onClick={onClose} type="button" title="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Candidate Info */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--text, #1e293b)' }}>
              {candidate.full_name}
            </h4>
            <span
              className="status-badge"
              style={{
                backgroundColor: STAGE_COLORS[candidate.current_stage] || '#6b7280',
                fontSize: '0.78rem',
                marginTop: 8,
                display: 'inline-block',
              }}
            >
              {candidate.current_stage}
            </span>
          </div>

          {/* Contact Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: 'var(--text, #1e293b)' }}>
              <Mail size={16} style={{ color: '#64748b', flexShrink: 0 }} />
              <span>{candidate.email}</span>
            </div>
            {candidate.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: 'var(--text, #1e293b)' }}>
                <Phone size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                <span>{candidate.phone}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: 'var(--text, #1e293b)' }}>
              <Briefcase size={16} style={{ color: '#64748b', flexShrink: 0 }} />
              <span>{candidate.position_applied}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: 'var(--text, #1e293b)' }}>
              <Clock size={16} style={{ color: '#64748b', flexShrink: 0 }} />
              <span>{candidate.experience_years} years experience</span>
            </div>
          </div>

          {/* Notes */}
          {candidate.notes && (
            <div style={{ marginBottom: 24 }}>
              <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text, #1e293b)' }}>Notes</h5>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>{candidate.notes}</p>
            </div>
          )}

          {/* Stage Timeline */}
          <div>
            <h5 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text, #1e293b)' }}>
              Stage Timeline
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {ALL_STAGES.map((stage, idx) => {
                const reached = idx <= currentStageIndex
                const isCurrent = idx === currentStageIndex
                const isRejected = stage === 'Rejected'
                const isOnboarded = stage === 'Onboarded'

                // Skip showing Rejected/Onboarded unless they are the current stage
                if ((isRejected || isOnboarded) && !isCurrent && currentStageIndex < idx) return null

                // Skip showing rejected-only stages after rejected
                if (candidate.current_stage === 'Rejected' && idx > currentStageIndex && !isOnboarded) return null

                // Skip showing stages after Onboarded
                if (candidate.current_stage === 'Onboarded' && idx > currentStageIndex) return null

                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: reached ? (STAGE_COLORS[stage] || '#6b7280') : '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: isCurrent ? '3px solid var(--primary, #2563eb)' : 'none',
                          boxShadow: isCurrent ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
                        }}
                      >
                        {reached && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#fff' }} />
                        )}
                      </div>
                      {idx < ALL_STAGES.length - 1 && (
                        <div
                          style={{
                            width: 2,
                            height: 24,
                            backgroundColor: reached ? (STAGE_COLORS[stage] || '#6b7280') : '#e2e8f0',
                            opacity: reached ? 1 : 0.4,
                          }}
                        />
                      )}
                    </div>
                    <div style={{ paddingBottom: 8, marginTop: 1 }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: isCurrent ? 600 : 400,
                          color: reached ? 'var(--text, #1e293b)' : '#94a3b8',
                        }}
                      >
                        {stage}
                        {isCurrent && (
                          <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#2563eb', fontWeight: 500 }}>
                            (Current)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CandidateDetail
