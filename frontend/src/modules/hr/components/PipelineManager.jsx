import React, { useState, useEffect } from 'react'
import {
  X,
  Plus,
  Trash2,
  Save,
  Settings,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import { recruitmentAPI } from '../services/recruitmentApi'

const PipelineManager = ({ isOpen, onClose, onSaved }) => {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editStages, setEditStages] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await recruitmentAPI.getPipelineTemplates()
      setTemplates(res.data || [])
    } catch (err) {
      setError('Failed to load pipeline templates')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSeedPipelines = async () => {
    try {
      await recruitmentAPI.seedPipelines()
      setSuccess('Default pipeline templates created for roles!')
      fetchTemplates()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to seed pipelines')
    }
  }

  const startEditing = (template) => {
    setEditingId(template.id)
    setEditStages([...template.stages])
    setError('')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditStages([])
    setError('')
  }

  const addStage = () => {
    setEditStages([...editStages, ''])
  }

  const removeStage = (idx) => {
    if (editStages.length <= 2) {
      setError('Pipeline must have at least 2 stages')
      return
    }
    const updated = editStages.filter((_, i) => i !== idx)
    setEditStages(updated)
  }

  const updateStage = (idx, value) => {
    const updated = [...editStages]
    updated[idx] = value
    setEditStages(updated)
  }

  const savePipeline = async (templateId) => {
    // Validate
    if (editStages.some((s) => !s.trim())) {
      setError('All stage names must be non-empty')
      return
    }
    if (editStages[0] !== 'Applied') {
      setError('First stage must be "Applied"')
      return
    }
    if (editStages[editStages.length - 1] !== 'Onboarded') {
      setError('Last stage must be "Onboarded"')
      return
    }

    setSaving(true)
    setError('')
    try {
      await recruitmentAPI.updatePipelineTemplate(templateId, { stages: editStages })
      setSuccess('Pipeline template updated!')
      cancelEditing()
      fetchTemplates()
      if (onSaved) onSaved()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save pipeline')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
        <div className="modal-header">
          <h3>Pipeline Templates</h3>
          <button className="modal-close" onClick={onClose} type="button" title="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {error && (
            <div className="form-error" style={{ marginBottom: 12 }}>
              <AlertCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {error}
            </div>
          )}
          {success && (
            <div className="form-success" style={{ marginBottom: 12 }}>
              <CheckCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {success}
            </div>
          )}

          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <Button size="sm" variant="secondary" onClick={handleSeedPipelines}>
              Auto-Create Defaults
            </Button>
            <span style={{ fontSize: '0.78rem', color: '#64748b', alignSelf: 'center' }}>
              Create pipeline templates for all roles without one
            </span>
          </div>

          {loading ? (
            <div className="table-status">
              <div className="spinner" />
              <span>Loading pipeline templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="table-status empty">
              <Settings size={24} style={{ opacity: 0.4 }} />
              <span>No pipeline templates found. Click "Auto-Create Defaults" to generate them from roles.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {templates.map((template) => (
                <div
                  key={template.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{template.role_name || `Role #${template.role_id}`}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 8 }}>
                        ({template.stages.length} stages)
                      </span>
                    </div>
                    {editingId === template.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button size="sm" variant="secondary" onClick={cancelEditing}>Cancel</Button>
                        <Button size="sm" variant="primary" onClick={() => savePipeline(template.id)} disabled={saving}>
                          <Save size={14} style={{ marginRight: 4 }} />
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => startEditing(template)}>
                        Edit Stages
                      </Button>
                    )}
                  </div>

                  {editingId === template.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {editStages.map((stage, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', minWidth: 24 }}>
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={stage}
                            onChange={(e) => updateStage(idx, e.target.value)}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              border: '1px solid #d1d5db',
                              borderRadius: 6,
                              fontSize: '0.85rem',
                            }}
                          />
                          <button
                            onClick={() => removeStage(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: 4,
                              borderRadius: 4,
                            }}
                            title="Remove stage"
                          >
                            <Trash2 size={14} />
                          </button>
                          {idx === editStages.length - 1 && (
                            <button
                              onClick={addStage}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#2563eb',
                                cursor: 'pointer',
                                padding: 4,
                                borderRadius: 4,
                              }}
                              title="Add stage"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {template.stages.map((stage, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '2px 10px',
                            borderRadius: 12,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: idx === 0 ? '#f5f3ff' : idx === template.stages.length - 1 ? '#f0fdf4' : '#f1f5f9',
                            color: idx === 0 ? '#8b5cf6' : idx === template.stages.length - 1 ? '#16a34a' : '#475569',
                          }}
                        >
                          {stage}
                          {idx < template.stages.length - 1 && (
                            <span style={{ marginLeft: 4, color: '#cbd5e1' }}>→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

export default PipelineManager
