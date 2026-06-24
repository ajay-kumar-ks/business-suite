import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Edit3, Trash2 } from 'lucide-react'

const PhaseCardContent = ({
  phase,
  dragHandleProps,
  onEditPhaseStart,
  onDeletePhase,
  isOverlay = false,
}) => {
  return (
    <div className={`ps-phase-row${isOverlay ? ' ps-phase-row-overlay' : ''}`}>
      <div className="ps-phase-info">
        <div className="ps-phase-visual">
          {!isOverlay && (
            <button
              type="button"
              className="ps-drag-handle"
              {...dragHandleProps}
              aria-label="Drag phase"
            >
              <GripVertical size={16} />
            </button>
          )}
          <span className="ps-phase-dot" style={{ background: phase.color }} />
          <span className="ps-phase-name">{phase.name}</span>
        </div>

        <div className="ps-phase-badges">
          {phase.isNew && <span className="ps-badge-sm warning">Pending</span>}
          {phase.is_terminal && <span className="ps-badge-sm info">Terminal</span>}
        </div>
      </div>

      {!isOverlay && (
        <div className="ps-phase-controls">
          <button
            type="button"
            className="ps-icon-btn"
            onClick={() => onEditPhaseStart(phase)}
            title="Edit"
          >
            <Edit3 size={14} />
          </button>
          <button
            type="button"
            className="ps-icon-btn danger"
            onClick={() => onDeletePhase(phase.id)}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

export function PhaseCardDragOverlay({ phase }) {
  if (!phase) return null

  return (
    <div className={`ps-phase-item ps-drag-overlay${phase.isNew ? ' pending' : ''}`}>
      <div className="ps-phase-row ps-phase-row-overlay">
        <div className="ps-phase-info">
          <div className="ps-phase-visual">
            <span className="ps-phase-dot" style={{ background: phase.color }} />
            <span className="ps-phase-name">{phase.name}</span>
          </div>
          <div className="ps-phase-badges">
            {phase.isNew && <span className="ps-badge-sm warning">Pending</span>}
            {phase.is_terminal && <span className="ps-badge-sm info">Terminal</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SortablePhaseCard({ phase, onEditPhaseStart, onDeletePhase, isOver }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(phase.id) })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 180ms ease',
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 999 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ps-phase-item${phase.isNew ? ' pending' : ''}${isOver ? ' drag-over' : ''}${isDragging ? ' dragging' : ''}`}
    >
      <PhaseCardContent
        phase={phase}
        dragHandleProps={{ ...attributes, ...listeners }}
        onEditPhaseStart={onEditPhaseStart}
        onDeletePhase={onDeletePhase}
      />
    </div>
  )
}
