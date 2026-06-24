import React, { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Loader from '../../../components/ui/Loader'
import { ArrowUp, Edit3, Trash2, ChevronDown, Plus, Check, Save } from 'lucide-react'
import { crmAPI } from '../../../services/api'
import api from '../../../services/api'
import '../../../styles/ThemeToggle.css'
import '../styles/LeadsView.css'
import '../styles/PipelineSettings.css'
import SortablePhaseCard, { PhaseCardDragOverlay } from './SortablePhaseCard'

const PipelineSettings = ({ onPipelineCreated }) => {
  const [pipelines, setPipelines] = useState([])
  const [selectedPipeline, setSelectedPipeline] = useState(null)
  const [editingPipelineData, setEditingPipelineData] = useState({ name: '', description: '', owner: '' })
  const [error, setError] = useState('')
  const [phases, setPhases] = useState([])
  const [phaseForm, setPhaseForm] = useState({ name: '', color: '#6366f1', position: 0, is_terminal: false })
  const [editingPhaseId, setEditingPhaseId] = useState(null)
  const [editingPhaseData, setEditingPhaseData] = useState({})
  const [visibleSection, setVisibleSection] = useState('edit')
  const [pipelineDropdownOpen, setPipelineDropdownOpen] = useState(false)
  const [activePhaseId, setActivePhaseId] = useState(null)
  const [overPhaseId, setOverPhaseId] = useState(null)
  const pipelineDropdownRef = useRef(null)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [phaseStatus, setPhaseStatus] = useState({ type: '', message: '' })

  const fetchPipelines = async () => {
    setIsLoading(true)
    try {
      const response = await crmAPI.listPipelines()
      const data = response.data
      setPipelines(data)
      if (!selectedPipeline && data.length > 0) {
        setSelectedPipeline(data[0])
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load pipelines.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPipelines()
  }, [])

  // Click outside handler for pipeline dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pipelineDropdownRef.current && !pipelineDropdownRef.current.contains(event.target)) {
        setPipelineDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchPipelinePhases = async (pipelineId) => {
      if (!pipelineId) {
        setPhases([])
        return
      }
      setIsLoading(true)
      try {
        const response = await crmAPI.getPhases(pipelineId)
        setPhases(response.data)
      } catch (err) {
        console.error(err)
        setError('Failed to load pipeline phases.')
      } finally {
        setIsLoading(false)
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

      await Promise.all(existingPhases.map((phase) =>
        crmAPI.updatePhase(selectedPipeline.id, phase.id, { position: phase.position })
      ))

      await Promise.all(newPhases.map((phase) =>
        crmAPI.createPhase(selectedPipeline.id, {
          name: phase.name,
          color: phase.color,
          is_terminal: phase.is_terminal,
          position: phase.position,
        })
      ))

      const response = await crmAPI.getPhases(selectedPipeline.id)
      const refreshed = response.data
      setPhases(refreshed)
      setPhaseForm({ name: '', color: '#6366f1', position: 0, is_terminal: false })
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
    setPhaseForm({ name: '', color: '#6366f1', position: 0, is_terminal: false })
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
      await api.delete(`/crm/pipelines/${selectedPipeline.id}/phases/${phaseId}`)
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
      const response = await crmAPI.updatePhase(selectedPipeline.id, editingPhaseId, editingPhaseData)
      const updated = response.data
      setPhases((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      setEditingPhaseId(null)
      setEditingPhaseData({})
    } catch (err) {
      console.error(err)
      setError('Failed to update phase.')
    }
  }

  const handleDragStart = ({ active }) => {
    setActivePhaseId(String(active.id))
    setOverPhaseId(null)
  }

  const handleDragOver = ({ active, over }) => {
    if (!over || active.id === over.id) return

    const activeIndex = phases.findIndex((phase) => String(phase.id) === String(active.id))
    const overIndex = phases.findIndex((phase) => String(phase.id) === String(over.id))

    if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return

    setPhases((items) => arrayMove(items, activeIndex, overIndex))
    setOverPhaseId(String(over.id))
  }

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      const activeIndex = phases.findIndex((phase) => String(phase.id) === String(active.id))
      const overIndex = phases.findIndex((phase) => String(phase.id) === String(over.id))
      if (activeIndex !== -1 && overIndex !== -1) {
        setPhases((items) => arrayMove(items, activeIndex, overIndex))
      }
    }

    setActivePhaseId(null)
    setOverPhaseId(null)
  }

  const handleDragCancel = () => {
    setActivePhaseId(null)
    setOverPhaseId(null)
  }

  const activePhase = activePhaseId
    ? phases.find((phase) => String(phase.id) === String(activePhaseId))
    : null

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
      const response = await crmAPI.updatePipeline(selectedPipeline.id, editingPipelineData)
      const updatedPipeline = response.data
      setPipelines((prev) => prev.map((p) => (p.id === updatedPipeline.id ? updatedPipeline : p)))
      setSelectedPipeline(updatedPipeline)
      if (onPipelineCreated) onPipelineCreated()
    } catch (err) {
      console.error(err)
      setError('Failed to update pipeline.')
    }
  }

  return (
    <div className="ps-container">
      {/* Header */}
      <div className="ps-header">
        <div>
          <h2 className="ps-title">Pipeline Settings</h2>
          <p className="ps-subtitle">Create and manage your sales pipelines and their phases.</p>
        </div>
      </div>

      {error && <div className="ps-error">{error}</div>}

      {isLoading ? (
        <div className="ps-loading">
          <Loader size={36} />
          <span>Loading pipeline data...</span>
        </div>
      ) : (
        <>
          {/* Pipeline Selector */}
          <div className="ps-selector">
            <div className="custom-select-wrapper" ref={pipelineDropdownRef}>
              <label className="custom-select-label">Select Pipeline</label>
              <button
                type="button"
                className={`custom-select-trigger ${pipelineDropdownOpen ? 'open' : ''}`}
                onClick={() => setPipelineDropdownOpen((prev) => !prev)}
              >
                <span className={`custom-select-value ${selectedPipeline ? '' : 'placeholder'}`}>
                  {selectedPipeline ? selectedPipeline.name : 'Select pipeline...'}
                </span>
                <ChevronDown size={16} className={`dropdown-chevron ${pipelineDropdownOpen ? 'open' : ''}`} />
              </button>
              {pipelineDropdownOpen && (
                <div className="custom-select-menu">
                  {pipelines.length === 0 ? (
                    <div className="custom-select-empty">No pipelines available</div>
                  ) : (
                    pipelines.map((pipeline) => (
                      <button
                        key={pipeline.id}
                        type="button"
                        className={`custom-select-item ${String(pipeline.id) === String(selectedPipeline?.id) ? 'selected' : ''}`}
                        onClick={() => {
                          selectPipeline(pipeline)
                          setPipelineDropdownOpen(false)
                        }}
                      >
                        <div className="custom-select-item-main">
                          <span className="custom-select-item-name">{pipeline.name}</span>
                        </div>
                        {pipeline.description && (
                          <span className="custom-select-item-subtitle">{pipeline.description}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedPipeline && (
            <div className="ps-manage-panel">
              {/* Segmented Toggle */}
              <div className="ps-segmented">
                <button
                  type="button"
                  className={`ps-seg-btn ${visibleSection === 'edit' ? 'active' : ''}`}
                  onClick={() => setVisibleSection('edit')}
                >
                  <Edit3 size={15} />
                  <span>Edit Pipeline</span>
                </button>
                <button
                  type="button"
                  className={`ps-seg-btn ${visibleSection === 'phases' ? 'active' : ''}`}
                  onClick={() => setVisibleSection('phases')}
                >
                  <ArrowUp size={15} />
                  <span>Phase Adjust</span>
                </button>
              </div>

              {/* Edit Pipeline Section */}
              {visibleSection === 'edit' && (
                <div className="ps-card">
                  <div className="ps-card-header">
                    <h3>Pipeline Details</h3>
                  </div>
                  <form onSubmit={handlePipelineUpdate} className="ps-form">
                    <div className="ps-form-row">
                      <Input
                        label="Pipeline Name *"
                        value={editingPipelineData.name}
                        onChange={(e) =>
                          setEditingPipelineData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="ps-form-row">
                      <label className="ps-field-label">Description</label>
                      <textarea
                        className="ps-textarea"
                        value={editingPipelineData.description}
                        onChange={(e) =>
                          setEditingPipelineData((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Describe the purpose of this pipeline..."
                        rows={3}
                      />
                    </div>
                    <div className="ps-form-row">
                      <Input
                        label="Current Owner"
                        value={editingPipelineData.owner}
                        onChange={(e) =>
                          setEditingPipelineData((prev) => ({ ...prev, owner: e.target.value }))
                        }
                        placeholder="Team member name or email"
                      />
                    </div>
                    <div className="ps-form-actions">
                      <Button type="submit">
                        <Save size={15} />
                        Save Changes
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => selectPipeline(selectedPipeline)}>
                        Reset
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Phase Adjust Section */}
              {visibleSection === 'phases' && (
                <div className="ps-card">
                  <div className="ps-card-header">
                    <h3>Pipeline Phases</h3>
                    <span className="ps-badge">{phases.length} phases</span>
                  </div>

                  {phases.length === 0 ? (
                    <div className="ps-empty">No phases configured for this pipeline.</div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDragCancel={handleDragCancel}
                    >
                      <SortableContext
                        items={phases.map((phase) => String(phase.id))}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="ps-phase-list">
                          {phases.map((phase) => (
                            <SortablePhaseCard
                              key={phase.id}
                              phase={phase}
                              onEditPhaseStart={handleEditPhaseStart}
                              onDeletePhase={handleDeletePhase}
                              isOver={String(overPhaseId) === String(phase.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>

                      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
                        <PhaseCardDragOverlay phase={activePhase} />
                      </DragOverlay>
                    </DndContext>
                  )}

                  {phaseStatus.message && (
                    <div className={`ps-status ${phaseStatus.type}`}>
                      {phaseStatus.message}
                    </div>
                  )}

                  {/* Add Phase Form */}
                  <div className="ps-add-phase">
                    <h4>Add New Phase</h4>
                    <div className="ps-add-phase-row">
                      <input
                        type="text"
                        className="ps-input-sm"
                        value={phaseForm.name}
                        onChange={(e) => setPhaseForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Phase name"
                      />
                      <label className="ps-color-picker" data-tooltip="Color">
                        <input
                          type="color"
                          value={phaseForm.color}
                          onChange={(e) => setPhaseForm((prev) => ({ ...prev, color: e.target.value }))}
                        />
                        <span className="ps-color-swatch" style={{ background: phaseForm.color }} />
                      </label>
                      <button type="button" className="ps-add-btn" onClick={handleAddPendingPhase} title="Add phase">
                        <Plus size={18} />
                      </button>
                    </div>
                    <label className="ps-check-label" style={{ marginTop: 8 }}>
                      <input
                        type="checkbox"
                        checked={phaseForm.is_terminal}
                        onChange={(e) => setPhaseForm((prev) => ({ ...prev, is_terminal: e.target.checked }))}
                      />
                      Terminal Stage
                    </label>
                    <Button type="button" onClick={handleSavePhaseChanges} disabled={isSaving} style={{ marginTop: 12 }}>
                      <Save size={15} />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default PipelineSettings
