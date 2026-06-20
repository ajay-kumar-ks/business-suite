import React, { useEffect, useMemo, useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import Loader from '../../../components/ui/Loader'
import Select from '../../../components/ui/Select'
import { crmAPI } from '../../../services/api'
import { hrAPI } from '../../hr/services/hrApi'
import '../styles/CRMAnalyticsDashboard.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler)

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value)
const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

const buildTrend = (items, dateKey, days = 7) => {
  const result = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i -= 1) {
    const current = new Date(today)
    current.setDate(current.getDate() - i)
    const dateKeyLabel = current.toISOString().slice(0, 10)
    result.push({ label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), key: dateKeyLabel, count: 0 })
  }

  items.forEach((item) => {
    if (!item?.[dateKey]) return
    const date = new Date(item[dateKey])
    if (Number.isNaN(date.getTime())) return
    const key = date.toISOString().slice(0, 10)
    const bucket = result.find((row) => row.key === key)
    if (bucket) bucket.count += 1
  })

  return result
}

const CRMAnalyticsDashboard = () => {
  const [contacts, setContacts] = useState([])
  const [leads, setLeads] = useState([])
  const [clients, setClients] = useState([])
  const [pipelines, setPipelines] = useState([])
  const [employees, setEmployees] = useState([])
  const [selectedPipeline, setSelectedPipeline] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoading(true)
      try {
        const [contactsRes, leadsRes, clientsRes, pipelinesRes, employeesRes] = await Promise.all([
          crmAPI.listContacts({ limit: 100 }),
          crmAPI.listLeads({ limit: 500 }),
          crmAPI.listClients({ limit: 500 }),
          crmAPI.listPipelines(),
          hrAPI.getEmployees({ limit: 500 }),
        ])

        setContacts(contactsRes.data || [])
        setLeads(leadsRes.data || [])
        setClients(clientsRes.data || [])
        setPipelines(pipelinesRes.data || [])
        setEmployees(employeesRes.data?.employees || [])

        if (pipelinesRes.data.length > 0) {
          setSelectedPipeline(pipelinesRes.data[0].id)
        }
        if (employeesRes.data.length > 0) {
          setSelectedEmployee(employeesRes.data[0].id)
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load CRM dashboard metrics. Please refresh.')
      } finally {
        setIsLoading(false)
      }
    }

    loadMetrics()
  }, [])

  const pipelineLeads = useMemo(() => {
    const counts = pipelines.map((pipeline) => ({
      pipeline,
      leads: leads.filter((lead) => lead.pipeline_id === pipeline.id),
    }))
    return counts
  }, [leads, pipelines])

  const pipelineSummary = useMemo(() => {
    const leadCounts = pipelineLeads.map(({ pipeline, leads: pipelineLeadList }) => ({
      id: pipeline.id,
      name: pipeline.name,
      leadCount: pipelineLeadList.length,
      totalValue: pipelineLeadList.reduce((sum, lead) => sum + (lead.value || 0), 0),
      convertedCount: pipelineLeadList.filter((lead) => lead.extra_data?.converted).length,
    }))
    return leadCounts
  }, [pipelineLeads])

  const employeeLeadCounts = useMemo(() => {
    return employees.map((employee) => {
      const employeeName = employee.name || employee.full_name || employee.email || employee.id
      const leadCount = leads.filter((lead) => lead.assignee === employeeName || lead.assignee === employee.id).length
      return {
        ...employee,
        leadCount,
      }
    })
  }, [employees, leads])

  const selectedPipelineMetrics = useMemo(() => {
    const pipeline = pipelines.find((p) => p.id === selectedPipeline)
    if (!pipeline) return null
    const pipelineLeadList = leads.filter((lead) => lead.pipeline_id === pipeline.id)
    return {
      pipeline,
      leadCount: pipelineLeadList.length,
      totalPotentialValue: pipelineLeadList.reduce((sum, lead) => sum + (lead.value || 0), 0),
      convertedCount: pipelineLeadList.filter((lead) => lead.extra_data?.converted).length,
      activeContactCount: pipelineLeadList.filter((lead) => lead.contact_id).length,
    }
  }, [selectedPipeline, leads, pipelines])

  const selectedEmployeeMetrics = useMemo(() => {
    const employee = employees.find((emp) => emp.id === selectedEmployee)
    if (!employee) return null
    const employeeName = employee.name || employee.full_name || employee.email || employee.id
    const employeeLeads = leads.filter((lead) => lead.assignee === employeeName || lead.assignee === employee.id)
    const pipelineBreakdown = pipelines.map((pipeline) => ({
      name: pipeline.name,
      count: employeeLeads.filter((lead) => lead.pipeline_id === pipeline.id).length,
    })).filter((item) => item.count > 0)
    return {
      employee,
      leadCount: employeeLeads.length,
      totalPotentialValue: employeeLeads.reduce((sum, lead) => sum + (lead.value || 0), 0),
      pipelineBreakdown,
    }
  }, [selectedEmployee, employees, leads, pipelines])

  const totalLeadValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0)
  const totalClientRevenue = clients.reduce((sum, client) => sum + (client.subscription_value || 0), 0)

  const leadTrend = buildTrend(leads, 'created_at', 7)
  const clientTrend = buildTrend(clients, 'client_since', 7)

  const pipelineLabels = pipelines.map((pipeline) => pipeline.name)
  const pipelineValues = pipelines.map((pipeline) => leads.filter((lead) => lead.pipeline_id === pipeline.id).length)
  const pipelineValueTotals = pipelines.map((pipeline) => leads.filter((lead) => lead.pipeline_id === pipeline.id).reduce((sum, lead) => sum + (lead.value || 0), 0))

  const pipelineChartData = {
    labels: pipelineLabels,
    datasets: [
      {
        label: 'Lead count',
        data: pipelineValues,
        backgroundColor: '#60a5fa',
      },
      {
        label: 'Pipeline value',
        data: pipelineValueTotals,
        backgroundColor: '#34d399',
      },
    ],
  }

  const clientStatusCounts = ['Active', 'Inactive', 'Churned'].map((status) => ({
    status,
    count: clients.filter((client) => (client.status || 'Active') === status).length,
  }))

  const clientStatusChartData = {
    labels: clientStatusCounts.map((item) => item.status),
    datasets: [
      {
        data: clientStatusCounts.map((item) => item.count),
        backgroundColor: ['#38bdf8', '#fbbf24', '#f87171'],
      },
    ],
  }

  const trendChartData = {
    labels: leadTrend.map((item) => item.label),
    datasets: [
      {
        label: 'Leads created',
        data: leadTrend.map((item) => item.count),
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.3)',
        fill: true,
      },
      {
        label: 'Clients converted',
        data: clientTrend.map((item) => item.count),
        borderColor: '#34d399',
        backgroundColor: 'rgba(52, 211, 153, 0.25)',
        fill: true,
      },
    ],
  }

  const leadStatusData = {
    labels: ['Contacts', 'Leads', 'Clients'],
    datasets: [
      {
        label: 'Records',
        data: [contacts.length, leads.length, clients.length],
        backgroundColor: ['#7c3aed', '#38bdf8', '#34d399'],
      },
    ],
  }

  if (isLoading) {
    return (
      <div className="crm-dashboard">
        <div className="crm-dashboard-loading">
          <Loader size={36} />
          <p>Loading CRM analytics…</p>
        </div>
      </div>
    )
  }

  return (
    <section className="crm-dashboard">
      <div className="crm-dashboard-header">
        <div>
          <h2>CRM Analytics</h2>
          <p>Track contacts, leads, clients, pipelines, and employee performance in one place.</p>
        </div>
      </div>

      {error && <div className="crm-dashboard-error">{error}</div>}

      <div className="crm-summary-grid">
        <div className="crm-summary-item">
          <h4>Total Contacts</h4>
          <strong>{formatNumber(contacts.length)}</strong>
        </div>
        <div className="crm-summary-item">
          <h4>Total Leads</h4>
          <strong>{formatNumber(leads.length)}</strong>
        </div>
        <div className="crm-summary-item">
          <h4>Active Clients</h4>
          <strong>{formatNumber(clients.length)}</strong>
        </div>
        <div className="crm-summary-item">
          <h4>Pipeline Value</h4>
          <strong>{formatCurrency(totalLeadValue)}</strong>
        </div>
        <div className="crm-summary-item">
          <h4>Client Revenue</h4>
          <strong>{formatCurrency(totalClientRevenue)}</strong>
        </div>
        <div className="crm-summary-item">
          <h4>Employees</h4>
          <strong>{formatNumber(employees.length)}</strong>
        </div>
      </div>

      <div className="crm-dashboard-chart-grid">
        <div className="dashboard-chart-card">
          <div className="dashboard-chart-card-header">
            <h4>Pipeline lead and value distribution</h4>
          </div>
          <Bar data={pipelineChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
        </div>

        <div className="dashboard-chart-card">
          <div className="dashboard-chart-card-header">
            <h4>Client status distribution</h4>
          </div>
          <Doughnut data={clientStatusChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
        </div>

        <div className="dashboard-chart-card dashboard-full-width">
          <div className="dashboard-chart-card-header">
            <h4>Lead creation vs client conversion trend</h4>
          </div>
          <Line data={trendChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
        </div>

        <div className="dashboard-chart-card">
          <div className="dashboard-chart-card-header">
            <h4>Contacts / Leads / Clients</h4>
          </div>
          <Doughnut data={leadStatusData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>

      <div className="dashboard-detail-grid">
        <div className="dashboard-detail-panel">
          <div className="dashboard-detail-panel-header">
            <h4>Pipeline insights</h4>
            <Select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              options={pipelines.map((pipeline) => ({
                value: pipeline.id,
                label: pipeline.name,
              }))}
            />
          </div>

          {selectedPipelineMetrics ? (
            <div className="dashboard-detail-cards">
              <div className="dashboard-detail-card">
                <span>Leads in pipeline</span>
                <strong>{formatNumber(selectedPipelineMetrics.leadCount)}</strong>
              </div>
              <div className="dashboard-detail-card">
                <span>Potential value</span>
                <strong>{formatCurrency(selectedPipelineMetrics.totalPotentialValue)}</strong>
              </div>
              <div className="dashboard-detail-card">
                <span>Converted leads</span>
                <strong>{formatNumber(selectedPipelineMetrics.convertedCount)}</strong>
              </div>
              <div className="dashboard-detail-card">
                <span>Leads with contact</span>
                <strong>{formatNumber(selectedPipelineMetrics.activeContactCount)}</strong>
              </div>
            </div>
          ) : (
            <p>No pipeline selected.</p>
          )}
        </div>

        <div className="dashboard-detail-panel">
          <div className="dashboard-detail-panel-header">
            <h4>Employee performance</h4>
            <Select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              options={employees.map((employee) => ({
                value: employee.id,
                label: employee.name || employee.email || employee.id,
              }))}
            />
          </div>

          {selectedEmployeeMetrics ? (
            <div className="dashboard-detail-cards">
              <div className="dashboard-detail-card">
                <span>Assigned leads</span>
                <strong>{formatNumber(selectedEmployeeMetrics.leadCount)}</strong>
              </div>
              <div className="dashboard-detail-card">
                <span>Potential value</span>
                <strong>{formatCurrency(selectedEmployeeMetrics.totalPotentialValue)}</strong>
              </div>
            </div>
          ) : (
            <p>No employee selected.</p>
          )}

          {selectedEmployeeMetrics?.pipelineBreakdown?.length > 0 && (
            <div className="pipeline-breakdown-list">
              <h5>Leads by pipeline</h5>
              {selectedEmployeeMetrics.pipelineBreakdown.map((item) => (
                <div key={item.name} className="pipeline-breakdown-item">
                  <span>{item.name}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="crm-dashboard-table-card">
        <h4>Pipeline overview</h4>
        <div className="pipeline-overview-list">
          {pipelineSummary.map((pipeline) => (
            <div key={pipeline.id} className="pipeline-overview-item">
              <div>
                <strong>{pipeline.name}</strong>
                <p>{formatNumber(pipeline.leadCount)} leads · {formatCurrency(pipeline.totalValue)} value</p>
              </div>
              <span>{pipeline.convertedCount} converted</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CRMAnalyticsDashboard
