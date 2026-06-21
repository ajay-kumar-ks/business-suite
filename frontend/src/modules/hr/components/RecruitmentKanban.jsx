import React, { useState, useRef, useMemo } from 'react'
import {
  Briefcase,
  Clock,
  Calendar,
  FileText,
  ArrowRight,
  UserPlus,
  Target,
  CheckCircle2,
} from 'lucide-react'

const DEFAULT_STAGE_COLORS = {
  Applied: '#8b5cf6',
  Screening: '#3b82f6',
  Interview: '#f59e0b',
  'Technical Round': '#f97316',
  'Technical Test': '#f97316',
  'Technical Interview': '#f97316',
  'HR Round': '#ec4899',
  'HR Interview': '#ec4899',
  'HR Manager Interview': '#ec4899',
  'Design Interview': '#f97316',
  'Design Assignment': '#f59e0b',
  'Portfolio Review': '#8b5cf6',
  'Communication Test': '#3b82f6',
  Selected: '#22c55e',
  Rejected: '#ef4444',
  Onboarded: '#14b8a6',
  Converted: '#3b82f6',
}

const PIPELINE_COLORS = ['#8b5cf6', '#3b82f6', '#f59e0b', '#f97316', '#ec4899', '#22c55e', '#14b8a6', '#ef4444']

const getStageColor = (stage, index) => {
  return DEFAULT_STAGE_COLORS[stage] || PIPELINE_COLORS[index % PIPELINE_COLORS.length] || '#6b7280'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const RecruitmentKanban = ({ candidates = [], onMoveStage, onViewDetails, onConvertToEmployee, onRefresh }) => {
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const dragCandidateRef = useRef(null)

  // Extract all unique pipeline stages across all candidates
  const allStages = useMemo(() => {
    const ordered = []
    const seen = new Set()

    // Collect stages from candidates' pipeline templates (ordered)
    candidates.forEach((c) => {
      if (c.pipeline_stages && Array.isArray(c.pipeline_stages)) {
        c.pipeline_stages.forEach((s) => {
          if (!seen.has(s)) {
            seen.add(s)
            ordered.push(s)
          }
        })
      }
    })

    // Ensure every candidate's current_stage has a column (backward compat)
    candidates.forEach((c) => {
      if (c.current_stage && !seen.has(c.current_stage)) {
        seen.add(c.current_stage)
        ordered.push(c.current_stage)
      }
    })

    // Always include Rejected
    if (!seen.has('Rejected')) {
      ordered.push('Rejected')
    }

    return ordered
  }, [candidates])

  const getCandidatesByStage = (stage) => {
    return candidates.filter((c) => c.current_stage === stage)
  }

  const handleDragStart = (e, candidate) => {
    dragCandidateRef.current = candidate
    e.dataTransfer.setData('candidateId', candidate.id.toString())
    e.dataTransfer.effectAllowed = 'move'
    e.target.classList.add('dragging')
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging')
    setDragOverColumn(null)
    dragCandidateRef.current = null
  }

  const handleDrop = async (e, targetStage) => {
    e.preventDefault()
    setDragOverColumn(null)
    const candidateId = parseInt(e.dataTransfer.getData('candidateId'), 10)
    if (!candidateId) return

    const candidate = candidates.find((c) => c.id === candidateId)
    if (!candidate) return

    // Don't allow dropping on the same stage
    if (candidate.current_stage === targetStage) return

    // Don't allow dropping if candidate is in a terminal stage
    if (candidate.current_stage === 'Rejected' || candidate.current_stage === 'Onboarded' || candidate.converted_to_employee) return

    // Don't allow dropping onto Rejected if candidate is already past or terminal
    if (targetStage === 'Rejected' || targetStage === 'Onboarded') {
      if (candidate.converted_to_employee) return
    }

    try {
      await onMoveStage(candidateId, targetStage)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to move candidate:', err)
    }
  }

  const handleDragOver = (e, stage) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(stage)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const getNextForwardStage = (candidate) => {
    const stages = candidate.pipeline_stages || []
    const idx = stages.indexOf(candidate.current_stage)
    if (idx < 0 || idx >= stages.length - 1) return null
    return stages[idx + 1]
  }

  const handleAdvance = async (candidate) => {
    const nextStage = getNextForwardStage(candidate)
    if (!nextStage) return
    try {
      await onMoveStage(candidate.id, nextStage)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to advance candidate:', err)
    }
  }

  const isTerminalStage = (stage) => {
    return stage === 'Rejected' || stage === 'Onboarded'
  }

  const renderColumn = (stage, idx) => {
    const stageCandidates = getCandidatesByStage(stage)
    const isDragOver = dragOverColumn === stage
    const color = getStageColor(stage, idx)

    return (
      <div
        key={stage}
        className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => handleDragOver(e, stage)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, stage)}
      >
        <div className="kanban-column-header" style={{ borderTopColor: color }}>
          <div className="kanban-column-title">
            <span className="kanban-stage-dot" style={{ backgroundColor: color }} />
            <span>{stage}</span>
          </div>
          <span className="kanban-count">{stageCandidates.length}</span>
        </div>
        <div className="kanban-column-body">
          {stageCandidates.map((candidate) => {
            const nextStage = getNextForwardStage(candidate)
            return (
              <div
                key={candidate.id}
                className="kanban-card"
                draggable={!isTerminalStage(stage) && !candidate.converted_to_employee}
                onDragStart={(e) => handleDragStart(e, candidate)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  setSelectedCandidate(candidate)
                  onViewDetails?.(candidate)
                }}
              >
                <div className="kanban-card-name">
                  {candidate.full_name}
                  {candidate.converted_to_employee && (
                    <span style={{ marginLeft: 4, color: '#3b82f6', fontSize: '0.65rem', fontWeight: 600 }}>
                      ✓ Converted
                    </span>
                  )}
                </div>
                <div className="kanban-card-position">
                  <Briefcase size={11} />
                  <span>{candidate.position_applied}</span>
                </div>
                <div className="kanban-card-exp">
                  <Clock size={11} />
                  <span>{candidate.experience_years} yrs</span>
                </div>
                <div className="kanban-card-meta">
                  <div className="kanban-card-date">
                    <Calendar size={11} />
                    <span>{formatDate(candidate.created_at)}</span>
                  </div>
                  {candidate.resume_url && (
                    <button
                      className="kanban-card-resume"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(candidate.resume_url, '_blank')
                      }}
                      title="View Resume"
                    >
                      <FileText size={10} />
                      Resume
                    </button>
                  )}
                  {!candidate.resume_url && (
                    <span className="kanban-card-resume" style={{ opacity: 0.3, cursor: 'default' }}>
                      <FileText size={10} />
                    </span>
                  )}
                </div>
                <div className="kanban-card-actions">
                  {/* Convert to Employee: only for Onboarded candidates not yet converted */}
                  {stage === 'Onboarded' && !candidate.converted_to_employee && (
                    <button
                      className="kanban-convert-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onConvertToEmployee?.(candidate)
                      }}
                      title="Convert to Employee"
                    >
                      <UserPlus size={11} />
                      Convert
                    </button>
                  )}
                  {/* Show converted badge instead */}
                  {stage === 'Onboarded' && candidate.converted_to_employee && (
                    <span style={{ fontSize: '0.6rem', color: '#3b82f6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CheckCircle2 size={10} />
                      Converted
                    </span>
                  )}
                  {/* Advance button: for active, non-terminal stages that aren't Rejected/Onboarded */}
                  {!isTerminalStage(stage) && !candidate.converted_to_employee && nextStage && (
                    <button
                      className="kanban-advance-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAdvance(candidate)
                      }}
                      title={`Move to ${nextStage}`}
                    >
                      <ArrowRight size={11} />
                      {nextStage}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {stageCandidates.length === 0 && (
            <div className="kanban-empty">
              <Target size={18} className="kanban-empty-icon" />
              <span className="kanban-empty-text">No candidates in this stage</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="kanban-wrapper">
      <div className="kanban-board">
        {allStages.map((stage, idx) => renderColumn(stage, idx))}
      </div>
    </div>
  )
}

export default RecruitmentKanban
