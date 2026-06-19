import React from 'react'
import { X, ArrowLeftRight, CheckCircle2, Trash2 } from 'lucide-react'
import Button from '../../../components/ui/Button'
import '../styles/LeadsView.css'

const LeadDetailModal = ({
  lead,
  contact,
  pipeline,
  phase,
  pipelinePhases,
  onMove,
  onConvert,
  onDelete,
  onClose,
}) => {
  if (!lead) return null

  const currentPhaseIndex = pipelinePhases.findIndex((p) => p.id === lead.phase_id)
  const prevPhase = currentPhaseIndex > 0 ? pipelinePhases[currentPhaseIndex - 1] : null
  const nextPhase = currentPhaseIndex >= 0 && currentPhaseIndex < pipelinePhases.length - 1
    ? pipelinePhases[currentPhaseIndex + 1]
    : null

  const converted = lead.extra_data?.converted
  const history = lead.extra_data?.history || []

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="lead-detail-modal">
        <div className="lead-detail-header">
          <div>
            <h3>{lead.title}</h3>
            <p className="lead-detail-status">{pipeline?.name || 'No pipeline'} • {phase?.name || 'No phase'}</p>
          </div>
          <button className="close-btn" type="button" onClick={onClose} aria-label="Close Lead Details">
            <X size={18} />
          </button>
        </div>

        <div className="lead-detail-grid">
          <div className="lead-detail-row">
            <span className="label">Contact</span>
            <span>{contact?.name || '-'}</span>
          </div>
          <div className="lead-detail-row">
            <span className="label">Value</span>
            <span>{lead.value ? `$${lead.value}` : '-'}</span>
          </div>
          <div className="lead-detail-row">
            <span className="label">Assignee</span>
            <span>{lead.assignee || '-'}</span>
          </div>
          <div className="lead-detail-row">
            <span className="label">Source</span>
            <span>{lead.source || '-'}</span>
          </div>
          <div className="lead-detail-row">
            <span className="label">Expected Close</span>
            <span>{lead.expected_close_date ? new Date(lead.expected_close_date).toLocaleDateString() : '-'}</span>
          </div>
          <div className="lead-detail-row">
            <span className="label">Converted</span>
            <span>{converted ? 'Yes' : 'No'}</span>
          </div>
        </div>

        <div className="lead-detail-block">
          <h4>Notes</h4>
          <p>{lead.notes || 'No notes added yet.'}</p>
        </div>

        <div className="lead-detail-block">
          <h4>Timeline</h4>
          {history.length === 0 ? (
            <p>No timeline events yet.</p>
          ) : (
            <div className="lead-timeline">
              {history.map((event, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-dot" />
                  <div>
                    <div className="timeline-message">{event.message || event.type}</div>
                    <div className="timeline-meta">{new Date(event.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lead-detail-actions">
          {!converted && (
            <Button variant="secondary" onClick={() => onConvert(lead.id)}>
              <CheckCircle2 size={16} /> Convert Lead
            </Button>
          )}
          {prevPhase && (
            <Button variant="secondary" onClick={() => onMove(lead.id, prevPhase.id)}>
              <ArrowLeftRight size={16} /> Move to {prevPhase.name}
            </Button>
          )}
          {nextPhase && (
            <Button variant="secondary" onClick={() => onMove(lead.id, nextPhase.id)}>
              <ArrowLeftRight size={16} /> Move to {nextPhase.name}
            </Button>
          )}
          <Button variant="danger" onClick={() => onDelete(lead.id)}>
            <Trash2 size={16} /> Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

export default LeadDetailModal
