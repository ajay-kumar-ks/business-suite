import React, { useEffect, useState } from 'react'
import Button from '../../../components/ui/Button'
import { ArrowUp, ArrowDown, Edit3, Trash2 } from 'lucide-react'
import '../../../styles/ThemeToggle.css'
import '../styles/LeadsView.css'
import '../styles/PipelineSettings.css'

const PipelineSettings = ({ onPipelineCreated }) => {
  const [pipelines, setPipelines] = useState([])
  const [selectedPipeline, setSelectedPipeline] = useState(null)
  const [editingPipelineData, setEditingPipelineData] = useState({ name: '', description: '', owner: '' })
  const [error, setError] = useState('')
  // single manage container: we toggle between edit and phases
  const [phases, setPhases] = useState([])
  const [phaseForm, setPhaseForm] = useState({ name: '', color: '#6b7280', position: 0, is_terminal: false })
  const [editingPhaseId, setEditingPhaseId] = useState(null)
  const [editingPhaseData, setEditingPhaseData] = useState({})
  const [visibleSection, setVisibleSection] = useState('edit')
  const [isSaving, setIsSaving] = useState(false)
  const [phaseStatus, setPhaseStatus] = useState({ type: '', message: '' })

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/crm/pipelines/')
      if (!response.ok) throw new Error('Unable to load pipelines')
      const data = await response.json()
      setPipelines(data)
      if (!selectedPipeline && data.length > 0) {
        setSelectedPipeline(data[0])
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load pipelines.')
    }
  }


  useEffect(() => {
    fetchPipelines()
  }, [])

  useEffect(() => {
    // fetch phases when selected pipeline changes
    const fetchPipelinePhases = async (pipelineId) => {
      if (!pipelineId) {
        setPhases([])
        return
      }
      try {
        const response = await fetch(`/api/crm/pipelines/${pipelineId}/phases`)
        if (!response.ok) throw new Error('Unable to load phases')
        const data = await response.json()
        setPhases(data)
      } catch (err) {
        console.error(err)
        setError('Failed to load pipeline phases.')
      }
    }

    if (selectedPipeline) fetchPipelinePhases(selectedPipeline.id)
  }, [selectedPipeline])

  const handleSavePhaseChanges = async (e) => {
    e.preventDefault()
    if (!selectedPipeline) return
    setIsSaving(true)
    setPhaseStatus({ type: '', message: '' })

    try {
      const orderedPhases = phases.map((phase, idx) => ({ ...phase, position: idx }))
      const existingPhases = orderedPhases.filter((phase) => !phase.isNew)
      const newPhases = orderedPhases.filter((phase) => phase.isNew)

      const updateResponses = await Promise.all(existingPhases.map((phase) =>
        fetch(`/api/crm/pipelines/${selectedPipeline.id}/phases/${phase.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: phase.position }),
        })
      ))

      const createResponses = await Promise.all(newPhases.map((phase) =>
        fetch(`/api/crm/pipelines/${selectedPipeline.id}/phases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: phase.name,
            color: phase.color,
            is_terminal: phase.is_terminal,
            position: phase.position,
          }),
        })
      ))

      if (updateResponses.some((response) => !response.ok) || createResponses.some((response) => !response.ok)) {
        throw new Error('Failed to save phase updates')
      }

      const response = await fetch(`/api/crm/pipelines/${selectedPipeline.id}/phases`)
      if (!response.ok) throw new Error('Failed to refresh phases')
      const refreshed = await response.json()
      setPhases(refreshed)
      setPhaseForm({ name: '', color: '#6b7280', position: 0, is_terminal: false })
      setError('')
      setPhaseStatus({ type: 'success', message: 'Phase changes saved successfully.' })
      if (onPipelineCreated) await onPipelineCreated()
    } catch (err) {
      console.error(err)
      setError('Failed to save phase changes.')
      setPhaseStatus({ type: 'error', message: 'Failed to save phase changes.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddPendingPhase = () => {
    if (!phaseForm.name.trim()) {
      setError('Please enter a phase name before adding.')
      return
    }
    setError('')
    setPhaseStatus({ type: 'info', message: 'New phase staged. Click Save Changes to persist.' })
    setPhases((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        pipeline_id: selectedPipeline?.id || '',
        name: phaseForm.name.trim(),
        color: phaseForm.color,
        position: prev.length,
        is_terminal: phaseForm.is_terminal,
        isNew: true,
      },
    ])
    setPhaseForm({ name: '', color: '#6b7280', position: 0, is_terminal: false })
  }

  const handleDeletePhase = async (phaseId) => {
    const phase = phases.find((p) => p.id === phaseId)
    if (!phase) return

    if (phase.isNew) {
      setPhases((prev) => prev.filter((p) => p.id !== phaseId))
      return
    }

    if (!selectedPipeline) return
    try {
      const response = await fetch(`/api/crm/pipelines/${selectedPipeline.id}/phases/${phaseId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete phase')
      setPhases((prev) => prev.filter((p) => p.id !== phaseId))
      setError('')
      setPhaseStatus({ type: 'success', message: 'Phase deleted successfully.' })
      if (onPipelineCreated) await onPipelineCreated()
    } catch (err) {
      console.error(err)
      setError('Failed to delete phase.')
      setPhaseStatus({ type: 'error', message: 'Could not delete phase. Please refresh and try again.' })
    }
  }

  const handleEditPhaseStart = (phase) => {
    setEditingPhaseId(phase.id)
    setEditingPhaseData({ name: phase.name, color: phase.color, is_terminal: !!phase.is_terminal })
  }

  const handleEditPhaseSave = async () => {
    if (!selectedPipeline || !editingPhaseId) return
    try {
      const response = await fetch(`/api/crm/pipelines/${selectedPipeline.id}/phases/${editingPhaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPhaseData),
      })
      if (!response.ok) throw new Error('Failed to update phase')
      const updated = await response.json()
      setPhases((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      setEditingPhaseId(null)
      setEditingPhaseData({})
    } catch (err) {
      console.error(err)
      setError('Failed to update phase.')
    }
  }

  const handleMovePhase = (phaseId, direction) => {
    const idx = phases.findIndex((p) => p.id === phaseId)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= phases.length) return
    const newPhases = [...phases]
    const a = { ...newPhases[idx], position: swapIdx }
    const b = { ...newPhases[swapIdx], position: idx }
    newPhases[idx] = b
    newPhases[swapIdx] = a
    setPhases(newPhases)
  }

    // keep selected pipeline syncing to edit form


  const selectPipeline = (pipeline) => {
    setSelectedPipeline(pipeline)
    setEditingPipelineData({
      name: pipeline.name || '',
      description: pipeline.description || '',
      owner: pipeline.owner || '',
    })
  }

  useEffect(() => {
    if (selectedPipeline) {
      setEditingPipelineData({
        name: selectedPipeline.name || '',
        description: selectedPipeline.description || '',
        owner: selectedPipeline.owner || '',
      })
    }
  }, [selectedPipeline])

  const handlePipelineUpdate = async (event) => {
    event.preventDefault()
    if (!selectedPipeline) return
    try {
      const response = await fetch(`/api/crm/pipelines/${selectedPipeline.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPipelineData),
      })
      if (!response.ok) throw new Error('Unable to update pipeline')
      const updatedPipeline = await response.json()
      setPipelines((prev) => prev.map((p) => (p.id === updatedPipeline.id ? updatedPipeline : p)))
      setSelectedPipeline(updatedPipeline)
      if (onPipelineCreated) onPipelineCreated()
    } catch (err) {
      console.error(err)
      setError('Failed to update pipeline.')
    }
  }

  // no assignment shortcut here; owner is editable via the Owner input

  return (
    <div className="pipeline-settings">
      <div className="pipeline-settings-header">
        <div>
          <h2>Pipeline Settings</h2>
          <p>Create and manage your sales pipelines and their phases.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <section className="pipeline-management">
        <div className="pipeline-selection">
          <label>
            Select Pipeline
            <select
              className="pipeline-select"
              value={selectedPipeline?.id || ''}
              onChange={(e) => {
                const pid = e.target.value
                const p = pipelines.find((pl) => pl.id === pid)
                if (p) selectPipeline(p)
                else setSelectedPipeline(null)
              }}
            >
              <option value="">Select pipeline...</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <div className="section-tabs">
            <h3 className="manage-heading">Manage Pipeline</h3>
          </div>
        </div>

        {selectedPipeline && (
          <div className="selected-pipeline-panel">
            <div className="manage-controls top-controls">
              <button type="button" className={"toggle-btn " + (visibleSection === 'edit' ? 'active' : '')} onClick={() => setVisibleSection('edit')}>Edit Pipeline</button>
              <button type="button" className={"toggle-btn " + (visibleSection === 'phases' ? 'active' : '')} onClick={() => setVisibleSection('phases')}>Phase Adjust</button>
            </div>
            <h4 className="manage-section-heading">{visibleSection === 'edit' ? 'Edit Pipeline' : 'Phase Adjust'}</h4>
            <div className="pipeline-details single-column">
              <div className="pipeline-card">
                <div className="manage-sections">
                  {visibleSection === 'edit' && (
                    <div className="manage-edit">
                      <h4>Edit Pipeline</h4>
                      <form onSubmit={handlePipelineUpdate} className="pipeline-form">
                        <label>
                          Pipeline Name
                          <input
                            type="text"
                            value={editingPipelineData.name}
                            onChange={(e) =>
                              setEditingPipelineData((prev) => ({ ...prev, name: e.target.value }))
                            }
                            required
                          />
                        </label>
                        <label>
                          Description
                          <textarea
                            value={editingPipelineData.description}
                            onChange={(e) =>
                              setEditingPipelineData((prev) => ({ ...prev, description: e.target.value }))
                            }
                          />
                        </label>
                        <label>
                          Current Owner
                          <input
                            type="text"
                            value={editingPipelineData.owner}
                            onChange={(e) =>
                              setEditingPipelineData((prev) => ({ ...prev, owner: e.target.value }))
                            }
                            placeholder="Team member name or email"
                          />
                        </label>
                        <div className="button-group">
                          <Button type="submit">Save Changes</Button>
                          <Button type="button" onClick={() => selectPipeline(selectedPipeline)}>
                            Reset
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}

                  {visibleSection === 'phases' && (
                    <div className="manage-phases">
                      <h4>Pipeline Phases</h4>
                      {phases.length === 0 ? (
                        <p>No phases configured for this pipeline.</p>
                      ) : (
                        <div className="phase-list">
                          {phases.map((phase, idx) => (
                            <div key={phase.id} className={`phase-item${phase.isNew ? ' pending' : ''}`}>
                              {editingPhaseId === phase.id ? (
                                <div className="edit-phase-form">
                                  <input
                                    type="text"
                                    value={editingPhaseData.name || ''}
                                    onChange={(e) => setEditingPhaseData((prev) => ({ ...prev, name: e.target.value }))}
                                  />
                                  <input
                                    type="color"
                                    value={editingPhaseData.color || phase.color}
                                    onChange={(e) => setEditingPhaseData((prev) => ({ ...prev, color: e.target.value }))}
                                  />
                                  <label className="checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={editingPhaseData.is_terminal || false}
                                      onChange={(e) => setEditingPhaseData((prev) => ({ ...prev, is_terminal: e.target.checked }))}
                                    />
                                    Terminal
                                  </label>
                                  <div className="button-group">
                                    <Button type="button" onClick={handleEditPhaseSave}>Save</Button>
                                    <Button type="button" onClick={() => { setEditingPhaseId(null); setEditingPhaseData({}) }}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="phase-row">
                                  <div>
                                    <span className="phase-chip" style={{ background: phase.color }}>{phase.name}</span>
                                    {phase.isNew && <span className="pending-badge">Pending</span>}
                                    {phase.is_terminal && <span className="phase-terminal">Terminal</span>}
                                  </div>
                                  <div className="phase-controls">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMovePhase(phase.id, 'up')}
                                      disabled={idx === 0}
                                      className="phase-action-btn"
                                      aria-label="Move phase up"
                                    >
                                      <ArrowUp size={16} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMovePhase(phase.id, 'down')}
                                      disabled={idx === phases.length - 1}
                                      className="phase-action-btn"
                                      aria-label="Move phase down"
                                    >
                                      <ArrowDown size={16} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditPhaseStart(phase)}
                                      className="phase-action-btn"
                                      aria-label="Edit phase"
                                    >
                                      <Edit3 size={16} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeletePhase(phase.id)}
                                      className="phase-action-btn danger"
                                      aria-label="Delete phase"
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {phaseStatus.message && (
                        <div className="phase-status-container">
                          <div className={`phase-status-box ${phaseStatus.type}`}>
                            {phaseStatus.message}
                          </div>
                        </div>
                      )}
                      <form onSubmit={handleSavePhaseChanges} className="pipeline-form">
                        <label>
                          New Phase Name
                          <div className="phase-name-color-row">
                            <input type="text" value={phaseForm.name} onChange={(e) => setPhaseForm((prev) => ({ ...prev, name: e.target.value }))} />
                            <label className="color-box-label" data-tooltip="Select phase color">
                              <input
                                type="color"
                                className="phase-color-input"
                                value={phaseForm.color}
                                onChange={(e) => setPhaseForm((prev) => ({ ...prev, color: e.target.value }))}
                                aria-label="Select phase color"
                              />
                              <span className="color-box" style={{ background: phaseForm.color }} />
                            </label>
                            <button type="button" className="add-phase-button" onClick={handleAddPendingPhase} aria-label="Add new phase">
                              +
                            </button>
                          </div>
                        </label>
                        <label className="checkbox-label">
                          <input type="checkbox" checked={phaseForm.is_terminal} onChange={(e) => setPhaseForm((prev) => ({ ...prev, is_terminal: e.target.checked }))} /> Terminal Stage
                        </label>
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}
      </section>
    </div>
  )
}

export default PipelineSettings
