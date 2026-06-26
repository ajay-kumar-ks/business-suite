import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Users,
  Building2,
  UserCheck,
  UserX,
  Clock,
  Plus,
  UserPlus,
  Eye,
  Pencil,
  Trash2,
  Settings,
  Maximize2,
  Brain,
  FileText,
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import '../../../styles/ModulePage.css'
import '../styles/HRPage.css'
import EmployeeTable from '../components/EmployeeTable'
import EmployeeModal from '../components/EmployeeModal'
import DepartmentTable from '../components/DepartmentTable'
import AttendanceTable from '../components/AttendanceTable'
import LeaveTable from '../components/LeaveTable'
import UserTable from '../components/UserTable'
import UserModal from '../components/UserModal'
import RecruitmentDashboard from '../components/RecruitmentDashboard'
import RecruitmentKanban from '../components/RecruitmentKanban'
import CandidateModal from '../components/CandidateModal'
import CandidateDetail from '../components/CandidateDetail'
import ConvertToEmployeeModal from '../components/ConvertToEmployeeModal'
import PipelineManager from '../components/PipelineManager'
import { hrAPI } from '../services/hrApi'
import { recruitmentAPI } from '../services/recruitmentApi'
import { hrAiAPI } from '../services/hrAiApi'
import AIInsights from '../components/AIInsights'
import AIJobDescription from '../components/AIJobDescription'
import HRChatBot from '../components/HRChatBot'
import Button from '../../../components/ui/Button'
import { useTheme } from '../../../context/ThemeContext'
import '../styles/Recruitment.css'
import '../styles/HRChatBot.css'

// ── Register Chart.js components ──
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'recruitment', label: 'Recruitment', icon: UserPlus },
  { id: 'attendance', label: 'Attendance', icon: UserCheck },
  { id: 'leaves', label: 'Leaves', icon: Clock },
  { id: 'ai-insights', label: 'AI Insights', icon: Brain },
  { id: 'ai-job-description', label: 'AI Job Description', icon: FileText },
]

const CARD_CONFIG = [
  { key: 'total_employees', label: 'Total Employees', icon: Users, color: '#3b82f6', bg: '#eff6ff' },
  { key: 'total_departments', label: 'Departments', icon: Building2, color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'present_today', label: 'Present Today', icon: UserCheck, color: '#22c55e', bg: '#f0fdf4' },
  { key: 'absent_today', label: 'Absent Today', icon: UserX, color: '#ef4444', bg: '#fef2f2' },
  { key: 'pending_leaves', label: 'Pending Leaves', icon: Clock, color: '#f59e0b', bg: '#fffbeb' },
]

const HRPage = () => {
  const [activeTab, setActiveTab] = useState('users')

  const [employees, setEmployees] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(true)
  const [departments, setDepartments] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [attendanceLoading, setAttendanceLoading] = useState(true)
  const [leaves, setLeaves] = useState([])
  const [leavesLoading, setLeavesLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [authUsers, setAuthUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [userModalOpen, setUserModalOpen] = useState(false)

  // ── Recruitment state ──
  const [recruitmentSubTab, setRecruitmentSubTab] = useState('dashboard')
  const [candidates, setCandidates] = useState([])
  const [candidatesLoading, setCandidatesLoading] = useState(true)
  const [recruitmentStats, setRecruitmentStats] = useState(null)
  const [recruitmentStatsLoading, setRecruitmentStatsLoading] = useState(true)
  const [candidateModalOpen, setCandidateModalOpen] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [candidateToConvert, setCandidateToConvert] = useState(null)
  const [pipelineManagerOpen, setPipelineManagerOpen] = useState(false)

  // ── Chart theme re-render key ──
  const [themeTick, setThemeTick] = useState(0)
  const [attendanceTrendPeriod, setAttendanceTrendPeriod] = useState('weekly')
  const [attendanceTrendMonthlyMode, setAttendanceTrendMonthlyMode] = useState('weekwise')
  const [attendanceTrendModalOpen, setAttendanceTrendModalOpen] = useState(false)

  useEffect(() => {
    if (attendanceTrendModalOpen) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [attendanceTrendModalOpen])

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((t) => t + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  const [pipelineTemplates, setPipelineTemplates] = useState([])

  // ── Fetch dashboard ──
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await hrAPI.getDashboard()
      setDashboard(res.data)
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    }
  }, [])

  // ── Fetch employees ──
  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true)
    try {
      const res = await hrAPI.getEmployees()
      setEmployees(res.data.employees || [])
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    } finally {
      setEmployeesLoading(false)
    }
  }, [])

  // ── Fetch departments ──
  const fetchDepartments = useCallback(async () => {
    setDepartmentsLoading(true)
    try {
      const res = await hrAPI.getDepartments()
      setDepartments(res.data || [])
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    } finally {
      setDepartmentsLoading(false)
    }
  }, [])

  // ── Fetch attendance ──
  const fetchAttendance = useCallback(async () => {
    setAttendanceLoading(true)
    try {
      const res = await hrAPI.getAttendance()
      setAttendanceRecords(res.data.attendance_records || [])
    } catch (err) {
      console.error('Failed to fetch attendance:', err)
    } finally {
      setAttendanceLoading(false)
    }
  }, [])

  // ── Fetch leaves ──
  const fetchLeaves = useCallback(async () => {
    setLeavesLoading(true)
    try {
      const res = await hrAPI.getLeaves()
      setLeaves(res.data || [])
    } catch (err) {
      console.error('Failed to fetch leaves:', err)
    } finally {
      setLeavesLoading(false)
    }
  }, [])

  // ── Fetch users ──
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const res = await hrAPI.getUsers()
      setAuthUsers(res.data || [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  // ── Fetch recruitment data ──
  const fetchCandidates = useCallback(async () => {
    setCandidatesLoading(true)
    try {
      const res = await recruitmentAPI.getCandidates()
      setCandidates(res.data || [])
    } catch (err) {
      console.error('Failed to fetch candidates:', err)
    } finally {
      setCandidatesLoading(false)
    }
  }, [])

  const fetchRecruitmentStats = useCallback(async () => {
    setRecruitmentStatsLoading(true)
    try {
      const res = await recruitmentAPI.getDashboard()
      setRecruitmentStats(res.data)
    } catch (err) {
      console.error('Failed to fetch recruitment stats:', err)
    } finally {
      setRecruitmentStatsLoading(false)
    }
  }, [])

  const fetchPipelineTemplates = useCallback(async () => {
    try {
      const res = await recruitmentAPI.getPipelineTemplates()
      setPipelineTemplates(res.data || [])
    } catch (err) {
      console.error('Failed to fetch pipeline templates:', err)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchDepartments()
    fetchEmployees()
    fetchAttendance()
    fetchLeaves()
    fetchDashboard()
    fetchCandidates()
    fetchRecruitmentStats()
    fetchPipelineTemplates()
  }, [fetchUsers, fetchDepartments, fetchEmployees, fetchAttendance, fetchLeaves, fetchDashboard, fetchCandidates, fetchRecruitmentStats, fetchPipelineTemplates])

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5']
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  const getAttendanceTrendLabels = useCallback(() => {
    if (attendanceTrendPeriod === 'monthly') {
      if (attendanceTrendMonthlyMode === 'datewise') {
        const end = new Date(currentYear, currentMonth + 1, 0)
        return Array.from({ length: end.getDate() }, (_, i) => `${i + 1}`)
      }
      return weekLabels
    }
    if (attendanceTrendPeriod === 'yearly') return monthNames
    return dayNames
  }, [attendanceTrendPeriod, attendanceTrendMonthlyMode, currentYear, currentMonth, weekLabels, monthNames, dayNames])

  const attendanceTrendData = useMemo(() => {
    const labels = getAttendanceTrendLabels()

    const present = Array(labels.length).fill(0)
    const absent = Array(labels.length).fill(0)

    attendanceRecords.forEach((rec) => {
      if (!rec.date) return
      const date = new Date(rec.date)
      if (Number.isNaN(date.getTime())) return

      let index = -1
      if (attendanceTrendPeriod === 'weekly') {
        index = date.getDay()
      } else if (attendanceTrendPeriod === 'monthly') {
        if (date.getFullYear() !== currentYear || date.getMonth() !== currentMonth) return
        if (attendanceTrendMonthlyMode === 'datewise') {
          index = date.getDate() - 1
        } else {
          index = Math.min(4, Math.floor((date.getDate() - 1) / 7))
        }
      } else {
        if (date.getFullYear() !== currentYear) return
        index = date.getMonth()
      }

      if (index < 0 || index >= labels.length) return
      if (rec.status === 'Present') present[index]++
      else if (rec.status === 'Absent') absent[index]++
    })

    return {
      labels,
      datasets: [
        {
          label: 'Present',
          data: present,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Absent',
          data: absent,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          fill: true,
          tension: 0.4,
        },
      ],
    }
  }, [attendanceRecords, attendanceTrendPeriod, attendanceTrendMonthlyMode, getAttendanceTrendLabels, currentYear, currentMonth])

  // ── Employee handlers ──
  const handleAddEmployee = () => {
    setEditingEmployee(null)
    setModalOpen(true)
  }

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee)
    setModalOpen(true)
  }

  const handleDeleteEmployee = async (employee) => {
    if (!window.confirm(`Delete employee ${employee.employee_code}?`)) return
    try {
      await hrAPI.deleteEmployee(employee.id)
      fetchEmployees()
      fetchDashboard()
    } catch (err) {
      console.error('Failed to delete employee:', err)
    }
  }

  const handleViewEmployee = (employee) => {
    alert(
      `Employee: ${employee.employee_code}\n` +
        `Name: ${employee.user_name}\n` +
        `Department: ${employee.department_name || 'N/A'}\n` +
        `Phone: ${employee.phone || 'N/A'}\n` +
        `Status: ${employee.status}\n` +
        `Joined: ${employee.joining_date || 'N/A'}\n` +
        `Salary: ${employee.salary != null ? `$${employee.salary.toLocaleString()}` : 'N/A'}`
    )
  }

  const handleSaveEmployee = async (data) => {
    if (editingEmployee) {
      await hrAPI.updateEmployee(editingEmployee.id, data)
    } else {
      await hrAPI.createEmployee(data)
    }
    fetchEmployees()
    fetchDashboard()
  }

  // ── User handlers ──
  const [editingUser, setEditingUser] = useState(null)

  const handleEditUser = (user) => {
    setEditingUser(user)
    setUserModalOpen(true)
  }

  const handleUpdateUser = async (data) => {
    if (editingUser) {
      await hrAPI.updateUser(editingUser.id, data)
    } else {
      await hrAPI.createUser(data)
    }
    fetchUsers()
  }

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return
    try {
      await hrAPI.deleteUser(user.id)
      fetchUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
    }
  }

  const handleUserModalClose = () => {
    setUserModalOpen(false)
    setEditingUser(null)
  }

  // ── Recruitment handlers ──
  const handleAddCandidate = () => {
    setEditingCandidate(null)
    setCandidateModalOpen(true)
  }

  const handleEditCandidate = (candidate) => {
    setEditingCandidate(candidate)
    setCandidateModalOpen(true)
  }

  const handleDeleteCandidate = async (candidate) => {
    if (!window.confirm(`Delete candidate "${candidate.full_name}"? This cannot be undone.`)) return
    try {
      await recruitmentAPI.deleteCandidate(candidate.id)
      fetchCandidates()
      fetchRecruitmentStats()
    } catch (err) {
      console.error('Failed to delete candidate:', err)
    }
  }

  const handleSaveCandidate = async (data) => {
    try {
      if (editingCandidate) {
        await recruitmentAPI.updateCandidate(editingCandidate.id, data)
      } else {
        await recruitmentAPI.createCandidate(data)
      }
      fetchCandidates()
      fetchRecruitmentStats()
    } catch (err) {
      console.error('Failed to save candidate:', err)
      throw err // Let the modal catch and display the error
    }
  }

  const handleViewCandidate = (candidate) => {
    setSelectedCandidate(candidate)
  }

  const handleMoveStage = async (candidateId, targetStage) => {
    // Optimistic update: move card instantly in local state
    const newStatus =
      targetStage === 'Rejected' ? 'rejected'
      : targetStage === 'Onboarded' ? 'onboarded'
      : undefined

    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? { ...c, current_stage: targetStage, ...(newStatus && { status: newStatus }) }
          : c
      )
    )
    // Fire API in background — no await, instant UI update
    recruitmentAPI.moveStage(candidateId, targetStage).catch(() => {
      // If API fails, refetch to revert
      fetchCandidates()
    })
    // Silently refresh stats in background
    fetchRecruitmentStats()
  }

  const handleConvertToEmployee = async (candidate) => {
    setCandidateToConvert(candidate)
    setConvertModalOpen(true)
  }

  const handleConverted = () => {
    fetchCandidates()
    fetchRecruitmentStats()
    fetchEmployees()
    setConvertModalOpen(false)
    setCandidateToConvert(null)
  }

  const handlePipelinesSaved = () => {
  }

  const handleCandidateModalClose = () => {
    setCandidateModalOpen(false)
    setEditingCandidate(null)
  }

  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'

  // ════════════════════════════════════════════════
  //  CHART COLORS (reactively derived from theme)
  // ════════════════════════════════════════════════

  const chartColors = useMemo(() => ({
    text: isDarkMode ? '#94a3b8' : '#64748b',
    grid: isDarkMode ? '#1e293b' : '#f1f5f9',
    tooltipBg: isDarkMode ? '#1e293b' : '#ffffff',
    tooltipTitle: isDarkMode ? '#e2e8f0' : '#1e293b',
    tooltipBody: isDarkMode ? '#cbd5e1' : '#475569',
    tooltipBorder: isDarkMode ? '#334155' : '#e2e8f0',
  }), [isDarkMode])

  // ════════════════════════════════════════════════
  //  CHART DATA (memoized)
  // ════════════════════════════════════════════════

  // ════════════════════════════════════════════════
  //  Department Distribution
  // ════════════════════════════════════════════════
  const departmentChartData = useMemo(() => {
    const deptLabels = departments.length ? departments.map((d) => d.name) : ['Engineering', 'Marketing', 'Sales', 'Operations']
    const deptData = departments.length
      ? departments.map((d) => employees.filter((e) => e.department_name === d.name).length)
      : [8, 5, 6, 4]

    return {
      labels: deptLabels,
      datasets: [
        {
          data: deptData,
          backgroundColor: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'],
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    }
  }, [departments, employees])

  // ── Leave Status ──
  const leaveChartData = useMemo(() => {
    const leavePending = leaves.filter((l) => l.status === 'Pending').length
    const leaveApproved = leaves.filter((l) => l.status === 'Approved').length
    const leaveRejected = leaves.filter((l) => l.status === 'Rejected').length

    return {
      labels: ['Pending', 'Approved', 'Rejected'],
      datasets: [
        {
          data: [leavePending, leaveApproved, leaveRejected],
          backgroundColor: ['#f59e0b', '#22c55e', '#ef4444'],
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    }
  }, [leaves])

  // ════════════════════════════════════════════════
  //  CHART OPTIONS (memoized per theme)
  // ════════════════════════════════════════════════

  const { text: tc, grid: gc, tooltipBg, tooltipTitle, tooltipBody, tooltipBorder } = chartColors

  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 200,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { color: tc, padding: 12, usePointStyle: true, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipTitle,
        bodyColor: tooltipBody,
        borderColor: tooltipBorder,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: gc, drawBorder: false },
        ticks: { color: tc, font: { size: 11 } },
      },
      y: {
        grid: { color: gc, drawBorder: false },
        ticks: { color: tc, font: { size: 11 }, stepSize: 1 },
        beginAtZero: true,
      },
    },
  }), [tc, gc, tooltipBg, tooltipTitle, tooltipBody, tooltipBorder])

  const doughnutChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 200,
    cutout: '65%',
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { color: tc, padding: 12, usePointStyle: true, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipTitle,
        bodyColor: tooltipBody,
        borderColor: tooltipBorder,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      },
    },
  }), [tc, tooltipBg, tooltipTitle, tooltipBody, tooltipBorder])

  // ════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════

  return (
    <div className="module-page">
      {/* ── Welcome Section ── */}
      <div className="welcome-section">
        <div className="welcome-text">
          <h2>HR Dashboard</h2>
          <p>Manage employee records, attendance, leave, and HR workflows.</p>
        </div>
        <div className="welcome-date">
          <span className="date-large">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          <span>
            {dashboard
              ? `${dashboard.total_employees ?? 0} employees · ${dashboard.total_departments ?? 0} departments`
              : 'Loading...'}
          </span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {dashboard && (
        <div className="dashboard-cards">
          {CARD_CONFIG.map((card) => {
            const IconComp = card.icon
            return (
              <div key={card.key} className="dashboard-card">
                <div className="card-icon-wrapper" style={{ background: card.bg, color: card.color }}>
                  <IconComp size={22} />
                </div>
                <div className="card-info">
                  <span className="card-value">{dashboard[card.key] ?? 0}</span>
                  <span className="card-label">{card.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Charts Section ── */}
      {dashboard && (attendanceRecords.length > 0 || departments.length > 0 || leaves.length > 0) && (
        <>
          <div className="charts-section">
            <div className="chart-card">
              <div className="chart-card-header">
                <h4>Attendance Trend</h4>
                <div className="chart-header-row">
                  <div className="trend-tabs">
                    {['weekly', 'monthly', 'yearly'].map((period) => (
                      <div key={period} className={`trend-tab ${attendanceTrendPeriod === period ? 'active' : ''}`}>
                        <button
                          type="button"
                          className={`trend-tab-button ${attendanceTrendPeriod === period ? 'active' : ''}`}
                          onClick={() => setAttendanceTrendPeriod(period)}
                        >
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </button>
                        {period === 'monthly' && (
                          <div className="monthly-dropdown">
                            {['weekwise', 'datewise'].map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                className={`dropdown-item ${attendanceTrendMonthlyMode === mode ? 'active' : ''}`}
                                onClick={() => setAttendanceTrendMonthlyMode(mode)}
                              >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="chart-header-actions">
                    <button
                      type="button"
                      className="chart-expand-button small"
                      onClick={() => setAttendanceTrendModalOpen(true)}
                      aria-label="Open full screen"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="chart-scroll-wrapper">
                <div
                  className="chart-container"
                  style={{
                    minWidth:
                      attendanceTrendPeriod === 'monthly' && attendanceTrendMonthlyMode === 'datewise'
                        ? `${(attendanceTrendData.labels || []).length * 30}px`
                        : '100%',
                  }}
                >
                  <Line key={`line-${themeTick}-${attendanceTrendPeriod}`} data={attendanceTrendData} options={lineOptions} />
                </div>
              </div>
            </div>
            <div className="chart-card">
              <h4>Department Distribution</h4>
              <div className="chart-container">
                <Doughnut key={`dept-${themeTick}`} data={departmentChartData} options={doughnutChartOptions} />
              </div>
            </div>
            <div className="chart-card">
              <h4>Leave Requests</h4>
              <div className="chart-container">
                <Doughnut key={`leave-${themeTick}`} data={leaveChartData} options={doughnutChartOptions} />
              </div>
            </div>
          </div>

          {attendanceTrendModalOpen && (
            <div className="modal-overlay" role="dialog" aria-modal="true">
              <div className="modal-content chart-modal-content">
                <div className="modal-header">
                  <h3>Attendance Trend ({attendanceTrendPeriod.charAt(0).toUpperCase() + attendanceTrendPeriod.slice(1)})</h3>
                  <button className="modal-close" type="button" onClick={() => setAttendanceTrendModalOpen(false)}>
                    ×
                  </button>
                </div>
                <div className="modal-form">
                  <div className="chart-card-actions modal-actions-row">
                    <div className="trend-tabs modal-tabs">
                      {['weekly', 'monthly', 'yearly'].map((period) => (
                        <div key={`modal-${period}`} className={`trend-tab ${attendanceTrendPeriod === period ? 'active' : ''}`}>
                          <button
                            type="button"
                            className={`trend-tab-button ${attendanceTrendPeriod === period ? 'active' : ''}`}
                            onClick={() => setAttendanceTrendPeriod(period)}
                          >
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                          </button>
                          {period === 'monthly' && (
                            <div className="monthly-dropdown">
                              {['weekwise', 'datewise'].map((mode) => (
                                <button
                                  key={`modal-monthly-${mode}`}
                                  type="button"
                                  className={`dropdown-item ${attendanceTrendMonthlyMode === mode ? 'active' : ''}`}
                                  onClick={() => setAttendanceTrendMonthlyMode(mode)}
                                >
                                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="chart-scroll-wrapper">
                    <div
                      className="chart-container chart-modal-chart"
                      style={{
                        minWidth:
                          attendanceTrendPeriod === 'monthly' && attendanceTrendMonthlyMode === 'datewise'
                            ? `${(attendanceTrendData.labels || []).length * 30}px`
                            : '100%',
                      }}
                    >
                      <Line key={`modal-line-${attendanceTrendPeriod}-${themeTick}`} data={attendanceTrendData} options={lineOptions} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Pill Tabs ── */}
      <div className="hr-tabs">
        {TABS.map((tab) => {
          const IconComp = tab.icon
          return (
            <button
              key={tab.id}
              className={`hr-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IconComp size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
        <div className="page-section">
          <div className="section-header">
            <h3>User Management</h3>
            <div className="section-actions">
              <span className="count-badge">{authUsers.length} users</span>
              <Button variant="primary" size="sm" onClick={() => setUserModalOpen(true)}>
                <Plus size={16} style={{ marginRight: 4 }} />
                Create User
              </Button>
            </div>
          </div>
          <UserTable
            users={authUsers}
            loading={usersLoading}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
          />
          <UserModal
            isOpen={userModalOpen}
            onClose={handleUserModalClose}
            onSave={handleUpdateUser}
            initialData={editingUser}
          />
        </div>
      )}

      {/* ── Departments Tab ── */}
      {activeTab === 'departments' && (
        <div className="page-section">
          <div className="section-header">
            <h3>Departments</h3>
          </div>
          <DepartmentTable
            departments={departments}
            loading={departmentsLoading}
            onRefresh={() => { fetchDepartments(); fetchEmployees(); fetchDashboard() }}
            allEmployees={employees}
          />
        </div>
      )}

      {/* ── Employees Tab ── */}
      {activeTab === 'employees' && (
        <div className="page-section">
          <div className="section-header">
            <h3>Employees</h3>
            <div className="section-actions">
              <span className="count-badge">{employees.length} total</span>
              <Button variant="primary" size="sm" onClick={handleAddEmployee}>
                <Plus size={16} style={{ marginRight: 4 }} />
                Add Employee
              </Button>
            </div>
          </div>
          <EmployeeTable
            employees={employees}
            loading={employeesLoading}
            onView={handleViewEmployee}
            onEdit={handleEditEmployee}
            onDelete={handleDeleteEmployee}
          />
          <EmployeeModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSave={handleSaveEmployee}
            initialData={editingEmployee}
            users={authUsers}
          />
        </div>
      )}

      {/* ── Recruitment Tab ── */}
      {activeTab === 'recruitment' && (
        <div className="page-section">
          <div className="section-header">
            <h3>Recruitment Pipeline</h3>
            <div className="section-actions">
              <span className="count-badge">{candidates.length} candidates</span>
              <Button variant="primary" size="sm" onClick={handleAddCandidate}>
                <Plus size={16} style={{ marginRight: 4 }} />
                Add Candidate
              </Button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="recruitment-tabs">
            <button
              className={`recruitment-tab ${recruitmentSubTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setRecruitmentSubTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`recruitment-tab ${recruitmentSubTab === 'pipeline' ? 'active' : ''}`}
              onClick={() => setRecruitmentSubTab('pipeline')}
            >
              Pipeline View
            </button>
            <button
              className={`recruitment-tab ${recruitmentSubTab === 'list' ? 'active' : ''}`}
              onClick={() => setRecruitmentSubTab('list')}
            >
              All Candidates
            </button>
            <button
              className={`recruitment-tab ${recruitmentSubTab === 'pipelines' ? 'active' : ''}`}
              onClick={() => setRecruitmentSubTab('pipelines')}
            >
              Pipelines
            </button>
          </div>

          {/* Dashboard View */}
          {recruitmentSubTab === 'dashboard' && (
            <RecruitmentDashboard stats={recruitmentStats} loading={recruitmentStatsLoading} />
          )}

          {/* Pipeline View */}
          {recruitmentSubTab === 'pipeline' && (
            <RecruitmentKanban
              candidates={candidates}
              loading={candidatesLoading}
              departments={departments}
              onMoveStage={handleMoveStage}
              onViewDetails={handleViewCandidate}
              onConvertToEmployee={handleConvertToEmployee}
              onRefresh={() => { fetchCandidates(); fetchRecruitmentStats() }}
            />
          )}

          {/* Pipelines View */}
          {recruitmentSubTab === 'pipelines' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Button variant="secondary" size="sm" onClick={() => setPipelineManagerOpen(true)}>
                  <Settings size={16} style={{ marginRight: 4 }} />
                  Manage Pipeline Templates
                </Button>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Configure recruitment pipeline stages. Click "Manage Pipeline Templates" to view and edit.
              </p>
            </div>
          )}

          {/* List View */}
          {recruitmentSubTab === 'list' && (
            <div>
              {candidatesLoading ? (
                <div className="table-status">
                  <div className="spinner" />
                  <span>Loading candidates...</span>
                </div>
              ) : candidates.length === 0 ? (
                <div className="table-status empty">
                  <span>No candidates found. Add one to get started.</span>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Department</th>
                        <th>Stage</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((c) => {
                        const stageColors = {
                          Applied: '#8b5cf6',
                          Screening: '#3b82f6',
                          Interview: '#f59e0b',
                          'Technical Round': '#f97316',
                          'HR Round': '#ec4899',
                          Selected: '#22c55e',
                          Rejected: '#ef4444',
                          Onboarded: '#14b8a6',
                        }
                        return (
                          <tr key={c.id}>
                            <td className="name-cell">{c.full_name}</td>
                            <td>{c.email}</td>
                            <td>{c.phone || '—'}</td>
                            <td>{c.department_name || 'N/A'}</td>
                            <td>
                              <span className="status-badge" style={{ backgroundColor: stageColors[c.current_stage] || '#6b7280' }}>
                                {c.current_stage}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: c.status === 'converted' ? '#3b82f6' : c.status === 'rejected' ? '#ef4444' : c.status === 'onboarded' ? '#14b8a6' : '#64748b',
                              }}>
                                {c.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                              {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="actions-cell">
                              <button className="action-btn view" onClick={() => handleViewCandidate(c)} title="View details">
                                <Eye size={16} />
                              </button>
                              <button className="action-btn edit" onClick={() => handleEditCandidate(c)} title="Edit candidate">
                                <Pencil size={16} />
                              </button>
                              <button className="action-btn delete" onClick={() => handleDeleteCandidate(c)} title="Delete candidate">
                                <Trash2 size={16} />
                              </button>

                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Modals */}
          <PipelineManager
            isOpen={pipelineManagerOpen}
            onClose={() => setPipelineManagerOpen(false)}
            onSaved={handlePipelinesSaved}
            departments={departments}
          />

          <CandidateModal
              isOpen={candidateModalOpen}
              onClose={handleCandidateModalClose}
              onSave={handleSaveCandidate}
              initialData={editingCandidate}
              departments={departments}
              pipelineTemplates={pipelineTemplates}
          />

          <CandidateDetail
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
          />

          <ConvertToEmployeeModal
            key={candidateToConvert?.id || 'convert'}
            isOpen={convertModalOpen}
            onClose={() => { setConvertModalOpen(false); setCandidateToConvert(null) }}
            candidate={candidateToConvert}
            onConverted={handleConverted}
          />
        </div>
      )}

      {/* ── Attendance Tab ── */}
      {activeTab === 'attendance' && (
        <div className="page-section">
          <div className="section-header">
            <h3>Attendance Records</h3>
          </div>
          <AttendanceTable attendanceRecords={attendanceRecords} loading={attendanceLoading} />
        </div>
      )}

      {/* ── Leaves Tab ── */}
      {activeTab === 'leaves' && (
        <div className="page-section">
          <div className="section-header">
            <h3>Leave Requests</h3>
          </div>
          <LeaveTable
            leaves={leaves}
            loading={leavesLoading}
            onRefresh={() => { fetchLeaves(); fetchDashboard() }}
          />
        </div>
      )}

      {/* ── AI Insights Tab ── */}
      {activeTab === 'ai-insights' && (
        <div className="page-section">
          <div className="section-header">
            <h3>AI HR Insights</h3>
          </div>
          <div style={{ maxWidth: 768, margin: '0 auto' }}>
            <AIInsights
              variant="page"
              onGenerate={async () => {
                const res = await hrAiAPI.getInsights()
                return res
              }}
            />
          </div>
        </div>
      )}

      {/* ── AI Job Description Tab ── */}
      {activeTab === 'ai-job-description' && (
        <AIJobDescription />
      )}

      {/* HR Chatbot — floating assistant */}
      <HRChatBot />
    </div>
  )
}

export default HRPage
