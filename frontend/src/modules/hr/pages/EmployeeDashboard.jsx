import React, { useState } from 'react'
import MyProfile from '../components/MyProfile'
import MyAttendance from '../components/MyAttendance'
import MyLeaves from '../components/MyLeaves'
import '../../../styles/ModulePage.css'
import '../styles/HRPage.css'
import '../styles/EmployeeDashboard.css'

const TABS = [
  { id: 'profile', label: 'My Profile', icon: '👤' },
  { id: 'attendance', label: 'My Attendance', icon: '📋' },
  { id: 'leaves', label: 'My Leaves', icon: '🏖️' },
]

const EmployeeDashboard = () => {
  const [activeTab, setActiveTab] = useState('profile')

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
  }

  return (
    <div className="module-page emp-dashboard">
      <div className="page-header">
        <div>
          <h2>Employee Dashboard</h2>
          <p className="page-subtitle">Manage your profile, attendance, and leave requests.</p>
        </div>
      </div>

      {/* ── Modern Segmented Tabs ── */}
      <div className="emp-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`emp-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content with Transition ── */}
      <div className="emp-tab-content" key={activeTab}>
        {activeTab === 'profile' && <MyProfile />}
        {activeTab === 'attendance' && <MyAttendance />}
        {activeTab === 'leaves' && <MyLeaves />}
      </div>
    </div>
  )
}

export default EmployeeDashboard
