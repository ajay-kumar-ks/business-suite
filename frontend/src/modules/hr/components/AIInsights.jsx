import React, { useState } from 'react'
import { Brain, Sparkles, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

const AIInsights = ({ onGenerate, variant = 'card' }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [insights, setInsights] = useState(null)
  const isPage = variant === 'page'

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setInsights(null)
    try {
      const result = await onGenerate()
      setInsights(result.insights)
    } catch (err) {
      setError(err.message || 'Failed to generate insights. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Page variant layout ──
  if (isPage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Hero / CTA area */}
        {!insights && (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #f0fdf4 100%)',
            borderRadius: 12,
            border: '1px solid #e9d5ff',
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#8b5cf6',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Brain size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
              AI HR Insights
            </h3>
            <p style={{ margin: '0 auto 24px', fontSize: '0.9rem', color: '#64748b', maxWidth: 480 }}>
              Generate intelligent analysis of your workforce, recruitment, attendance, and leave data using AI.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 28px',
                border: 'none',
                borderRadius: 10,
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#e2e8f0' : '#8b5cf6',
                color: loading ? '#94a3b8' : '#ffffff',
                transition: 'all 0.15s ease',
                opacity: loading ? 0.7 : 1,
                boxShadow: loading ? 'none' : '0 2px 8px rgba(139, 92, 246, 0.3)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 0.6s linear infinite' }} />
                  Generating Insights...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Insights
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div style={{
            padding: '14px 18px',
            borderRadius: 10,
            fontSize: '0.88rem',
            fontWeight: 500,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {loading && !insights && (
          <div style={{
            textAlign: 'center',
            padding: 40,
            color: '#64748b',
          }}>
            <Loader2 size={32} style={{ animation: 'spin 0.6s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.9rem', margin: 0 }}>Analyzing your HR data...</p>
          </div>
        )}

        {insights && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Executive Summary */}
            {insights.executive_summary && (
              <div style={{
                background: '#f5f3ff',
                border: '1px solid #e9d5ff',
                borderRadius: 10,
                padding: '18px 22px',
              }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 700, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Brain size={18} />
                  Executive Summary
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '0.92rem',
                  color: '#4a1d96',
                  lineHeight: 1.7,
                  fontWeight: 450,
                }}>
                  {insights.executive_summary}
                </p>
              </div>
            )}

            {/* Insight sections in a grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              <InsightCard title="Workforce Insights" items={insights.workforce_insights} color="#3b82f6" bg="#eff6ff" />
              <InsightCard title="Recruitment Insights" items={insights.recruitment_insights} color="#f59e0b" bg="#fffbeb" />
              <InsightCard title="Attendance Insights" items={insights.attendance_insights} color="#22c55e" bg="#f0fdf4" />
              <InsightCard title="Leave Insights" items={insights.leave_insights} color="#ec4899" bg="#fdf2f8" />
            </div>

            {/* Risks & Recommendations row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {insights.risks && insights.risks.length > 0 && (
                <div style={{
                  background: '#fef2f2',
                  borderRadius: 10,
                  border: '1px solid #fecaca',
                  padding: '16px 20px',
                }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={16} />
                    Risks & Concerns
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {insights.risks.map((risk, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        fontSize: '0.85rem',
                        color: '#7f1d1d',
                        padding: '8px 12px',
                        background: '#fff',
                        borderRadius: 6,
                        borderLeft: '3px solid #ef4444',
                      }}>
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.recommendations && insights.recommendations.length > 0 && (
                <div style={{
                  background: '#f0fdf4',
                  borderRadius: 10,
                  border: '1px solid #bbf7d0',
                  padding: '16px 20px',
                }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={16} />
                    Recommendations
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {insights.recommendations.map((rec, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        fontSize: '0.85rem',
                        color: '#166534',
                        padding: '8px 12px',
                        background: '#fff',
                        borderRadius: 6,
                        borderLeft: '3px solid #22c55e',
                      }}>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Default card variant (for dashboard card) ──
  return (
    <div className="dashboard-card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div className="card-icon-wrapper" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
          <Brain size={22} />
        </div>
        <div className="card-info">
          <span className="card-label" style={{ textTransform: 'none', letterSpacing: 0 }}>AI Insights</span>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          border: 'none',
          borderRadius: 8,
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          background: loading ? '#e2e8f0' : '#8b5cf6',
          color: loading ? '#94a3b8' : '#ffffff',
          transition: 'all 0.15s ease',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <>
            <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />
            Generating...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Generate Insights
          </>
        )}
      </button>

      {error && (
        <div style={{
          marginTop: 12,
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: '0.82rem',
          fontWeight: 500,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {insights && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {insights.executive_summary && (
            <div style={{
              background: '#f5f3ff',
              border: '1px solid #e9d5ff',
              borderRadius: 8,
              padding: '12px 14px',
            }}>
              <p style={{
                margin: 0,
                fontSize: '0.85rem',
                color: '#6b21a8',
                lineHeight: 1.6,
                fontWeight: 500,
              }}>
                {insights.executive_summary}
              </p>
            </div>
          )}

          {renderCardSection('Workforce Insights', insights.workforce_insights, '#3b82f6')}
          {renderCardSection('Recruitment Insights', insights.recruitment_insights, '#f59e0b')}
          {renderCardSection('Attendance Insights', insights.attendance_insights, '#22c55e')}
          {renderCardSection('Leave Insights', insights.leave_insights, '#ec4899')}

          {insights.risks && insights.risks.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.82rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} />
                Risks & Concerns
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {insights.risks.map((risk, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: '0.8rem',
                    color: '#7f1d1d',
                    padding: '8px 10px',
                    background: '#fef2f2',
                    borderRadius: 6,
                    borderLeft: '3px solid #ef4444',
                  }}>
                    <span>{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.recommendations && insights.recommendations.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.82rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} />
                Recommendations
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {insights.recommendations.map((rec, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: '0.8rem',
                    color: '#166534',
                    padding: '8px 10px',
                    background: '#f0fdf4',
                    borderRadius: 6,
                    borderLeft: '3px solid #22c55e',
                  }}>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function renderCardSection(title, items, accentColor) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <h4 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', fontWeight: 700, color: accentColor }}>
        {title}
      </h4>
      <ul style={{
        margin: 0,
        padding: '0 0 0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}>
        {items.map((item, i) => (
          <li key={i} style={{
            fontSize: '0.8rem',
            color: 'var(--text, #1e293b)',
            lineHeight: 1.5,
          }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function InsightCard({ title, items, color, bg }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{
      background: bg,
      borderRadius: 10,
      border: `1px solid ${color}22`,
      padding: '16px 20px',
    }}>
      <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color }}>
        {title}
      </h4>
      <ul style={{
        margin: 0,
        padding: '0 0 0 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}>
        {items.map((item, i) => (
          <li key={i} style={{
            fontSize: '0.85rem',
            color: '#334155',
            lineHeight: 1.55,
          }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default AIInsights
