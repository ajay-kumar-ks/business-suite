import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Trash2, Search, Settings, ChevronDown, Check, CheckCircle2, Check as CheckIcon, X as XIcon, AlertTriangle, Sparkles, BarChart3, ChevronUp, TrendingUp, TrendingDown, Lightbulb, Target, Zap } from 'lucide-react'
import LeadForm from '../components/LeadForm'
import LeadDetailModal from '../components/LeadDetailModal'
import SettingsModal from '../components/SettingsModal'
import Button from '../../../components/ui/Button'
import Loader from '../../../components/ui/Loader'
import Alert from '../../../components/ui/Alert'
import { crmAPI } from '../../../services/api'
import api from '../../../services/api'
import '../styles/LeadsView.css'

const LeadsPage = ({ prefillContact = null }) => {
  const [leads, setLeads] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [pipelines, setPipelines] = useState({})
  const [pipelineList, setPipelineList] = useState([])
  const [phases, setPhases] = useState({})
  const [contacts, setContacts] = useState({})
  const [showSettings, setShowSettings] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [pipelineFilter, setPipelineFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [orphanedLeads, setOrphanedLeads] = useState([])
  const [showOrphaned, setShowOrphaned] = useState(true)
  const [scoringLeads, setScoringLeads] = useState(false)
  const [insights, setInsights] = useState([])
  const [insightsSummary, setInsightsSummary] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [showInsights, setShowInsights] = useState(true)
  const [filterByPhase, setFilterByPhase] = useState(null)
  const dropdownRef = useRef(null)

  const fetchLeads = async () => {
    try {
      const response = await crmAPI.listLeads()
      const data = response.data
      if (!Array.isArray(data)) {
        console.error('Leads API returned non-array:', data)
        setLeads([])
        return
      }
      setLeads(data)
      // Fetch pipeline info for each lead
      const uniquePipelineIds = [...new Set(data.map(l => l.pipeline_id).filter(Boolean))]
      for (const pipelineId of uniquePipelineIds) {
        await fetchPipelineInfo(pipelineId)
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error)
      setLeads([])
    }
  }

  const fetchPipelineInfo = async (pipelineId) => {
    try {
      const [pipelineRes, phasesRes] = await Promise.all([
        crmAPI.getPipeline(pipelineId),
        crmAPI.getPhases(pipelineId),
      ])
      const pipeline = pipelineRes.data
      const phasesData = phasesRes.data
      setPipelines((prev) => ({ ...prev, [pipelineId]: pipeline }))
      setPhases((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((phaseId) => {
          if (next[phaseId]?.pipeline_id === pipelineId) {
            delete next[phaseId]
          }
        })
        return {
          ...next,
          ...Object.fromEntries(phasesData.map((p) => [p.id, p])),
        }
      })
    } catch (error) {
      console.error(`Failed to fetch pipeline ${pipelineId}:`, error)
    }
  }

  const fetchContactInfo = async (contactId) => {
    if (!contactId || contacts[contactId]) return
    try {
      const response = await crmAPI.getContact(contactId)
      const contact = response.data
      setContacts((prev) => ({ ...prev, [contactId]: contact }))
    } catch (error) {
      console.error(`Failed to fetch contact ${contactId}:`, error)
    }
  }

  const fetchPipelines = async () => {
    try {
      const response = await crmAPI.listPipelines()
      const data = response.data
      if (!Array.isArray(data)) {
        console.error('Pipelines API returned non-array:', data)
        setPipelineList([])
        return
      }
      setPipelineList(data)
      await Promise.all(data.map((pipeline) => fetchPipelineInfo(pipeline.id)))
    } catch (error) {
      console.error('Failed to fetch pipelines:', error)
      setPipelineList([])
    }
  }

  const loadData = async () => {
    setLoading(true)
    await fetchPipelines()
    await fetchLeads()
    setLoading(false)
  }

  // Fetch orphaned leads when pipeline filter changes
  useEffect(() => {
    if (pipelineFilter) {
      fetchOrphanedLeads(pipelineFilter)
    } else {
      setOrphanedLeads([])
    }
  }, [pipelineFilter, leads])

  const fetchOrphanedLeads = async (pipelineId) => {
    try {
      const res = await crmAPI.listLeads({ pipeline_id: pipelineId, orphaned: true })
      setOrphanedLeads(res.data)
    } catch (err) {
      console.error('Failed to fetch orphaned leads:', err)
      setOrphanedLeads([])
    }
  }

  const refreshBoardData = async () => {
    await Promise.all([fetchPipelines(), fetchLeads()])
  }

  const handlePhaseModificationComplete = async () => {
    setIsRefreshing(true)
    try {
      await refreshBoardData()
      if (pipelineFilter) {
        await fetchOrphanedLeads(pipelineFilter)
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const fetchInsights = useCallback(async (pipelineId) => {
    if (!pipelineId) return
    setInsights([])
    setInsightsSummary(null)
    setInsightsLoading(true)
    try {
      const res = await api.post('/crm/ai/pipeline-insights', null, { params: { pipeline_id: pipelineId } })
      const data = res.data
      setInsights(data.insights || [])
      setInsightsSummary(data.summary || null)
    } catch {
      setInsights([])
      setInsightsSummary(null)
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (pipelineFilter) {
      fetchInsights(pipelineFilter)
    }
  }, [pipelineFilter, fetchInsights])

  useEffect(() => {
    if (pipelineList.length > 0 && !pipelineFilter) {
      setPipelineFilter(String(pipelineList[0].id))
    }
  }, [pipelineList])

  useEffect(() => {
    const uniqueContactIds = [...new Set(leads.map(l => l.contact_id).filter(Boolean))]
    uniqueContactIds.forEach(fetchContactInfo)
  }, [leads])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (prefillContact) {
      setShowForm(true)
    }
  }, [prefillContact])

  const addNotification = (text, type = 'success') => {
    setNotifications((prev) => [...prev, { id: Date.now().toString(), text, type }])
  }

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear()
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return `${day} ${month} ${year} ${time}`
  }

  const showMessage = (text, type = 'success') => {
    addNotification(text, type)
  }

  const handleSaveLead = (savedLead) => {
    setLeads((prev) => [savedLead, ...prev])
    setShowForm(false)
    if (savedLead.pipeline_id) {
      fetchPipelineInfo(savedLead.pipeline_id)
    }
  }

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Delete this lead?')) return
    try {
      await crmAPI.deleteLead(leadId)
      setLeads((prev) => prev.filter((l) => l.id !== leadId))
      setSelectedLead((prev) => (prev?.id === leadId ? null : prev))
      showMessage('Lead deleted successfully.', 'success')
    } catch (error) {
      console.error('Failed to delete lead:', error)
      showMessage('Failed to delete lead.', 'error')
    }
  }

  const handleMoveLead = async (leadId, phaseId) => {
    const previousLeads = leads
    const updatedLeads = leads.map((lead) => lead.id === leadId ? { ...lead, phase_id: phaseId } : lead)
    setLeads(updatedLeads)
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => prev ? { ...prev, phase_id: phaseId } : prev)
    }

    try {
      await api.put(`/crm/leads/${leadId}/move`, null, { params: { phase_id: phaseId } })
      showMessage('Lead moved successfully.', 'success')
    } catch (error) {
      console.error('Failed to move lead:', error)
      setLeads(previousLeads)
      if (selectedLead?.id === leadId) {
        setSelectedLead(previousLeads.find((lead) => lead.id === leadId) || null)
      }
      showMessage('Could not move lead. Reverting change.', 'error')
    }
  }

  const handleConvertLead = async (leadId) => {
    try {
      await crmAPI.convertLead(leadId)
      setLeads((prev) => prev.map((lead) => lead.id === leadId ? { ...lead, extra_data: { ...lead.extra_data, converted: true } } : lead))
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) => prev ? { ...prev, extra_data: { ...prev.extra_data, converted: true } } : prev)
      }
    } catch (error) {
      console.error('Failed to convert lead:', error)
    }
  }

  const handleCardDragStart = (event, leadId) => {
    event.dataTransfer.setData('text/plain', leadId)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const handlePhaseDrop = (event, phaseId) => {
    event.preventDefault()
    const leadId = event.dataTransfer.getData('text/plain')
    if (leadId) {
      handleMoveLead(leadId, phaseId)
    }
  }

  const filteredLeads = leads.filter((lead) => {
    if (searchTerm && !lead.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (pipelineFilter && String(lead.pipeline_id) !== pipelineFilter) return false
    if (filterByPhase === 'stalled') {
      // Show only leads stalled >7 days in non-terminal phases
      if (!lead.phase_id) return false
      const phase = Object.values(phases).find((p) => p.id === lead.phase_id)
      if (phase?.is_terminal) return false
      const daysSinceUpdate = lead.updated_at ? Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24)) : 0
      if (daysSinceUpdate < 7) return false
    } else if (filterByPhase && filterByPhase.startsWith('phase=')) {
      const targetPhase = filterByPhase.replace('phase=', '')
      if (lead.phase_id !== targetPhase) return false
    }
    return true
  })

  const pipelinePhaseGroups = pipelineList.reduce((acc, pipeline) => {
    acc[pipeline.id] = (acc[pipeline.id] || [])
      .concat(Object.values(phases).filter((phase) => phase.pipeline_id === pipeline.id))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    return acc
  }, {})

  if (loading) {
    return (
      <div className="leads-page">
        <div className="loading-state">
          <Loader size={40} />
          <span>Loading leads...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="leads-page">
      <div className="leads-header">
        <div>
          <h1>Leads</h1>
          <p>Track your pipeline, manage opportunities, and move leads through stages.</p>
        </div>
        <Button
          className="btn-icon lead-add-btn"
          onClick={() => setShowForm(true)}
          data-tooltip="New Lead"
          aria-label="New Lead"
        >
          <Plus size={18} />
        </Button>
      </div>

      {showForm && (
        <LeadForm contact={prefillContact} onSave={handleSaveLead} onCancel={() => setShowForm(false)} />
      )}

      <div className="leads-filters">
            <div className="filter-input">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="pipeline-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className="pipeline-dropdown-button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
            >
              <span>{pipelineFilter ? pipelineList.find((p) => String(p.id) === pipelineFilter)?.name || 'Selected Pipeline' : 'All Pipelines'}</span>
              <ChevronDown className={`dropdown-chevron ${isDropdownOpen ? 'open' : ''}`} />
            </button>
            <div className={`pipeline-dropdown-menu ${isDropdownOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`pipeline-dropdown-item ${pipelineFilter === '' ? 'selected' : ''}`}
                onClick={() => {
                  setPipelineFilter('')
                  setIsDropdownOpen(false)
                }}
              >
                <span>All Pipelines</span>
                {pipelineFilter === '' && <Check className="dropdown-check" />}
              </button>
              {pipelineList.map((pipeline) => (
                <button
                  key={pipeline.id}
                  type="button"
                  className={`pipeline-dropdown-item ${String(pipeline.id) === pipelineFilter ? 'selected' : ''}`}
                  onClick={() => {
                    setPipelineFilter(String(pipeline.id))
                    setIsDropdownOpen(false)
                  }}
                >
                  <span>{pipeline.name}</span>
                  {String(pipeline.id) === pipelineFilter && <Check className="dropdown-check" />}
                </button>
              ))}
            </div>
          </div>
          <div className="view-switch">
            <button
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              type="button"
              data-tooltip="Settings"
              aria-label="Settings"
            >
              <Settings size={16} /> Settings
            </button>
          </div>
        </div>

      {/* ── AI Pipeline Health Insights Panel ── */}
      {(insights.length > 0 || insightsSummary) && (
        <div className="pipeline-insights">
          <div className="pipeline-insights-header" onClick={() => setShowInsights((prev) => !prev)}>
            <div className="pipeline-insights-title">
              <Sparkles size={15} />
              <span>AI Pipeline Health</span>
              <span className="pipeline-insights-count">{insights.length}</span>
            </div>
            <ChevronUp size={16} className={`pipeline-insights-chevron ${showInsights ? '' : 'collapsed'}`} />
          </div>
          {showInsights && (
            <div className="pipeline-insights-body">
              {/* ── Health Score Summary Card ── */}
              {insightsSummary && (
                <div className="health-summary-card">
                  <div className="health-score-ring">
                    <svg viewBox="0 0 48 48" width="48" height="48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
                      <circle
                        cx="24" cy="24" r="20" fill="none"
                        stroke={insightsSummary.score >= 70 ? '#22c55e' : insightsSummary.score >= 40 ? '#eab308' : '#ef4444'}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 20}`}
                        strokeDashoffset={`${2 * Math.PI * 20 * (1 - (insightsSummary.score || 0) / 100)}`}
                        transform="rotate(-90 24 24)"
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                      />
                    </svg>
                    <span className="health-score-value">{insightsSummary.score || '?'}</span>
                  </div>
                  <div className="health-summary-details">
                    <div className="health-summary-stat">
                      <span className="health-stat-label">Pipeline Value</span>
                      <span className="health-stat-value">
                        ${(insightsSummary.total_value || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="health-summary-stat">
                      <span className="health-stat-label">Total Leads</span>
                      <span className="health-stat-value">{insightsSummary.lead_count || 0}</span>
                    </div>
                  </div>
                  <div className="health-summary-analysis">
                    {insightsSummary.top_risk && (
                      <div className="health-analysis-item risk">
                        <TrendingDown size={13} />
                        <span>{insightsSummary.top_risk}</span>
                      </div>
                    )}
                    {insightsSummary.top_opportunity && (
                      <div className="health-analysis-item opportunity">
                        <TrendingUp size={13} />
                        <span>{insightsSummary.top_opportunity}</span>
                      </div>
                    )}
                    {insightsSummary.recommendation && (
                      <div className="health-analysis-item recommendation">
                        <Lightbulb size={13} />
                        <span>{insightsSummary.recommendation}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── AI Insight Cards ── */}
              {insights.map((insight, idx) => (
                <div key={idx} className={`pipeline-insight-item severity-${insight.severity} type-${insight.type}`}>
                  <div className="pipeline-insight-icon">
                    {insight.severity === 'critical' && <AlertTriangle size={14} />}
                    {insight.severity === 'warning' && <AlertTriangle size={14} />}
                    {insight.severity === 'positive' && <Target size={14} />}
                    {insight.severity === 'info' && insight.type === 'recommendation' && <Lightbulb size={14} />}
                    {insight.severity === 'info' && insight.type === 'summary' && <BarChart3 size={14} />}
                    {insight.severity === 'info' && insight.type === 'opportunity' && <TrendingUp size={14} />}
                    {insight.type === 'bottleneck' && <Zap size={14} />}
                  </div>
                  <div className="pipeline-insight-content">
                    <span className="pipeline-insight-message">{insight.message}</span>
                    {insight.details && (
                      <span className="pipeline-insight-details">{insight.details}</span>
                    )}
                  </div>
                  <div className="pipeline-insight-actions">
                    {insight.filter_query && (
                      <button
                        type="button"
                        className={`pipeline-insight-filter-btn ${filterByPhase === insight.filter_query ? 'active' : ''}`}
                        onClick={() => {
                          if (filterByPhase === insight.filter_query) {
                            setFilterByPhase(null)
                          } else {
                            setFilterByPhase(insight.filter_query)
                          }
                        }}
                      >
                        {insight.action_label || 'View'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {insightsLoading && (
        <div className="pipeline-insights pipeline-insights-loading">
          <Loader size={14} />
          <span>AI analyzing pipeline health...</span>
        </div>
      )}

      <div className="kanban-board">
        {isRefreshing && (
          <div className="kanban-loader-overlay">
            <Loader />
          </div>
        )}
        {pipelineList.length === 0 ? (
          <div className="empty-state">No pipelines found — create a lead with a pipeline to begin.</div>
        ) : (() => {
          const selectedPipeline = pipelineList.find(p => String(p.id) === pipelineFilter)
          if (!selectedPipeline) {
            return <div className="empty-state">No pipeline selected</div>
          }

          const phasesForPipeline = pipelinePhaseGroups[selectedPipeline.id] || []
          return (
            <div className="kanban-pipeline">
              <div className="kanban-pipeline-header">
                <h3>{selectedPipeline.name}</h3>
                <div className="kanban-pipeline-actions">
                  {orphanedLeads.length > 0 && (
                    <button
                      type="button"
                      className="orphaned-toggle-btn"
                      onClick={() => setShowOrphaned((prev) => !prev)}
                      title={showOrphaned ? 'Hide orphaned leads' : 'Show orphaned leads'}
                    >
                      <AlertTriangle size={13} />
                      {showOrphaned ? 'Hide' : `${orphanedLeads.length} orphaned`}
                    </button>
                  )}
                  <button
                    type="button"
                    className="score-all-btn"
                    onClick={async () => {
                      setScoringLeads(true)
                      try {
                        const res = await crmAPI.scoreAllLeads({ pipeline_id: selectedPipeline.id })
                        await fetchLeads()
                        showMessage(`Leads scored successfully!`, 'success')
                      } catch (e) {
                        showMessage(`Failed to score leads: ${e.message}`, 'error')
                      } finally {
                        setScoringLeads(false)
                      }
                    }}
                    disabled={scoringLeads}
                    title="Run AI scoring on all leads in this pipeline"
                  >
                    <Sparkles size={13} />
                    {scoringLeads ? 'Scoring...' : 'Score Leads'}
                  </button>
                  <span>{filteredLeads.filter((lead) => lead.pipeline_id === selectedPipeline.id).length} leads</span>
                </div>
              </div>
              <div className="kanban-phases">
                {/* Orphaned Leads Column — only if visible and has data */}
                {orphanedLeads.length > 0 && showOrphaned && (
                  <div className="kanban-column orphaned-column" onDragOver={handleDragOver}>
                    <div className="kanban-column-header orphaned-header">
                      <div className="kanban-column-title">
                        <AlertTriangle size={14} />
                        <span>Orphaned Leads</span>
                      </div>
                      <span>{orphanedLeads.length}</span>
                    </div>
                    <div className="kanban-column-meta">
                      <span>Phase was deleted — drag to a phase to recover</span>
                    </div>
                    <div className="kanban-cards">
                      {orphanedLeads.map((lead) => {
                        const contactName = contacts[lead.contact_id]?.name || lead.contact_id || '-'
                        const company = contacts[lead.contact_id]?.company || '-'
                        return (
                          <button
                            key={lead.id}
                            className="kanban-card orphaned-card"
                            type="button"
                            draggable
                            onDragStart={(event) => handleCardDragStart(event, lead.id)}
                            onClick={() => setSelectedLead(lead)}
                          >
                            <div className="card-top">
                              <div className="card-title-section">
                                <span className="card-title">{lead.title}</span>
                                {company && company !== '-' && <span className="card-company">{company}</span>}
                              </div>
                              {(lead.extra_data?.ai_score != null) && (
                                <span
                                  className="ai-score-badge"
                                  data-score={lead.extra_data.ai_score}
                                  title={`AI Score: ${lead.extra_data.ai_score}/100`}
                                >
                                  {lead.extra_data.ai_score}
                                </span>
                              )}
                            </div>
                            <div className="card-middle">
                              <div className="card-contact-info">
                                <span className="card-contact-label">Contact:</span>
                                <span className="card-contact-value">{contactName}</span>
                              </div>
                            </div>
                            <div className="card-meta">
                              {lead.value && (
                                <span className="card-value-badge">${lead.value.toLocaleString()}</span>
                              )}
                            </div>
                            <div className="card-assignee">
                              <span className="card-label-small">Assigned:</span>
                              <span className="card-assignee-value">{lead.assignee || 'Unassigned'}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Orphaned toggle when there are orphaned leads but column is hidden */}
                {orphanedLeads.length > 0 && !showOrphaned && (
                  <div className="kanban-column orphaned-column orphaned-collapsed" onClick={() => setShowOrphaned(true)}>
                    <div className="kanban-column-header orphaned-header">
                      <div className="kanban-column-title">
                        <AlertTriangle size={14} />
                        <span>Orphaned</span>
                      </div>
                      <span>{orphanedLeads.length}</span>
                    </div>
                    <div className="kanban-column-meta">
                      <span>Click to show {orphanedLeads.length} orphaned lead(s)</span>
                    </div>
                  </div>
                )}

                {phasesForPipeline.length === 0 && orphanedLeads.length === 0 ? (
                  <div className="kanban-empty">No phases configured</div>
                ) : (
                  phasesForPipeline.map((phase) => (
                    <div
                      key={phase.id}
                      className="kanban-column"
                      onDragOver={handleDragOver}
                      onDrop={(event) => handlePhaseDrop(event, phase.id)}
                    >
                      <div className="kanban-column-header">
                        <div className="kanban-column-title">
                          <span>{phase.name}</span>
                          {phase.is_terminal && <span className="phase-terminal-label">Terminal</span>}
                        </div>
                        <span>{filteredLeads.filter((lead) => lead.phase_id === phase.id).length}</span>
                      </div>
                      <div className="kanban-column-meta">
                        <span>
                          Total: ${filteredLeads
                            .filter((lead) => lead.pipeline_id === selectedPipeline.id && lead.phase_id === phase.id)
                            .reduce((sum, lead) => sum + (lead.value || 0), 0)}
                        </span>
                      </div>
                      <div className="kanban-cards">
                          {filteredLeads
                          .filter((lead) => lead.pipeline_id === selectedPipeline.id && lead.phase_id === phase.id)
                          .map((lead) => {
                            const contactName = contacts[lead.contact_id]?.name || lead.contact_id || '-'
                            const company = contacts[lead.contact_id]?.company || '-'
                            const isConverted = lead.extra_data?.converted
                            const convertedTime = lead.extra_data?.converted_at
                            return (
                              <button
                                key={lead.id}
                                className="kanban-card"
                                type="button"
                                draggable
                                onDragStart={(event) => handleCardDragStart(event, lead.id)}
                                onClick={() => setSelectedLead(lead)}
                              >
                                <div className="card-top">
                                  <div className="card-title-section">
                                    <span className="card-title">{lead.title}</span>
                                    {company && company !== '-' && <span className="card-company">{company}</span>}
                                  </div>
                                  <div className="card-top-right">
                                    {(lead.extra_data?.ai_score != null) && (
                                      <span
                                        className="ai-score-badge"
                                        data-score={lead.extra_data.ai_score}
                                        title={`AI Score: ${lead.extra_data.ai_score}/100 — ${lead.extra_data.ai_score_reason || ''}`}
                                      >
                                        {lead.extra_data.ai_score}
                                      </span>
                                    )}
                                    {isConverted && <CheckCircle2 size={16} className="card-converted" />}
                                  </div>
                                </div>
                                <div className="card-middle">
                                  <div className="card-contact-info">
                                    <span className="card-contact-label">Contact:</span>
                                    <span className="card-contact-value">{contactName}</span>
                                  </div>
                                  {isConverted && convertedTime && (
                                    <div className="card-converted-time">
                                      <span className="card-label-small">Converted:</span>
                                      <span className="card-value-small">{formatDate(convertedTime)}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="card-meta">
                                  {lead.value && (
                                    <span className="card-value-badge">${lead.value.toLocaleString()}</span>
                                  )}
                                  {lead.expected_close_date && (
                                    <span className="card-close-date-small">
                                      {new Date(lead.expected_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                                <div className="card-update-time">
                                  <span className="card-label-small">Updated:</span>
                                  <span className="card-value-small">{formatDate(lead.updated_at)}</span>
                                </div>
                                <div className="card-assignee">
                                  <span className="card-label-small">Assigned:</span>
                                  <span className="card-assignee-value">{lead.assignee || 'Unassigned'}</span>
                                </div>
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} onPipelineCreated={handlePhaseModificationComplete} />
      )}

      {notifications.map((notification) => (
        <Alert
          key={notification.id}
          message={notification.text}
          type={notification.type}
          position="top-right"
          variant="toast"
          timeout={5000}
          onDismiss={() => removeNotification(notification.id)}
          dismissible={true}
          icon={notification.type === 'success' ? <CheckIcon size={16} /> : <XIcon size={16} />}
        />
      ))}

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          contact={contacts[selectedLead.contact_id]}
          pipeline={pipelines[selectedLead.pipeline_id]}
          phase={phases[selectedLead.phase_id]}
          pipelinePhases={pipelinePhaseGroups[selectedLead.pipeline_id] || []}
          onMove={handleMoveLead}
          onConvert={handleConvertLead}
          onDelete={handleDeleteLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  )
}

export default LeadsPage
