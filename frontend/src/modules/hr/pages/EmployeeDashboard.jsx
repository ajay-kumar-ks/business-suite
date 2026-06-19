import React, { useState } from 'react'
import { User, ClipboardList, Umbrella } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import MyProfile from '../components/MyProfile'
import MyAttendance from '../components/MyAttendance'
import MyLeaves from '../components/MyLeaves'
import '../../../styles/ModulePage.css'
import '../styles/HRPage.css'
import '../styles/EmployeeDashboard.css'

const TABS = [
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'attendance', label: 'My Attendance', icon: ClipboardList },
  { id: 'leaves', label: 'My Leaves', icon: Umbrella },
]

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
  }

  return (
    <div className="module-page emp-dashboard">
      {/* ── Welcome Section ── */}
      <div className="welcome-section">
        <div className="welcome-text">
          <h2>Welcome back, {user?.full_name || user?.username || 'Employee'} 👋</h2>
          <p>Manage your profile, attendance, and leave requests.</p>
        </div>
        <div className="welcome-date">
          <span className="date-large">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          <span>My Space · Employee Self-Service</span>
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
            <tab.icon size={16} /> {tab.label}
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
