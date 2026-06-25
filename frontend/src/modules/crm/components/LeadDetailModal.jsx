import React, { useEffect, useState } from 'react'
import { X, ArrowLeftRight, CheckCircle2, Trash2, Sparkles, Mail, Calendar, ArrowRightCircle } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Loader from '../../../components/ui/Loader'
import api, { crmAPI } from '../../../services/api'
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
  const [activeTab, setActiveTab] = useState('details')
  const [leadLogs, setLeadLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState(null)
  const [currentRemark, setCurrentRemark] = useState('')
  const [newRemark, setNewRemark] = useState('')
  const [savingRemark, setSavingRemark] = useState(false)
  const [editingRemark, setEditingRemark] = useState(false)
  const [lastUpdatedBy, setLastUpdatedBy] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState('')

  useEffect(() => {
    if (!lead?.id) return
    setAiAction(null)
    setAiLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await api.post('/crm/ai/next-action', { lead_id: lead.id })
        setAiAction(res.data)
      } catch {
        // Silently fail — AI suggestion is optional
      } finally {
        setAiLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [lead?.id])

  useEffect(() => {
    if (!lead?.id) return
    setActiveTab('details')
    setLogsError(null)
    setEditingRemark(false)
    const current = lead.extra_data?.current_remark || ''
    setCurrentRemark(current)
    setNewRemark(current)
    setLastUpdatedBy(lead.extra_data?.current_remark_updated_by || '')
    setLastUpdatedAt(lead.extra_data?.current_remark_updated_at || '')
    fetchLeadLogs()
  }, [lead?.id])

  useEffect(() => {
    if (!lead?.id || activeTab !== 'logs') return
    fetchLeadLogs()
  }, [lead?.id, lead?.phase_id, activeTab])

  const fetchLeadLogs = async () => {
    if (!lead?.id) return
    setLogsLoading(true)
    setLogsError(null)
    try {
      const res = await api.get(`/crm/leads/${lead.id}/logs`)
      if (Array.isArray(res.data)) {
        setLeadLogs(res.data)
      } else {
        setLeadLogs([])
      }
    } catch (error) {
      console.error('Unable to fetch lead logs:', error)
      setLogsError('Unable to load lead logs.')
      setLeadLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  const handleSaveRemark = async () => {
    const trimmed = newRemark.trim()
    if (!lead?.id) return

    setSavingRemark(true)
    try {
      const response = await api.put(`/crm/leads/${lead.id}`, {
        extra_data: {
          ...lead.extra_data,
          current_remark: trimmed,
        },
      })
      const updatedLead = response.data
      const latestRemark = updatedLead.extra_data?.current_remark || ''
      setCurrentRemark(latestRemark)
      setNewRemark(latestRemark)
      setLastUpdatedBy(updatedLead.extra_data?.current_remark_updated_by || '')
      setLastUpdatedAt(updatedLead.extra_data?.current_remark_updated_at || '')
      await fetchLeadLogs()
      setEditingRemark(false)
    } catch (error) {
      console.error('Failed to save remark:', error)
    } finally {
      setSavingRemark(false)
    }
  }

  const handleEditRemark = () => {
    setEditingRemark(true)
  }

  const handleCancelEditRemark = () => {
    setEditingRemark(false)
    setNewRemark(currentRemark)
  }

  const remarkHistory = leadLogs.filter((entry) => entry.log_type === 'remark')

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

        <div className="lead-detail-tabs">
          {[
            { id: 'details', label: 'Details' },
            { id: 'logs', label: 'Logs' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`lead-detail-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'logs') {
                  fetchLeadLogs()
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'details' && (
          <>
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

            <div className="lead-detail-block remark-card">
              <div className="remark-card-header">
                <div>
                  <h4>Current Remark</h4>
                  <p className="remark-card-subtitle">Keep your team aligned with the latest note for this lead.</p>
                </div>
                {!editingRemark && lead.extra_data?.current_remark && (
                  <Button variant="secondary" onClick={handleEditRemark}>
                    Update remark
                  </Button>
                )}
              </div>

              {editingRemark || !currentRemark ? (
                <>
                  <div className="remark-add">
                    <textarea
                      value={newRemark}
                      onChange={(event) => setNewRemark(event.target.value)}
                      placeholder="Add or update lead remark..."
                      rows={5}
                    />
                  </div>
                  <div className="remark-actions">
                    <Button
                      variant="primary"
                      onClick={handleSaveRemark}
                      disabled={savingRemark || newRemark.trim() === currentRemark.trim()}
                    >
                      {savingRemark ? 'Saving…' : currentRemark ? 'Update remark' : 'Add remark'}
                    </Button>
                    {currentRemark && (
                      <Button variant="secondary" onClick={handleCancelEditRemark} disabled={savingRemark}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="remark-view">
                    <div className="remark-text">
                      {currentRemark || 'No remark has been added yet.'}
                    </div>
                  </div>
                </>
              )}

              {(lastUpdatedBy || lastUpdatedAt) && (
                <div className="remark-last-updated">
                  {lastUpdatedBy && (
                    <span>
                      Last updated by <strong>{lastUpdatedBy}</strong>
                    </span>
                  )}
                  {lastUpdatedAt && (
                    <span>{new Date(lastUpdatedAt).toLocaleString()}</span>
                  )}
                </div>
              )}

              {remarkHistory.length > 0 && (
                <div className="remark-history">
                  <div className="remark-history-header">
                    <h5>Previous remarks</h5>
                    <span>{remarkHistory.length} item{remarkHistory.length === 1 ? '' : 's'}</span>
                  </div>
                  {remarkHistory.map((entry) => (
                    <div key={entry.id} className="remark-history-entry">
                      <div className="remark-history-meta">
                        <span>{entry.created_by ? `By ${entry.created_by}` : 'System'}</span>
                        {entry.description && <span>{entry.description}</span>}
                        <span>{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</span>
                      </div>
                      <div className="remark-history-text">{entry.remarks || entry.description || 'No remark details available.'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'logs' && (
          <div className="lead-detail-block">
            <h4>Lead Logs</h4>
            {logsLoading ? (
              <div className="log-loading">
                <Loader size={16} />
                <span>Loading logs…</span>
              </div>
            ) : logsError ? (
              <p className="error-text">{logsError}</p>
            ) : leadLogs.length === 0 ? (
              <p>No logs have been added yet.</p>
            ) : (
              <div className="log-list">
                {leadLogs.map((entry) => {
                  const meta = entry.meta_data || entry.metaData || {}
                  const logType = entry.log_type || entry.type || ''
                  const fromId = meta.from_phase_id || meta.fromPhaseId || meta.from || null
                  const toId = meta.to_phase_id || meta.toPhaseId || meta.to || null
                  const fromName = meta.from_phase_name || meta.fromPhaseName || pipelinePhases.find(p => p.id === fromId)?.name
                  const toName = meta.to_phase_name || meta.toPhaseName || pipelinePhases.find(p => p.id === toId)?.name
                  const fromAssignee = meta.from_assignee || meta.fromAssignee || null
                  const toAssignee = meta.to_assignee || meta.toAssignee || null
                  const when = (entry.created_at || entry.timestamp) ? new Date(entry.created_at || entry.timestamp).toLocaleString() : ''
                  const actor = entry.created_by || entry.created_by_name || ''

                  const formatPhaseChange = () => {
                    const a = fromName || fromId || 'Unknown'
                    const b = toName || toId || 'Unknown'
                    return `${a} → ${b}`
                  }

                  const formatAssigneeChange = () => {
                    const a = fromAssignee || 'Unassigned'
                    const b = toAssignee || 'Unassigned'
                    return `Assigned from ${a} to ${b}`
                  }

                  const replaceIdsWithNames = (text) => {
                    if (!text) return text
                    let out = text
                    if (fromId && fromName) out = out.split(fromId).join(fromName)
                    if (toId && toName) out = out.split(toId).join(toName)
                    return out
                  }

                  const getPrimaryTitle = () => {
                    if (logType === 'assignee_changed' || /assignee/i.test(entry.title || '') || /assignee/i.test(entry.description || '')) {
                      return formatAssigneeChange()
                    }
                    if (logType === 'phase_changed' || /moved/i.test(entry.title || '') || /moved/i.test(entry.description || '')) {
                      return formatPhaseChange()
                    }
                    if (logType === 'conversion' || /convert/i.test(entry.title || '') || /convert/i.test(entry.description || '')) {
                      const raw = entry.title || entry.description || 'Conversion'
                      return replaceIdsWithNames(raw)
                    }
                    return entry.title || logType || 'Log entry'
                  }

                  const title = getPrimaryTitle()
                  const description = replaceIdsWithNames(entry.description)

                  return (
                    <div key={entry.id} className="log-entry">
                      <div className="log-entry-header">
                        <span className="log-entry-type">{(entry.log_type || 'log').replace('_', ' ')}</span>
                        <span className="log-entry-time">{when}</span>
                      </div>
                      <div className="log-entry-title">{title}</div>
                      {description && <div className="log-entry-description">{description}</div>}
                      {entry.remarks && <div className="log-entry-remarks">{entry.remarks}</div>}
                      <div className="log-entry-meta">{actor ? `By ${actor}` : ''}{actor && when ? ' • ' : ''}{when}</div>
                      {meta && Object.keys(meta).length > 0 && (
                        <details style={{marginTop:8}}>
                          <summary style={{cursor:'pointer', color:'var(--text-secondary)'}}>Details</summary>
                          <pre style={{whiteSpace:'pre-wrap',fontSize:'0.9rem',marginTop:8}}>{JSON.stringify(meta, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}


        <div className="lead-detail-actions">
          {!converted && (
            <Button variant="secondary" onClick={() => onConvert(lead.id)}>
              <CheckCircle2 size={16} /> Convert Lead
            </Button>
          )}
          {prevPhase && (
            <Button
              variant="secondary"
              onClick={async () => {
                await onMove(lead.id, prevPhase.id)
                fetchLeadLogs()
              }}
            >
              <ArrowLeftRight size={16} /> Move to {prevPhase.name}
            </Button>
          )}
          {nextPhase && (
            <Button
              variant="secondary"
              onClick={async () => {
                await onMove(lead.id, nextPhase.id)
                fetchLeadLogs()
              }}
            >
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
