import React, { useState, useRef, useMemo } from 'react'
import {
  Clock,
  Calendar,
  FileText,
  UserPlus,
  Target,
  Building2,
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

const RecruitmentKanban = ({
  candidates = [],
  departments = [],
  onMoveStage,
  onViewDetails,
  onConvertToEmployee,
  onRefresh,
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const dragCandidateRef = useRef(null)

  // Filter candidates by selected department
  const filteredCandidates = useMemo(() => {
    if (selectedDepartment === 'all') return candidates
    return candidates.filter((c) => c.department_id?.toString() === selectedDepartment)
  }, [candidates, selectedDepartment])

  // Get pipeline stages for the selected department
  const pipelineStages = useMemo(() => {
    if (selectedDepartment === 'all') {
      // When showing all, merge all stages from all candidates
      const ordered = []
      const seen = new Set()
      filteredCandidates.forEach((c) => {
        if (c.pipeline_stages && Array.isArray(c.pipeline_stages)) {
          c.pipeline_stages.forEach((s) => {
            if (!seen.has(s)) { seen.add(s); ordered.push(s) }
          })
        }
      })
      filteredCandidates.forEach((c) => {
        if (c.current_stage && !seen.has(c.current_stage)) {
          seen.add(c.current_stage)
          ordered.push(c.current_stage)
        }
      })
      if (!seen.has('Rejected')) ordered.push('Rejected')
      return ordered
    }

    // Find the department's pipeline from candidates
    const deptCandidates = candidates.filter(
      (c) => c.department_id?.toString() === selectedDepartment
    )
    const stages = deptCandidates.find((c) => c.pipeline_stages)?.pipeline_stages
    if (stages) {
      const result = [...stages]
      if (!result.includes('Rejected')) result.push('Rejected')
      return result
    }

    // Default pipeline
    return ['Applied', 'Screening', 'Interview', 'HR Interview', 'Selected', 'Onboarded', 'Rejected']
  }, [filteredCandidates, candidates, selectedDepartment])

  const getCandidatesByStage = (stage) => {
    return filteredCandidates.filter((c) => c.current_stage === stage)
  }

  const handleDragStart = (e, candidate) => {
    dragCandidateRef.current = candidate
    // Use standard text/plain for better browser compatibility
    e.dataTransfer.setData('text/plain', candidate.id.toString())
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
    e.stopPropagation()
    setDragOverColumn(null)

    // Use ref as primary source (more reliable than dataTransfer across browsers)
    const candidate = dragCandidateRef.current
    if (!candidate) return

    if (candidate.current_stage === targetStage) return
    if (['Rejected', 'Onboarded'].includes(candidate.current_stage) || candidate.converted_to_employee) return

    try {
      await onMoveStage(candidate.id, targetStage)
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
            return (
              <div
                key={candidate.id}
                className="kanban-card"
                draggable={!isTerminalStage(stage) && !candidate.converted_to_employee}
                onDragStart={(e) => handleDragStart(e, candidate)}
                onDragEnd={handleDragEnd}
                onClick={() => onViewDetails?.(candidate)}
              >
                <div className="kanban-card-name">
                  {candidate.full_name}
                  {candidate.converted_to_employee && (
                    <span className="kanban-converted-badge">
                      ✓ Converted
                    </span>
                  )}
                </div>
                <div className="kanban-card-position">
                  <Building2 size={11} />
                  <span>{candidate.department_name || 'No Department'}</span>
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
                {stage === 'Onboarded' && !candidate.converted_to_employee && (
                  <div className="kanban-card-actions">
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
                  </div>
                )}
              </div>
            )
          })}
          {stageCandidates.length === 0 && (
            <div className="kanban-empty">
              <Target size={18} className="kanban-empty-icon" />
              <span className="kanban-empty-text">No candidates</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="kanban-wrapper">
      {/* Department Selector */}
      <div className="kanban-controls">
        <Building2 size={18} className="kanban-controls-icon" />
        <select
          className="kanban-dept-select"
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <span className="count-badge">
          {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Kanban Board — wrapped in scroll container so only stages scroll horizontally */}
      <div className="kanban-board-scroll">
        <div className="kanban-board">
          {pipelineStages.map((stage, idx) => renderColumn(stage, idx))}
        </div>
      </div>
    </div>
  )
}

export default RecruitmentKanban
