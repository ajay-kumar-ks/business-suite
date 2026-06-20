import React, { useState } from 'react'
import { Download, Loader2, Check } from 'lucide-react'
import { taskAnalyticsApi } from '../../services/taskAnalyticsApi'

const ExportButton = () => {
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    setExported(false)
    try {
      const response = await taskAnalyticsApi.exportCsv()
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `tasks_export_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setExported(true)
      setTimeout(() => setExported(false), 3000)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      className="export-btn"
      onClick={handleExport}
      disabled={exporting}
      title="Export tasks as CSV"
    >
      {exporting ? (
        <Loader2 size={16} className="spin-icon" />
      ) : exported ? (
        <Check size={16} />
      ) : (
        <Download size={16} />
      )}
      <span>{exporting ? 'Exporting...' : exported ? 'Exported!' : 'Export CSV'}</span>
    </button>
  )
}

export default ExportButton
