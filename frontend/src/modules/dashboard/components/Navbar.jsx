import React from 'react'
import { Menu, Search, Bell } from 'lucide-react'
import ThemeToggle from '../../../components/ui/ThemeToggle'
import { useTaskNotifications } from '../../../context/TaskNotificationContext'
import '../../dashboard/styles/Navbar.css'

const Navbar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const { overdueCount } = useTaskNotifications()

  const handleHamburger = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      setMobileOpen(!mobileOpen)
    } else {
      setCollapsed(!collapsed)
    }
  }

  return (
    <header className="app-navbar">
      <div className="nav-left">
        <button className="hamburger" onClick={handleHamburger} aria-label="Toggle sidebar">
          <Menu size={20} />
        </button>
        <div className="nav-search">
          <Search size={16} />
          <input placeholder="Search..." />
        </div>
      </div>

      <div className="nav-right">
        <ThemeToggle />
        <button className="icon-btn" title="Notifications" style={{ position: 'relative' }}>
          <Bell size={18} />
          {overdueCount > 0 && (
            <span className="notification-badge">
              {overdueCount > 99 ? '99+' : overdueCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

export default Navbar
