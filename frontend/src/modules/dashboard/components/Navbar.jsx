import React from 'react'
import { Menu, Search } from 'lucide-react'
import ThemeToggle from '../../../components/ui/ThemeToggle'
import { useTaskNotifications } from '../../../context/TaskNotificationContext'
import NotificationDropdown from '../../tasks/components/NotificationDropdown'
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
        <NotificationDropdown />
      </div>
    </header>
  )
}

export default Navbar
