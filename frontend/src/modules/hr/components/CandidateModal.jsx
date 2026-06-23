import React, { useState, useEffect, useRef } from 'react'
import { X, Upload, FileText, Trash2, Loader } from 'lucide-react'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import api from '../../../services/api'
import '../styles/HRPage.css'

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  department_id: '',
  experience_years: '',
  resume_url: '',
  notes: '',
}

const CandidateModal = ({ isOpen, onClose, onSave, initialData, departments = [], pipelineTemplates = [] }) => {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const fileInputRef = useRef(null)
  const isEditing = !!initialData

  // Determine which departments have pipeline templates configured
  const deptIdsWithPipeline = new Set(pipelineTemplates.map((t) => t.department_id))

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          full_name: initialData.full_name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          department_id: initialData.department_id?.toString() || '',
          experience_years: initialData.experience_years?.toString() || '',
          resume_url: initialData.resume_url || '',
          notes: initialData.notes || '',
        })
        // Extract filename from URL for display
        if (initialData.resume_url) {
          const parts = initialData.resume_url.split('/')
          setUploadedFileName(parts[parts.length - 1] || 'Resume')
        } else {
          setUploadedFileName('')
        }
      } else {
        setForm(EMPTY_FORM)
        setUploadedFileName('')
      }
      setError('')
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (error) setError('')
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg']
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!allowedTypes.includes(ext)) {
      setError(`File type "${ext}" not supported. Allowed: ${allowedTypes.join(', ')}`)
      return
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File is too large. Maximum size is 10 MB.')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await api.post('/hr/upload-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setForm((prev) => ({ ...prev, resume_url: res.data.url }))
      setUploadedFileName(file.name)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to upload resume')
    } finally {
      setUploading(false)
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveResume = () => {
    setForm((prev) => ({ ...prev, resume_url: '' }))
    setUploadedFileName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.full_name.trim()) {
      setError('Full name is required')
      return
    }
    if (!form.email.trim()) {
      setError('Email is required')
      return
    }
    if (!form.department_id) {
      setError('Department is required')
      return
    }
    if (!deptIdsWithPipeline.has(parseInt(form.department_id))) {
      setError('This department does not have a pipeline configured yet. Please set one up in Pipelines first.')
      return
    }

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      department_id: parseInt(form.department_id, 10),
      experience_years: parseFloat(form.experience_years) || 0,
      resume_url: form.resume_url || null,
      notes: form.notes.trim() || null,
    }

    setSaving(true)
    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || `Failed to ${isEditing ? 'update' : 'create'} candidate`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Candidate' : 'Add Candidate'}</h3>
          <button className="modal-close" onClick={onClose} type="button" title="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="full_name">Full Name *</label>
              <input
                id="full_name"
                type="text"
                value={form.full_name}
                onChange={handleChange('full_name')}
                placeholder="e.g. Ajay Kumar"
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="e.g. ajay@example.com"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="text"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="e.g. +1 234 567 890"
              />
            </div>
            <div className="form-group">
              <label htmlFor="department_id">Department Applied For *</label>
              <select
                id="department_id"
                value={form.department_id}
                onChange={handleChange('department_id')}
                required
              >
                <option value="">Select department...</option>
                {departments.map((d) => {
                  const hasPipeline = deptIdsWithPipeline.has(d.id)
                  return (
                    <option key={d.id} value={d.id} disabled={!hasPipeline}>
                      {d.name} {!hasPipeline ? '(no pipeline)' : ''}
                    </option>
                  )
                })}
              </select>
              {form.department_id && !deptIdsWithPipeline.has(parseInt(form.department_id)) && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4, display: 'block' }}>
                  Please configure a pipeline template for this department before adding candidates.
                </span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <Input
                label="Experience (Years)"
                id="experience_years"
                type="number"
                step="0.5"
                min="0"
                value={form.experience_years}
                onChange={handleChange('experience_years')}
                placeholder="e.g. 3"
              />
            </div>
            <div className="form-group">
              <label>Resume</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                {uploading ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    border: '1px dashed #d1d5db',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    color: '#64748b',
                  }}>
                    <Loader size={16} className="spin" />
                    <span>Uploading resume...</span>
                  </div>
                ) : uploadedFileName ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    background: '#f8fafc',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <FileText size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.85rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {uploadedFileName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveResume}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                      title="Remove resume"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      border: '1px dashed #d1d5db',
                      borderRadius: 8,
                      background: '#fafafa',
                      cursor: 'pointer',
                      color: '#64748b',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#eff6ff' }}
                    onMouseLeave={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.background = '#fafafa' }}
                  >
                    <Upload size={16} />
                    <span>Upload Resume (PDF, DOC, TXT, PNG, JPG)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={handleChange('notes')}
              placeholder="Additional notes about the candidate..."
              rows={3}
              style={{
                padding: '10px 12px',
                border: '1px solid var(--border, #d1d5db)',
                borderRadius: 8,
                fontSize: '0.9rem',
                background: 'var(--card-bg, #ffffff)',
                color: 'var(--text, #1e293b)',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving || uploading}>
              {saving ? 'Saving...' : isEditing ? 'Update Candidate' : 'Add Candidate'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CandidateModal
