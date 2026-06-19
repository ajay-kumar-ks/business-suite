import React, { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Search, Settings, ChevronDown, Check, CheckCircle2 } from 'lucide-react'
import LeadForm from '../components/LeadForm'
import LeadDetailModal from '../components/LeadDetailModal'
import SettingsModal from '../components/SettingsModal'
import Button from '../../../components/ui/Button'
import Loader from '../../../components/ui/Loader'
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/crm/leads/')
      const data = await response.json()
      setLeads(data)
      // Fetch pipeline info for each lead
      const uniquePipelineIds = [...new Set(data.map(l => l.pipeline_id).filter(Boolean))]
      for (const pipelineId of uniquePipelineIds) {
        await fetchPipelineInfo(pipelineId)
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    }
  }

  const fetchPipelineInfo = async (pipelineId) => {
    try {
      const [pipelineRes, phasesRes] = await Promise.all([
        fetch(`/api/crm/pipelines/${pipelineId}`),
        fetch(`/api/crm/pipelines/${pipelineId}/phases`),
      ])
      if (pipelineRes.ok && phasesRes.ok) {
        const pipeline = await pipelineRes.json()
        const phasesData = await phasesRes.json()
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
      }
    } catch (error) {
      console.error(`Failed to fetch pipeline ${pipelineId}:`, error)
    }
  }

  const fetchContactInfo = async (contactId) => {
    if (!contactId || contacts[contactId]) return
    try {
      const response = await fetch(`/api/crm/contacts/${contactId}`)
      if (response.ok) {
        const contact = await response.json()
        setContacts((prev) => ({ ...prev, [contactId]: contact }))
      }
    } catch (error) {
      console.error(`Failed to fetch contact ${contactId}:`, error)
    }
  }

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/crm/pipelines/')
      if (!response.ok) throw new Error('Failed to fetch pipelines')
      const data = await response.json()
      setPipelineList(data)
      await Promise.all(data.map((pipeline) => fetchPipelineInfo(pipeline.id)))
    } catch (error) {
      console.error('Failed to fetch pipelines:', error)
    }
  }

  const loadData = async () => {
    setLoading(true)
    await fetchPipelines()
    await fetchLeads()
    setLoading(false)
  }

  const refreshBoardData = async () => {
    await Promise.all([fetchPipelines(), fetchLeads()])
  }

  useEffect(() => {
    loadData()
  }, [])

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
      await fetch(`/api/crm/leads/${leadId}`, { method: 'DELETE' })
      setLeads((prev) => prev.filter((l) => l.id !== leadId))
      setSelectedLead((prev) => (prev?.id === leadId ? null : prev))
    } catch (error) {
      console.error('Failed to delete lead:', error)
    }
  }

  const handleMoveLead = async (leadId, phaseId) => {
    try {
      const response = await fetch(`/api/crm/leads/${leadId}/move?phase_id=${phaseId}`, {
        method: 'PUT',
      })
      if (!response.ok) throw new Error('Failed to move lead')
      const updated = await response.json()
      setLeads((prev) => prev.map((lead) => lead.id === leadId ? { ...lead, phase_id: phaseId } : lead))
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) => prev ? { ...prev, phase_id: phaseId } : prev)
      }
    } catch (error) {
      console.error('Failed to move lead:', error)
    }
  }

  const handleConvertLead = async (leadId) => {
    try {
      const response = await fetch(`/api/crm/leads/${leadId}/convert`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to convert lead')
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

      <div className="kanban-board">
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
                <span>{filteredLeads.filter((lead) => lead.pipeline_id === selectedPipeline.id).length} leads</span>
              </div>
              <div className="kanban-phases">
                {phasesForPipeline.length === 0 ? (
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
                        <span>{phase.name}</span>
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
                            const isConverted = lead.extra_data?.converted
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
                                  <span>{lead.title}</span>
                                  {isConverted && <CheckCircle2 size={16} className="card-converted" />}
                                </div>
                                <div className="card-body">
                                  <span>{contactName}</span>
                                  <span>{lead.assignee || 'Unassigned'}</span>
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
        <SettingsModal onClose={() => setShowSettings(false)} onPipelineCreated={refreshBoardData} />
      )}

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
