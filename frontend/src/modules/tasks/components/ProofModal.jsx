import React, { useState, useRef, useEffect } from 'react'
import { X, Paperclip, Upload, FileText, Check } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { taskApi } from '../services/taskApi'

const ProofModal = ({ task, newStatus, onConfirm, onCancel }) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    // Focus the file input ref for accessibility
    fileInputRef.current?.focus()
  }, [])

  const statusLabels = {
    TODO: 'Todo',
    ON_PROGRESS: 'On Progress',
    ON_HOLD: 'On Hold',
    ON_REVIEW: 'On Review',
    COMPLETED: 'Completed',
    OVERDUE: 'Overdue',
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10 MB.')
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
    setError('')
    setUploadedUrl('')
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError('')

    try {
      const res = await taskApi.uploadProof(selectedFile)
      setUploadedUrl(res.data.url)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed. Please try again.'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!uploadedUrl) return
    onConfirm(uploadedUrl)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onCancel()
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="task-modal-overlay" onClick={handleOverlayClick}>
      <div className="task-modal" style={{ maxWidth: 480 }}>
        <div className="task-modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Paperclip size={18} />
            Proof Required
          </h2>
          <button className="task-modal-close" onClick={onCancel} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form className="task-modal-form" onSubmit={handleSubmit}>
          <p style={{ color: 'var(--text)', marginBottom: 8, lineHeight: 1.5, opacity: 0.8 }}>
            Upload proof to move <strong>"{task?.title}"</strong>
            {newStatus && <> to <strong>{statusLabels[newStatus]}</strong></>}.
          </p>

          <div className="filter-group" style={{ marginTop: 8 }}>
            <label htmlFor="proof-file">Proof file (screenshot, document, etc.)</label>

            {/* File picker */}
            <input
              ref={fileInputRef}
              id="proof-file"
              type="file"
              onChange={handleFileSelect}
              accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              style={{ display: 'none' }}
            />

            {!selectedFile && !uploadedUrl && (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 12,
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: 'var(--bg)',
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <Upload size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  Click to select a file
                </p>
                <p style={{ fontSize: 12, opacity: 0.5, color: 'var(--text)' }}>
                  PNG, JPG, GIF, PDF, DOC — up to 10 MB
                </p>
              </div>
            )}

            {/* Selected file - waiting for upload */}
            {selectedFile && !uploadedUrl && (
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '16px',
                background: 'var(--bg)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <FileText size={24} style={{ opacity: 0.5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedFile.name}
                    </p>
                    <p style={{ fontSize: 12, opacity: 0.5, color: 'var(--text)' }}>
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading}
                    style={{ flexShrink: 0 }}
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>
            )}

            {/* Uploaded successfully */}
            {uploadedUrl && (
              <div style={{
                border: '1px solid #22c55e',
                borderRadius: 12,
                padding: '16px',
                background: 'rgba(34, 197, 94, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <Check size={24} style={{ color: '#22c55e', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                    Proof uploaded successfully
                  </p>
                  <p style={{ fontSize: 12, opacity: 0.5, color: 'var(--text)', wordBreak: 'break-all' }}>
                    {uploadedUrl}
                  </p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</p>
            )}
          </div>

          <div className="form-actions" style={{ marginTop: 8 }}>
            {selectedFile && !uploadedUrl ? (
              <Button type="button" variant="ghost" onClick={() => { setSelectedFile(null); setError('') }}>
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={onCancel}>
                {uploadedUrl ? 'Skip' : 'Cancel'}
              </Button>
            )}
            <Button type="submit" disabled={!uploadedUrl}>
              Confirm & Change Status
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProofModal
