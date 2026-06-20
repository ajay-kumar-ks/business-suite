import React, { useState } from 'react'
import { ChevronRight, User, Briefcase, Clock } from 'lucide-react'

const PIPELINE_STAGES = [
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

const RecruitmentKanban = ({ candidates = [], onMoveStage, onViewDetails, onConvertToEmployee, onRefresh }) => {
  const [selectedCandidate, setSelectedCandidate] = useState(null)

  const getCandidatesByStage = (stage) => {
    return candidates.filter((c) => c.current_stage === stage)
  }

  const handleDragStart = (e, candidate) => {
    e.dataTransfer.setData('candidateId', candidate.id.toString())
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e, targetStage) => {
    e.preventDefault()
    const candidateId = parseInt(e.dataTransfer.getData('candidateId'), 10)
    if (!candidateId) return

    const candidate = candidates.find((c) => c.id === candidateId)
    if (!candidate) return

    // Don't allow dropping on the same stage
    if (candidate.current_stage === targetStage) return

    try {
      await onMoveStage(candidateId, targetStage)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to move candidate:', err)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const getNextForwardStage = (currentStage) => {
    const idx = PIPELINE_STAGES.indexOf(currentStage)
    if (idx < 0) return null
    // Skip Rejected for auto-advance
    const nextIdx = idx + 1
    if (nextIdx >= PIPELINE_STAGES.length) return null
    const nextStage = PIPELINE_STAGES[nextIdx]
    if (nextStage === 'Rejected') return PIPELINE_STAGES[nextIdx + 1] || null
    return nextStage
  }

  const handleAdvance = async (candidate) => {
    const nextStage = getNextForwardStage(candidate.current_stage)
    if (!nextStage) return
    try {
      await onMoveStage(candidate.id, nextStage)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to advance candidate:', err)
    }
  }

  return (
    <div className="kanban-board">
      {PIPELINE_STAGES.map((stage) => {
        const stageCandidates = getCandidatesByStage(stage)
        return (
          <div
            key={stage}
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="kanban-column-header" style={{ borderTopColor: STAGE_COLORS[stage] || '#6b7280' }}>
              <div className="kanban-column-title">
                <span className="kanban-stage-dot" style={{ backgroundColor: STAGE_COLORS[stage] || '#6b7280' }} />
                <span>{stage}</span>
              </div>
              <span className="kanban-count">{stageCandidates.length}</span>
            </div>
            <div className="kanban-column-body">
              {stageCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="kanban-card"
                  draggable={stage !== 'Onboarded' && stage !== 'Rejected'}
                  onDragStart={(e) => handleDragStart(e, candidate)}
                  onClick={() => {
                    setSelectedCandidate(candidate)
                    onViewDetails?.(candidate)
                  }}
                >
                  <div className="kanban-card-name">{candidate.full_name}</div>
                  <div className="kanban-card-position">
                    <Briefcase size={12} />
                    <span>{candidate.position_applied}</span>
                  </div>
                  <div className="kanban-card-exp">
                    <Clock size={12} />
                    <span>{candidate.experience_years} yrs</span>
                  </div>
                  <div className="kanban-card-actions">
                    {stage === 'Selected' && (
                      <button
                        className="kanban-convert-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onConvertToEmployee?.(candidate)
                        }}
                        title="Convert to Employee"
                      >
                        Convert to Employee
                      </button>
                    )}
                    {stage !== 'Rejected' && stage !== 'Onboarded' && stage !== 'Selected' && getNextForwardStage(stage) && (
                      <button
                        className="kanban-advance-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAdvance(candidate)
                        }}
                        title={`Move to ${getNextForwardStage(stage)}`}
                      >
                        <ChevronRight size={14} />
                        {getNextForwardStage(stage)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {stageCandidates.length === 0 && (
                <div className="kanban-empty">No candidates</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default RecruitmentKanban
