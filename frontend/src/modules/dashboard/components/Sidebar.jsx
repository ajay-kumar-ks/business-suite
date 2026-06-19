import React from 'react'
import {
  Home,
  Users,
  UserCircle,
  DollarSign,
  CheckSquare,
  PhoneCall,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../../context/ThemeContext'
import Avatar from '../../../components/ui/Avatar'
import '../styles/Sidebar.css'

const Sidebar = ({ activeModule, setActiveModule, collapsed, setCollapsed, mobileOpen, setMobileOpen, onLogout, useLinks = true }) => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [profileOpen, setProfileOpen] = React.useState(false)

  const modules = [
    { id: 'accounts', label: 'Accounts', icon: DollarSign },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'crm', label: 'CRM', icon: PhoneCall },
    {
      id: 'hr',
      label: user?.is_admin ? 'HR' : 'My Space',
      icon: user?.is_admin ? Users : UserCircle,
    },
  ]

  

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''} ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <div className="sidebar-inner">
        <div className="sidebar-header">
          <div className="brand">
            <div className="logo">BS</div>
            {!collapsed && <div className="sidebar-title">Business Suite</div>}
          </div>

          <button
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {modules.map((module) => {
              const IconComponent = module.icon
              return (
                <li key={module.id}>
                  <ModuleButton module={module} IconComponent={IconComponent} activeModule={activeModule} setActiveModule={setActiveModule} useLinks={useLinks} />
                </li>
              )
            })}

            
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div
            className={`profile ${profileOpen ? 'active' : ''}`}
            onClick={() => setProfileOpen((open) => !open)}
            role="button"
            tabIndex={0}
            aria-expanded={profileOpen}
            onKeyDown={(e) => e.key === 'Enter' && setProfileOpen((open) => !open)}
          >
            <Avatar src={user?.avatar || ''} name={user?.full_name || user?.username} size={40} />
            {!collapsed && (
              <div className="profile-meta">
                <div className="profile-name">{user?.full_name || user?.username}</div>
                <div className="profile-email">{user?.email}</div>
              </div>
            )}
          </div>

          <div className={`profile-dropdown ${profileOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
            <button className="dropdown-item" type="button" title="Settings">
              <Settings size={16} />
              <span>Settings</span>
            </button>
            <button className="dropdown-item" type="button" title="Logout" onClick={onLogout}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
    </>
  )
}

export default Sidebar

function ModuleButton({ module, IconComponent, activeModule, setActiveModule, useLinks = true }) {
  const navigate = useNavigate()
  return (
    <button
      title={module.label}
      className={`nav-link ${activeModule === module.id ? 'active' : ''}`}
      onClick={() => {
        setActiveModule(module.id)
        if (useLinks) {
          navigate(`/${module.id}`)
        }
      }}
    >
      <span className="nav-icon">
        <IconComponent size={20} />
      </span>
      <span className="nav-label">{module.label}</span>
    </button>
  )
}
