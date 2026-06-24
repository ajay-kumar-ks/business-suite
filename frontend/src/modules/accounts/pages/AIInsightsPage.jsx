import React, { useState } from 'react'
import '../../../styles/ModulePage.css'
import '../../../styles/AccountsTheme.css'
import { useAccountsPermissions, isPageAllowed } from '../accountsPermissions'
import { accountsAPI, getAPIErrorMessage } from '../../../services/api'
import Button from '../../../components/ui/Button'

const AIInsightsPage = () => {
  const { department, loading } = useAccountsPermissions()
  const [insights, setInsights] = useState(null)
  const [summary, setSummary] = useState('')
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [error, setError] = useState('')

  if (loading) return <div className="module-page"><p>Loading...</p></div>
  if (!isPageAllowed(department, 'ai-insights')) {
    return (
      <div className="module-page">
        <h2>Access Denied</h2>
        <p>You do not have permission to view AI Insights.</p>
      </div>
    )
  }

  const fetchInsights = async () => {
    setLoadingInsights(true)
    setError('')
    try {
      const response = await accountsAPI.getAIInsights()
      setSummary(response.data.summary)
      setInsights(response.data.insights || [])
    } catch (err) {
      setError(getAPIErrorMessage(err, 'Unable to fetch AI insights'))
    } finally {
      setLoadingInsights(false)
    }
  }

  return (
    <div className="module-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>AI Financial Insights</h2>
          <p>Generate a quick analysis of cash flow, billing, payables, budgets, and profit trends.</p>
        </div>
        <Button onClick={fetchInsights} disabled={loadingInsights}>
          {loadingInsights ? 'Generating...' : 'Generate Insights'}
        </Button>
      </div>

      {error && <div className="error-message" style={{ marginTop: '16px' }}>{error}</div>}

      {summary && (
        <div className="accounts-summary" style={{ marginTop: '16px' }}>
          <h3>Summary</h3>
          <p>{summary}</p>
        </div>
      )}

      {insights && insights.length > 0 && (
        <div className="accounts-summary" style={{ marginTop: '16px' }}>
          <h3>Insights</h3>
          {insights.map((insight, index) => (
            <div key={index} className="insight-card" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{insight.title}</strong>
                <span style={{ textTransform: 'capitalize', color: insight.severity === 'critical' ? '#b91c1c' : insight.severity === 'warning' ? '#b45309' : insight.severity === 'positive' ? '#15803d' : '#374151' }}>
                  {insight.severity}
                </span>
              </div>
              <p style={{ marginTop: '8px' }}>{insight.message}</p>
            </div>
          ))}
        </div>
      )}

      {!summary && !error && (
        <div className="accounts-summary" style={{ marginTop: '16px' }}>
          <p>Click "Generate Insights" to get a data-driven overview of your financial position.</p>
        </div>
      )}
    </div>
  )
}

export default AIInsightsPage
