import React, { useState } from 'react'
import Button from '../../../components/ui/Button'
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
  const [phaseForm, setPhaseForm] = useState({ name: '', color: '#6b7280', is_terminal: false })
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
    setPhaseForm({ name: '', color: '#6b7280', is_terminal: false })
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
      const resp = await fetch('/api/crm/pipelines/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!resp.ok) throw new Error('Failed to create pipeline')
      const created = await resp.json()

      // create phases sequentially for the new pipeline
      for (let i = 0; i < phases.length; i++) {
        const p = phases[i]
        await fetch(`/api/crm/pipelines/${created.id}/phases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: p.name,
            color: p.color,
            is_terminal: p.is_terminal,
            position: i,
          }),
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
    <div className="pipeline-card">
      <h4>Create Pipeline</h4>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit} className="pipeline-form">
        <label>
          Pipeline Name
          <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        </label>
        <label>
          Description
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </label>
        <label>
          Owner
          <input type="text" value={form.owner} onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))} />
        </label>

        <div style={{ marginTop: 12 }}>
          <h5 style={{ margin: '6px 0' }}>Initial Phases</h5>
          <div className="phase-name-color-row">
            <input type="text" placeholder="Phase name" value={phaseForm.name} onChange={(e) => setPhaseForm((p) => ({ ...p, name: e.target.value }))} />
            <label className="color-box-label" data-tooltip="Select phase color">
              <input type="color" className="phase-color-input" value={phaseForm.color} onChange={(e) => setPhaseForm((p) => ({ ...p, color: e.target.value }))} />
              <span className="color-box" style={{ background: phaseForm.color }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={phaseForm.is_terminal} onChange={(e) => setPhaseForm((p) => ({ ...p, is_terminal: e.target.checked }))} /> Terminal
            </label>
            <button type="button" className="add-phase-button" onClick={handleAddPhase}>+</button>
          </div>

          {phases.length > 0 && (
            <div className="phase-list" style={{ marginTop: 10 }}>
              {phases.map((p, idx) => (
                <div key={p.id} className="phase-item">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <strong>{p.name}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Position: {idx + 1}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: p.color }} />
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => handleRemovePhase(p.id)}
                        title="Remove phase"
                        aria-label="Remove phase"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="button-group" style={{ marginTop: 12 }}>
          <Button type="submit">{isSaving ? 'Creating...' : 'Create'}</Button>
          <Button type="button" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

export default CreatePipelinePanel
