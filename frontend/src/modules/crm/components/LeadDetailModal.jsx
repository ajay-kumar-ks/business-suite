import React, { useEffect, useState } from 'react'
import { X, ArrowLeftRight, CheckCircle2, Trash2, Sparkles, Mail, Calendar, ArrowRightCircle } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Loader from '../../../components/ui/Loader'
import '../styles/LeadsView.css'

const URGENCY_ICONS = {
  high: <ArrowRightCircle size={14} />,
  medium: <Calendar size={14} />,
  low: <Mail size={14} />,
}

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
  const [aiAction, setAiAction] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (!lead?.id) return
    setAiAction(null)
    setAiLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/crm/ai/next-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead_id: lead.id }),
        })
        if (res.ok) {
          setAiAction(await res.json())
        }
      } catch {
        // Silently fail — AI suggestion is optional
      } finally {
        setAiLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [lead?.id])

  if (!lead) return null

  const currentPhaseIndex = pipelinePhases.findIndex((p) => p.id === lead.phase_id)
  const prevPhase = currentPhaseIndex > 0 ? pipelinePhases[currentPhaseIndex - 1] : null
  const nextPhase = currentPhaseIndex >= 0 && currentPhaseIndex < pipelinePhases.length - 1
    ? pipelinePhases[currentPhaseIndex + 1]
    : null

  const converted = lead.extra_data?.converted
  const history = lead.extra_data?.history || []

  const handleApplyAction = () => {
    if (!aiAction) return
    if (aiAction.suggested_phase_id) {
      // Move to suggested phase
      const targetPhase = pipelinePhases.find((p) => p.id === aiAction.suggested_phase_id)
      if (targetPhase) {
        onMove(lead.id, targetPhase.id)
        setAiAction(null)
      }
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="lead-detail-modal">
        <div className="lead-detail-header">
          <div>
            <h3>{lead.title}</h3>
            <p className="lead-detail-status">{pipeline?.name || 'No pipeline'} &bull; {phase?.name || 'No phase'}</p>
          </div>
          <button className="close-btn" type="button" onClick={onClose} aria-label="Close Lead Details">
            <X size={18} />
          </button>
        </div>

        {/* ── AI Next-Best-Action Card ── */}
        {aiLoading && (
          <div className="ai-next-action-card ai-loading">
            <Loader size={16} />
            <span>AI analyzing next best action...</span>
          </div>
        )}
        {aiAction && !aiLoading && (
          <div className="ai-next-action-card">
            <div className="ai-next-action-header">
              <Sparkles size={15} />
              <span>AI Recommended Next Action</span>
              <span className={`ai-urgency-badge urgency-${aiAction.urgency}`}>
                {URGENCY_ICONS[aiAction.urgency] || null}
                {aiAction.urgency}
              </span>
            </div>
            <div className="ai-next-action-body">
              <span className="ai-action-name">{aiAction.action}</span>
              <span className="ai-action-desc">{aiAction.description}</span>
            </div>
            {aiAction.suggested_phase_id && (
              <div className="ai-next-action-actions">
                <button
                  type="button"
                  className="ai-action-apply-btn"
                  onClick={handleApplyAction}
                >
                  <ArrowLeftRight size={13} />
                  Move to phase
                </button>
              </div>
            )}
          </div>
        )}

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
