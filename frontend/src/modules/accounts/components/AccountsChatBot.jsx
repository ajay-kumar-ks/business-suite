import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Sparkles, Minimize2, Maximize2, User } from 'lucide-react'
import { accountsAPI } from '../../../services/api'
import '../styles/AccountsChatBot.css'

const STORAGE_KEY = 'accounts_chatbot_history'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hi! I’m your Accounts assistant. I can help you with invoices, bills, budgets, journals, cash flow, and account records. What would you like to review?",
}

function renderRichContent(text) {
  if (!text) return null

  const paragraphs = text.split('\n\n').filter(Boolean)
  const elements = []

  paragraphs.forEach((para, pIdx) => {
    const lines = para.split('\n').filter(Boolean)
    const bulletItems = lines.filter((l) => l.match(/^[-•*]/))

    if (bulletItems.length >= 2 && bulletItems.length === lines.length) {
      elements.push(
        <div key={pIdx} className="accounts-chatbot-rich-list-wrapper">
          <ul className="accounts-chatbot-rich-list">
            {bulletItems.map((item, i) => {
              const innerText = item.replace(/^[-•*]\s*/, '')
              return (
                <li key={i} className="accounts-chatbot-rich-list-item">
                  {innerText}
                </li>
              )
            })}
          </ul>
        </div>
      )
      return
    }

    elements.push(
      <p key={pIdx} className="accounts-chatbot-rich-paragraph">
        {lines.join(' ')}
      </p>
    )
  })

  return elements
}

function loadChatHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // Ignore malformed history
  }
  return [WELCOME_MESSAGE]
}

function saveChatHistory(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)))
  } catch {
    // Ignore storage issues
  }
}

const AccountsChatBot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState(loadChatHistory)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 620 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const chatRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    saveChatHistory(messages)
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen, isMinimized])

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 380),
        y: Math.min(prev.y, window.innerHeight - 100),
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.accounts-chatbot-header-actions')) return
    setIsDragging(true)
    const rect = chatRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      setPosition({
        x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 380)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 100)),
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  const sendMessage = useCallback(async () => {
    const message = inputValue.trim()
    if (!message || isLoading) return

    setInputValue('')
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setIsLoading(true)

    try {
      const res = await accountsAPI.chat(message, messages.slice(-20).map((m) => ({ role: m.role, content: m.content })))
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please check your connection and try again.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, messages])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleOpen = () => {
    setIsOpen((prev) => !prev)
    setIsMinimized(false)
  }

  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev)
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsMinimized(false)
  }

  const handleClearHistory = () => {
    const fresh = [WELCOME_MESSAGE]
    setMessages(fresh)
    saveChatHistory(fresh)
  }

  return (
    <>
      <button
        className={`accounts-chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={toggleOpen}
        aria-label="Toggle Accounts Chat"
        title="Accounts Assistant"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {isOpen && (
        <div
          ref={chatRef}
          className={`accounts-chatbot-window ${isMinimized ? 'minimized' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{
            right: Math.max(20, window.innerWidth - position.x - 380),
            bottom: Math.max(20, window.innerHeight - position.y - 500),
            transform: 'none',
            left: 'auto',
            top: 'auto',
          }}
        >
          <div className="accounts-chatbot-header" onMouseDown={handleMouseDown}>
            <div className="accounts-chatbot-header-left">
              <Sparkles size={16} />
              <span>Accounts Assistant</span>
            </div>
            <div className="accounts-chatbot-header-actions">
              <button className="accounts-chatbot-header-btn" onClick={handleClearHistory} title="Clear chat" aria-label="Clear chat history">
                <MessageCircle size={13} />
              </button>
              <button className="accounts-chatbot-header-btn" onClick={toggleMinimize} title={isMinimized ? 'Expand' : 'Minimize'} aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}>
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button className="accounts-chatbot-header-btn" onClick={handleClose} title="Close" aria-label="Close chat">
                <X size={14} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="accounts-chatbot-messages">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`accounts-chatbot-message ${message.role}`}>
                    <div className="accounts-chatbot-avatar">
                      {message.role === 'assistant' ? <Sparkles size={14} /> : <User size={14} />}
                    </div>
                    <div className="accounts-chatbot-bubble">
                      {renderRichContent(message.content)}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="accounts-chatbot-message assistant">
                    <div className="accounts-chatbot-avatar">
                      <Sparkles size={14} />
                    </div>
                    <div className="accounts-chatbot-bubble loading">Thinking…</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="accounts-chatbot-input-row">
                <textarea
                  ref={inputRef}
                  className="accounts-chatbot-input"
                  rows={2}
                  placeholder="Ask about your accounting data..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button className="accounts-chatbot-send" onClick={sendMessage} disabled={isLoading}>
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

export default AccountsChatBot
