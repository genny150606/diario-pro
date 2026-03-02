import { useState } from 'react'
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
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
    Menu, Sun, Moon, ChevronDown, LogOut, User, CalendarDays, Database, Headphones, GraduationCap
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
    { id: 'calendar', label: 'Calendario', Icon: CalendarDays, path: '/app/calendar' },
    { id: 'knowledge', label: 'Knowledge Hub', Icon: Database, path: '/app/knowledge' },
    { id: 'study-rooms', label: 'Stanze Studio', Icon: Headphones, path: '/app/study-rooms' },
    { id: 'classroom', label: 'Classroom', Icon: GraduationCap, path: '/app/classroom' },
    { id: 'settings', label: 'Impostazioni', Icon: Settings, path: '/app/settings', bottom: true },
]

export default function AppLayout() {
    const { user, signOut } = useAuth()
    const { data } = useData()
    const navigate = useNavigate()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem('theme') || 'dark'
        document.documentElement.setAttribute('data-theme', stored)
        return stored
    })

    const handleSignOut = async () => {
        console.log('[LAYOUT] handleSignOut triggered')
        // Close menus immediately for better UX
        setMenuOpen(false)
        setSidebarOpen(false)

        try {
            console.log('[LAYOUT] Calling signOut()...')
            await signOut()
            console.log('[LAYOUT] signOut() complete')
        } catch (err) {
            console.error('[LAYOUT] Sign out error:', err)
        } finally {
            console.log('[LAYOUT] Navigating to /')
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
                <div className="orb orb-4"></div>
            </div>

            {/* Header */}
            <header className="app-header">
                <div className="header-left-group">
                    <button
                        className="menu-toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label="Toggle menu"
                    >
                        <Menu size={20} />
                    </button>

                    <Link to="/" className="home-link-svg" title="Torna alla Home" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text)', opacity: 0.7, transition: 'opacity 0.2s' }}>
                        <Home size={20} />
                    </Link>
                </div>

                <Link to="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                    <img src="/S.png" alt="StudyJournal Pro Logo" style={{ height: '36px', width: 'auto', filter: 'drop-shadow(0 0 8px rgba(100, 150, 255, 0.4))' }} />
                    <span className="logo-text" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text)' }}>StudyJournal</span>
                </Link>

                <div className="header-right-group">
                    <div className="header-right-actions">
                        <div className={`streak-badge ${data?.stats?.currentStreak > 0 ? 'active' : ''}`}
                            title="Giorni consecutivi di studio"
                            style={{
                                boxShadow: data?.stats?.currentStreak > 0 ? '0 0 15px rgba(56, 249, 215, 0.3)' : 'none',
                                background: data?.stats?.currentStreak > 0 ? 'rgba(56, 249, 215, 0.1)' : 'var(--color-bg-secondary)',
                                border: data?.stats?.currentStreak > 0 ? '1px solid rgba(56, 249, 215, 0.3)' : '1px solid var(--color-border)'
                            }}>
                            <Star size={14} className="streak-icon" style={{ color: data?.stats?.currentStreak > 0 ? '#38F9D7' : 'inherit' }} />
                            <span className="streak-count" style={{ color: data?.stats?.currentStreak > 0 ? '#38F9D7' : 'inherit' }}>{data?.stats?.currentStreak || 0}</span>
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
                                    <div style={{ height: 1, background: 'var(--color-border)', margin: '0.5rem 0' }}></div>
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
                onClose={() => setSidebarOpen(false)}
                onExit={handleSignOut}
                logoSrc="/S.png"
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
                <div className="content page-transition" key={location.pathname}>
                    <Outlet />
                </div>
            </div>

            {/* AI Chatbot */}
            <ChatbotWidget />
        </div>
    )
}
