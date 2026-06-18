import React, { useEffect, useState } from 'react'
import '../../../styles/ModulePage.css'
import { accountsAPI } from '../../../services/api'

const LedgerPage = () => {
  const [ledger, setLedger] = useState([])
  const [error, setError] = useState('')

  const fetchLedger = async () => {
    try {
      const response = await accountsAPI.listLedger()
      setLedger(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load ledger entries')
    }
  }

  useEffect(() => {
    fetchLedger()
  }, [])

  return (
    <div className="module-page">
      <h2>General Ledger</h2>
      <p>Review ledger entries created from posted journals.</p>
      {error && <div className="error-message">{error}</div>}
      <div className="accounts-summary">
        <table className="accounts-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Posting Date</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.account_id}</td>
                <td>{entry.debit}</td>
                <td>{entry.credit}</td>
                <td>{new Date(entry.posting_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default LedgerPage
