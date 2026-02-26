import { useState } from 'react'
import { useNavigate, Link, Outlet } from 'react-router-dom'
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
    { id: 'dashboard', label: 'Dashboard', Icon: Home, path: '/app' },
    { id: 'notes', label: 'Note', Icon: BookOpen, path: '/app/notes' },
    { id: 'tasks', label: 'Compiti', Icon: CheckSquare, path: '/app/tasks' },
    { id: 'grades', label: 'Voti', Icon: Star, path: '/app/grades' },
    { id: 'pomodoro', label: 'Pomodoro', Icon: Timer, path: '/app/pomodoro' },
    { id: 'stats', label: 'Statistiche', Icon: BarChart2, path: '/app/stats' },
    { id: 'duel', label: 'Duello AI', Icon: Swords, path: '/app/duel' },
    { id: 'social', label: 'Social', Icon: Users, path: '/app/social' },
    { id: 'gamification', label: 'Livello', Icon: Trophy, path: '/app/gamification' },
    { id: 'settings', label: 'Impostazioni', Icon: Settings, path: '/app/settings', bottom: true },
]

export default function AppLayout() {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem('theme') || 'dark'
        document.documentElement.setAttribute('data-theme', stored)
        return stored
    })

    const handleSignOut = async () => {
        // Close menus immediately for better UX
        setMenuOpen(false)
        setSidebarOpen(false)

        try {
            await signOut()
        } catch (err) {
            console.error('Sign out error:', err)
        } finally {
            // Always redirect to landing page
            navigate('/')
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

                <Link to="/app" className="logo">
                    <img src="/favicon.png" alt="Logo" className="logo-img" />
                    <span>StudyJournal</span>
                </Link>

                <div className="header-right-group">
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
                                    <Link to="/app/settings" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                                        <Settings size={14} /> Impostazioni
                                    </Link>
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }}></div>
                                    <button className="dropdown-item" onClick={handleSignOut} style={{ color: '#FF453A', border: 'none', background: 'none', width: '100%', cursor: 'pointer' }}>
                                        <LogOut size={14} /> Esci
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Sidebar */}
            <Sidebar
                sections={SECTIONS}
                isOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                onExit={handleSignOut}
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
                    <Outlet />
                </div>
            </div>

            {/* AI Chatbot */}
            <ChatbotWidget />
        </div>
    )
}
