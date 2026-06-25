import React, { useState, useEffect } from 'react'
import { Sparkles, Copy, RotateCw, Trash2, Loader2, AlertCircle, CheckCheck, FileText } from 'lucide-react'
import { hrAPI } from '../services/hrApi'
import { hrAiAPI } from '../services/hrAiApi'
const EXPERIENCE_OPTIONS = [
  'Fresher',
  '1+ Years',
  '2+ Years',
  '3+ Years',
  '5+ Years',
  '8+ Years',
  '10+ Years',
]

const AIJobDescription = () => {
  // ── Form state ──
  const [departments, setDepartments] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [department, setDepartment] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [experience, setExperience] = useState('')
  const [skills, setSkills] = useState('')
  const [additionalRequirements, setAdditionalRequirements] = useState('')

  // ── Output state ──
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [copied, setCopied] = useState(false)

  // ── Fetch departments on mount ──
  useEffect(() => {
    const fetchDepts = async () => {
      setDepartmentsLoading(true)
      try {
        const res = await hrAPI.getDepartments()
        setDepartments(res.data || [])
      } catch (err) {
        console.error('Failed to load departments:', err)
      } finally {
        setDepartmentsLoading(false)
      }
    }
    fetchDepts()
  }, [])

  // ── Form validation ──
  const isFormValid = department && jobTitle.trim() && experience && skills.trim()

  // ── Generate job description ──
  const handleGenerate = async () => {
    if (!isFormValid) return

    setLoading(true)
    setError('')
    setJobDescription('')
    setCopied(false)

    try {
      const result = await hrAiAPI.generateJobDescription({
        department,
        job_title: jobTitle.trim(),
        experience,
        skills: skills.trim(),
        additional_requirements: additionalRequirements.trim(),
      })
      setJobDescription(result.job_description)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Failed to generate job description. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ── Copy to clipboard ──
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jobDescription)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = jobDescription
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // ── Clear form and output ──
  const handleClear = () => {
    setDepartment('')
    setJobTitle('')
    setExperience('')
    setSkills('')
    setAdditionalRequirements('')
    setJobDescription('')
    setError('')
    setCopied(false)
  }

  // ── Parse job description sections ──
  const parseSections = (text) => {
    if (!text) return []

    const sections = []
    const lines = text.split('\n')
    let currentSection = null
    let currentLines = []

    const sectionHeaders = [
      'Job Summary',
      'Key Responsibilities',
      'Required Skills',
      'Qualifications',
      'Preferred Skills',
    ]

    for (const line of lines) {
      const trimmed = line.trim()
      const headerMatch = sectionHeaders.find(
        (h) => trimmed.toLowerCase().startsWith(h.toLowerCase())
      )

      if (headerMatch) {
        if (currentSection) {
          sections.push({ title: currentSection, content: currentLines.join('\n') })
        }
        currentSection = headerMatch
        currentLines = []
      } else {
        currentLines.push(line)
      }
    }

    if (currentSection) {
      sections.push({ title: currentSection, content: currentLines.join('\n') })
    }

    // If no sections were parsed, treat entire text as one block
    if (sections.length === 0 && text.trim()) {
      sections.push({ title: '', content: text })
    }

    return sections
  }

  const sections = parseSections(jobDescription)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div
        style={{
          textAlign: 'center',
          padding: '32px 24px',
          marginBottom: 24,
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #e0f2fe 100%)',
          borderRadius: 12,
          border: '1px solid #e9d5ff',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <FileText size={28} />
        </div>
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
          }}
        >
          AI Job Description Generator
        </h3>
        <p
          style={{
            margin: '0 0 0',
            fontSize: '0.9rem',
            color: '#64748b',
            maxWidth: 520,
            marginInline: 'auto',
          }}
        >
          Generate professional, ATS-friendly job descriptions powered by AI.
          Fill in the details below and let AI craft the perfect job posting.
        </p>
      </div>

      {/* ── Form Card ── */}
      <div
        className="page-section"
        style={{ marginBottom: 24 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Department */}
          <div className="form-group">
            <label>
              Department <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={loading}
              style={{
                padding: '10px 12px',
                border: '1px solid var(--border, #d1d5db)',
                borderRadius: 8,
                fontSize: '0.9rem',
                background: 'var(--card-bg, #ffffff)',
                color: 'var(--text, #1e293b)',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Select Department</option>
              {departmentsLoading ? (
                <option value="" disabled>Loading...</option>
              ) : (
                departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Job Title */}
          <div className="form-group">
            <label>
              Job Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer, HR Executive"
              disabled={loading}
              style={{
                padding: '10px 12px',
                border: '1px solid var(--border, #d1d5db)',
                borderRadius: 8,
                fontSize: '0.9rem',
                background: 'var(--card-bg, #ffffff)',
                color: 'var(--text, #1e293b)',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Experience */}
          <div className="form-group">
            <label>
              Experience Required <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              disabled={loading}
              style={{
                padding: '10px 12px',
                border: '1px solid var(--border, #d1d5db)',
                borderRadius: 8,
                fontSize: '0.9rem',
                background: 'var(--card-bg, #ffffff)',
                color: 'var(--text, #1e293b)',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Select Experience</option>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Empty spacer for alignment */}
          <div />
        </div>

        {/* Required Skills */}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>
            Required Skills <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g. React, FastAPI, PostgreSQL, Git"
            disabled={loading}
            rows={3}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--border, #d1d5db)',
              borderRadius: 8,
              fontSize: '0.9rem',
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text, #1e293b)',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Additional Requirements */}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label>Additional Requirements</label>
          <textarea
            value={additionalRequirements}
            onChange={(e) => setAdditionalRequirements(e.target.value)}
            placeholder="e.g. Strong communication skills. Ability to work in Agile teams."
            disabled={loading}
            rows={3}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--border, #d1d5db)',
              borderRadius: 8,
              fontSize: '0.9rem',
              background: 'var(--card-bg, #ffffff)',
              color: 'var(--text, #1e293b)',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Generate Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleGenerate}
            disabled={!isFormValid || loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 32px',
              border: 'none',
              borderRadius: 10,
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: !isFormValid || loading ? 'not-allowed' : 'pointer',
              background: loading
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: loading ? '#94a3b8' : '#ffffff',
              transition: 'all 0.2s ease',
              opacity: loading || !isFormValid ? 0.7 : 1,
              boxShadow:
                loading || !isFormValid
                  ? 'none'
                  : '0 3px 12px rgba(99, 102, 241, 0.35)',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 0.6s linear infinite' }} />
                Generating Job Description...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Job Description
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Error State ── */}
      {error && (
        <div
          className="page-section"
          style={{
            marginBottom: 24,
            border: '1px solid #fecaca',
            background: '#fef2f2',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <AlertCircle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: '0 0 8px',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#dc2626',
                }}
              >
                Failed to generate job description
              </p>
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: '0.85rem',
                  color: '#7f1d1d',
                }}
              >
                {error}
              </p>
              <button
                onClick={handleGenerate}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: '#ffffff',
                  color: '#dc2626',
                  transition: 'all 0.15s ease',
                }}
              >
                <RotateCw size={14} />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading State ── */}
      {loading && !jobDescription && !error && (
        <div
          className="page-section"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
          }}
        >
          <Loader2
            size={36}
            style={{ animation: 'spin 0.6s linear infinite', color: '#8b5cf6', marginBottom: 16 }}
          />
          <p style={{ fontSize: '0.95rem', fontWeight: 500, color: '#475569', margin: '0 0 4px' }}>
            Generating Job Description...
          </p>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Our AI is crafting a professional ATS-friendly job description based on your inputs.
          </p>
        </div>
      )}

      {/* ── Output ── */}
      {jobDescription && !loading && (
        <div className="page-section">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 600,
                color: 'var(--text, #1e293b)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FileText size={20} style={{ color: '#8b5cf6' }} />
              Generated Job Description
            </h3>
          </div>

          {/* Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
            {sections.map((section, idx) => (
              <div key={idx}>
                {section.title && (
                  <h4
                    style={{
                      margin: '0 0 10px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: '#6b21a8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 4,
                        height: 18,
                        background: '#8b5cf6',
                        borderRadius: 2,
                        display: 'inline-block',
                      }}
                    />
                    {section.title}
                  </h4>
                )}
                <div
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--text, #1e293b)',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {section.content.split('\n').map((line, i) => {
                    const trimmed = line.trim()
                    if (!trimmed) return null
                    if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.match(/^\d+\./)) {
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            gap: 8,
                            padding: '2px 0',
                            paddingLeft: 8,
                            borderLeft: '2px solid #e9d5ff',
                            marginBottom: 4,
                          }}
                        >
                          <span>{trimmed}</span>
                        </div>
                      )
                    }
                    return (
                      <p key={i} style={{ margin: '0 0 4px' }}>
                        {trimmed}
                      </p>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              borderTop: '1px solid var(--border, #e2e8f0)',
              paddingTop: 20,
            }}
          >
            <button
              onClick={handleCopy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 20px',
                border: '1px solid var(--border, #d1d5db)',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: copied ? '#f0fdf4' : 'var(--card-bg, #ffffff)',
                color: copied ? '#16a34a' : 'var(--text, #1e293b)',
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? (
                <>
                  <CheckCheck size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy
                </>
              )}
            </button>

            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 20px',
                border: '1px solid var(--border, #d1d5db)',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                background: 'var(--card-bg, #ffffff)',
                color: 'var(--text, #1e293b)',
                transition: 'all 0.15s ease',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <RotateCw size={16} />
              Regenerate
            </button>

            <button
              onClick={handleClear}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 20px',
                border: '1px solid #fecaca',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: '#fef2f2',
                color: '#dc2626',
                transition: 'all 0.15s ease',
                marginLeft: 'auto',
              }}
            >
              <Trash2 size={16} />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIJobDescription
