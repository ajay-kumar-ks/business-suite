import React, { useState, useEffect, useCallback } from 'react'
import '../../../styles/ModulePage.css'
import '../styles/HRPage.css'
import EmployeeTable from '../components/EmployeeTable'
import EmployeeModal from '../components/EmployeeModal'
import RoleTable from '../components/RoleTable'
import DepartmentTable from '../components/DepartmentTable'
import AttendanceTable from '../components/AttendanceTable'
import LeaveTable from '../components/LeaveTable'
import UserTable from '../components/UserTable'
import UserModal from '../components/UserModal'
import { hrAPI } from '../services/hrApi'
import Button from '../../../components/ui/Button'

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'roles', label: 'Roles' },
  { id: 'departments', label: 'Departments' },
  { id: 'employees', label: 'Employees' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leaves', label: 'Leaves' },
]

const HRPage = () => {
  const [activeTab, setActiveTab] = useState('users')

  const [employees, setEmployees] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(true)
  const [roles, setRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(true)
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

  // ── Fetch roles ──
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true)
    try {
      const res = await hrAPI.getRoles()
      setRoles(res.data || [])
    } catch (err) {
      console.error('Failed to fetch roles:', err)
    } finally {
      setRolesLoading(false)
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

  useEffect(() => {
    fetchUsers()
    fetchRoles()
    fetchDepartments()
    fetchEmployees()
    fetchAttendance()
    fetchLeaves()
    fetchDashboard()
  }, [fetchUsers, fetchRoles, fetchDepartments, fetchEmployees, fetchAttendance, fetchLeaves, fetchDashboard])

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
        `Role: ${employee.role_name || 'N/A'}\n` +
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
  const handleCreateUser = async (data) => {
    await hrAPI.createUser(data)
    fetchUsers()
  }

  const DASHBOARD_CARDS = [
    { key: 'total_employees', label: 'Total Employees', color: '#2563eb', icon: '👥' },
    { key: 'total_departments', label: 'Departments', color: '#7c3aed', icon: '🏢' },
    { key: 'present_today', label: 'Present Today', color: '#22c55e', icon: '✅' },
    { key: 'absent_today', label: 'Absent Today', color: '#ef4444', icon: '❌' },
    { key: 'pending_leaves', label: 'Pending Leaves', color: '#f59e0b', icon: '⏳' },
  ]

  return (
    <div className="module-page">
      <div className="page-header">
        <div>
          <h2>HR Module</h2>
          <p className="page-subtitle">Manage employee records, attendance, leave, and HR workflows.</p>
        </div>
      </div>

      {/* ── Dashboard Cards ── */}
      {dashboard && (
        <div className="dashboard-cards">
          {DASHBOARD_CARDS.map((card) => (
            <div
              key={card.key}
              className="dashboard-card"
              style={{ borderTopColor: card.color }}
            >
              <span className="card-icon">{card.icon}</span>
              <div className="card-info">
                <span className="card-value">{dashboard[card.key] ?? 0}</span>
                <span className="card-label">{card.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="hr-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`hr-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
        <div className="page-section">
          <div className="section-header">
            <h3>User Management</h3>
            <div className="section-actions">
              <span className="count-badge">{authUsers.length} users</span>
              <Button variant="primary" size="sm" onClick={() => setUserModalOpen(true)}>
                + Create User
              </Button>
            </div>
          </div>
          <UserTable
            users={authUsers}
            loading={usersLoading}
            onRefresh={fetchUsers}
          />

          <UserModal
            isOpen={userModalOpen}
            onClose={() => setUserModalOpen(false)}
            onSave={handleCreateUser}
          />
        </div>
      )}

      {/* ── Roles Tab ── */}
      {activeTab === 'roles' && (
        <div className="page-section">
          <div className="section-header">
            <h3>Role Tags</h3>
          </div>
          <RoleTable
            roles={roles}
            loading={rolesLoading}
            onRefresh={fetchRoles}
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
            onRefresh={() => { fetchDepartments(); fetchDashboard(); }}
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
                + Add Employee
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
            departments={departments}
            roles={roles}
          />
        </div>
      )}

      {/* ── Attendance Tab ── */}
      {activeTab === 'attendance' && (
        <div className="page-section">
          <div className="section-header">
            <h3>Attendance Records</h3>
          </div>
          <AttendanceTable
            attendanceRecords={attendanceRecords}
            loading={attendanceLoading}
          />
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
            onRefresh={() => { fetchLeaves(); fetchDashboard(); }}
          />
        </div>
      )}
    </div>
  )
}

export default HRPage
