import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Sidebar from './Sidebar'
import ChatbotWidget from '../chatbot/ChatbotWidget'
import './AppLayout.css'

// Import all app styles
import '../../styles/theme.css'
import '../../styles/global.css'
import '../../styles/layout.css'
import '../../styles/style.css'
import '../../styles/features.css'
import '../../styles/animations.css'
import '../../styles/animations-ui.css'
import '../../styles/responsive.css'
import '../../styles/gamification.css'

// Lucide SVG Icons
import {
    Home, BookOpen, CheckSquare, Star, Timer,
    BarChart2, Swords, Users, Trophy, Settings,
    Menu, Sun, Moon, ChevronDown, LogOut, User
} from 'lucide-react'

const SECTIONS = [
    { id: 'dashboard', label: 'Dashboard', Icon: Home },
    { id: 'notes', label: 'Note', Icon: BookOpen },
    { id: 'tasks', label: 'Compiti', Icon: CheckSquare },
    { id: 'grades', label: 'Voti', Icon: Star },
    { id: 'pomodoro', label: 'Pomodoro', Icon: Timer },
    { id: 'stats', label: 'Statistiche', Icon: BarChart2 },
    { id: 'duel', label: 'Duello AI', Icon: Swords },
    { id: 'social', label: 'Social', Icon: Users },
    { id: 'gamification', label: 'Livello', Icon: Trophy },
    { id: 'settings', label: 'Impostazioni', Icon: Settings, bottom: true },
]

export default function AppLayout({ children, activeSection, onSectionChange }) {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'dark'
    })

    const handleSectionChange = useCallback((sectionId) => {
        onSectionChange(sectionId)
        setSidebarOpen(false)
    }, [onSectionChange])

    const handleSignOut = async () => {
        try {
            await signOut()
            navigate('/')
        } catch (err) {
            console.error('Sign out error:', err)
        }
    }

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
        localStorage.setItem('theme', newTheme)
    }

    const displayEmail = user?.email
        ? (user.email.length > 20 ? user.email.substring(0, 17) + '...' : user.email)
        : ''

    return (
        <div className="app-layout" data-theme={theme}>
            {/* Aurora background */}
            <div className="aurora-bg" aria-hidden="true">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            {/* Header */}
            <header className="app-header">
                <button
                    className="menu-toggle"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="Toggle menu"
                >
                    <Menu size={20} />
                </button>

                <a href="#" className="logo" onClick={(e) => { e.preventDefault(); handleSectionChange('dashboard') }}>
                    <img src="/favicon.png" alt="Logo" className="logo-img" />
                    <span>StudyJournal</span>
                </a>

                <div className="header-right-actions">
                    <div className="streak-badge active" title="Serie di studio">
                        <Star size={14} className="streak-icon" />
                        <span className="streak-count">1</span>
                    </div>
                </div>

                <div className="header-right">
                    <button className="theme-toggle" onClick={toggleTheme} title="Cambia Tema">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <div className="user-profile-wrapper">
                        <button
                            className="account-btn"
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
                        >
                            <User size={16} className="account-icon-mobile" />
                            <span className="account-email-text">{displayEmail}</span>
                            <ChevronDown size={14} className="chevron-icon" style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                        </button>

                        {menuOpen && (
                            <div className="account-dropdown show">
                                <a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleSectionChange('settings'); setMenuOpen(false) }}>
                                    <Settings size={14} /> Impostazioni
                                </a>
                                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }}></div>
                                <a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleSignOut() }} style={{ color: '#FF453A' }}>
                                    <LogOut size={14} /> Esci
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Sidebar */}
            <Sidebar
                sections={SECTIONS}
                activeSection={activeSection}
                isOpen={sidebarOpen}
                onSectionChange={handleSectionChange}
                onSignOut={handleSignOut}
            />

            {/* Click outside to close sidebar on mobile */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Click outside to close menu */}
            {menuOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setMenuOpen(false)}
                />
            )}

            {/* Main content */}
            <div className="container">
                <div className="content">
                    {children}
                </div>
            </div>

            {/* AI Chatbot */}
            <ChatbotWidget />
        </div>
    )
}
