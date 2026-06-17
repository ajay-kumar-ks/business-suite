import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import '../../styles/ThemeToggle.css'

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()
  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}

export default ThemeToggle
