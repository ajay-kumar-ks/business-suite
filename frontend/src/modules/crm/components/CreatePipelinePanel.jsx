import React, { useState } from 'react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import { Plus, Trash2, Save, X } from 'lucide-react'
import { crmAPI } from '../../../services/api'
import '../styles/LeadsView.css'
import '../styles/PipelineSettings.css'

const DEFAULT_PHASES = [
  { name: 'Prospecting', color: '#06b6d4', is_terminal: false },
  { name: 'Qualification', color: '#60a5fa', is_terminal: false },
  { name: 'Proposal', color: '#f59e0b', is_terminal: false },
  { name: 'Closed Won', color: '#10b981', is_terminal: true },
]

const CreatePipelinePanel = ({ onClose, onPipelineCreated }) => {
  const [form, setForm] = useState({ name: '', description: '', owner: '' })
  const [phases, setPhases] = useState([])
  const [phaseForm, setPhaseForm] = useState({ name: '', color: '#6366f1', is_terminal: false })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAddPhase = () => {
    if (!phaseForm.name.trim()) {
      setError('Phase name required')
      return
    }
    setError('')
    setPhases((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        name: phaseForm.name.trim(),
        color: phaseForm.color,
        is_terminal: !!phaseForm.is_terminal,
      },
    ])
    setPhaseForm({ name: '', color: '#6366f1', is_terminal: false })
  }

  // Initialize with sensible default phases when panel mounts
  React.useEffect(() => {
    if (!phases || phases.length === 0) {
      setPhases(DEFAULT_PHASES.map((p, i) => ({ ...p, id: `temp-${Date.now()}-${i}` })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRemovePhase = (id) => {
    setPhases((prev) => prev.filter((p) => p.id !== id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Pipeline name is required')
      return
    }
    setIsSaving(true)
    try {
      const resp = await crmAPI.createPipeline(form)
      const created = resp.data

      // create phases sequentially for the new pipeline
      for (let i = 0; i < phases.length; i++) {
        const p = phases[i]
        await crmAPI.createPhase(created.id, {
          name: p.name,
          color: p.color,
          is_terminal: p.is_terminal,
          position: i,
        })
      }

      setForm({ name: '', description: '', owner: '' })
      setPhases([])
      setError('')
      if (onPipelineCreated) await onPipelineCreated()
      if (onClose) onClose()
    } catch (err) {
      console.error(err)
      setError('Could not create pipeline')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="ps-card">
      <div className="ps-card-header">
        <h3>Create Pipeline</h3>
      </div>

      {error && <div className="ps-error">{error}</div>}

      <form onSubmit={handleSubmit} className="ps-form">
        <div className="ps-form-row">
          <Input
            label="Pipeline Name *"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
        </div>
        <div className="ps-form-row">
          <label className="ps-field-label">Description</label>
          <textarea
            className="ps-textarea"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Describe the purpose of this pipeline..."
            rows={3}
          />
        </div>
        <div className="ps-form-row">
          <Input
            label="Owner"
            value={form.owner}
            onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))}
            placeholder="Team member name or email"
          />
        </div>

        {/* Initial Phases */}
        <div className="ps-add-phase" style={{ borderTop: 'none', paddingTop: 0 }}>
          <h4>Initial Phases</h4>

          {/* Add phase row */}
          <div className="ps-add-phase-row">
            <input
              type="text"
              className="ps-input-sm"
              value={phaseForm.name}
              onChange={(e) => setPhaseForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Phase name"
            />
            <label className="ps-color-picker" data-tooltip="Color">
              <input
                type="color"
                value={phaseForm.color}
                onChange={(e) => setPhaseForm((p) => ({ ...p, color: e.target.value }))}
              />
              <span className="ps-color-swatch" style={{ background: phaseForm.color }} />
            </label>
            <label className="ps-check-label" style={{ whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={phaseForm.is_terminal}
                onChange={(e) => setPhaseForm((p) => ({ ...p, is_terminal: e.target.checked }))}
              />
              Terminal
            </label>
            <button type="button" className="ps-add-btn" onClick={handleAddPhase} title="Add phase">
              <Plus size={18} />
            </button>
          </div>

          {/* Phase list */}
          {phases.length > 0 && (
            <div className="ps-phase-list" style={{ marginTop: 4 }}>
              {phases.map((p, idx) => (
                <div key={p.id} className="ps-phase-item">
                  <div className="ps-phase-row">
                    <div className="ps-phase-info">
                      <div className="ps-phase-visual">
                        <span className="ps-phase-dot" style={{ background: p.color }} />
                        <span className="ps-phase-name">{p.name}</span>
                      </div>
                      <div className="ps-phase-badges">
                        <span className="ps-badge-sm" style={{
                          background: 'rgba(107, 114, 128, 0.1)',
                          color: 'var(--text-secondary, #6b7280)',
                          fontWeight: 500,
                        }}>
                          #{idx + 1}
                        </span>
                        {p.is_terminal && <span className="ps-badge-sm info">Terminal</span>}
                      </div>
                    </div>
                    <div className="ps-phase-controls">
                      <button
                        type="button"
                        className="ps-icon-btn danger"
                        onClick={() => handleRemovePhase(p.id)}
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ps-form-actions">
          <Button type="submit" disabled={isSaving}>
            <Save size={15} />
            {isSaving ? 'Creating...' : 'Create Pipeline'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            <X size={15} />
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreatePipelinePanel
