import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import '../styles/LeadsView.css'

const LeadForm = ({ contact = null, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    contact_id: contact?.id || '',
    pipeline_id: '',
    phase_id: '',
    value: '',
    expected_close_date: '',
    assignee: '',
    source: '',
    notes: '',
  })
  const [pipelines, setPipelines] = useState([])
  const [phases, setPhases] = useState([])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (contact) {
      setFormData((prev) => ({
        ...prev,
        contact_id: contact.id,
        title: `${contact.name} Opportunity`,
      }))
    }
    fetchPipelines()
  }, [contact])

  useEffect(() => {
    if (formData.pipeline_id) {
      fetchPhases(formData.pipeline_id)
    } else {
      setPhases([])
      setFormData((prev) => ({ ...prev, phase_id: '' }))
    }
  }, [formData.pipeline_id])

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/crm/pipelines/')
      if (!response.ok) throw new Error('Failed to fetch pipelines')
      const data = await response.json()
      setPipelines(data)
    } catch (error) {
      console.error('Failed to fetch pipelines:', error)
    }
  }

  const fetchPhases = async (pipelineId) => {
    try {
      const response = await fetch(`/api/crm/pipelines/${pipelineId}/phases`)
      if (!response.ok) throw new Error('Failed to fetch phases')
      const data = await response.json()
      setPhases(data)
    } catch (error) {
      console.error('Failed to fetch phases:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const nextErrors = {}
    if (!formData.title.trim()) nextErrors.title = 'Title is required'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    try {
      const response = await fetch('/api/crm/leads/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          contact_id: formData.contact_id || null,
          pipeline_id: formData.pipeline_id || null,
          phase_id: formData.phase_id || null,
          value: formData.value ? Number(formData.value) : undefined,
          expected_close_date: formData.expected_close_date || null,
          assignee: formData.assignee || null,
          source: formData.source || null,
          notes: formData.notes || null,
        }),
      })
      if (!response.ok) throw new Error('Failed to save lead')
      const saved = await response.json()
      onSave(saved)
    } catch (error) {
      console.error(error)
      setErrors({ submit: 'Unable to save lead. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lead-form-panel">
      <div className="lead-form-title">
        <h3>{contact ? 'New Lead from Contact' : 'New Lead'}</h3>
        <button type="button" className="close-btn" onClick={onCancel}>
          <X size={18} />
        </button>
      </div>
      <form className="lead-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <Input
            label="Lead Title *"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            required
          />
        </div>

        <div className="form-row two-col">
          <Select
            label="Pipeline"
            name="pipeline_id"
            value={formData.pipeline_id}
            onChange={handleChange}
            options={[
              { value: '', label: 'Select Pipeline...' },
              ...pipelines.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <Select
            label="Phase"
            name="phase_id"
            value={formData.phase_id}
            onChange={handleChange}
            disabled={!formData.pipeline_id}
            options={[
              { value: '', label: 'Select Phase...' },
              ...phases.map((ph) => ({ value: ph.id, label: ph.name })),
            ]}
          />
        </div>

        <div className="form-row two-col">
          <Input
            label="Value"
            name="value"
            type="number"
            value={formData.value}
            onChange={handleChange}
          />
          <Input
            label="Expected Close Date"
            name="expected_close_date"
            type="date"
            value={formData.expected_close_date}
            onChange={handleChange}
          />
        </div>

        <div className="form-row two-col">
          <Input
            label="Assignee"
            name="assignee"
            value={formData.assignee}
            onChange={handleChange}
          />
          <Input
            label="Source"
            name="source"
            value={formData.source}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <Input
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
          />
        </div>

        <div className="form-actions">
          <Button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Lead'}
          </Button>
        </div>

        {errors.submit && <div className="form-error">{errors.submit}</div>}
      </form>
    </div>
  )
}

export default LeadForm
