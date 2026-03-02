import { useState, useEffect } from 'react'
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useDailyBonus } from '../../hooks/useDailyBonus'
import ChatbotWidget from '../chatbot/ChatbotWidget'
import NotificationCenter from '../NotificationCenter'
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
import { LogOut, User, Settings, Menu, X } from 'lucide-react'

const PILL_LINKS = [
    { id: 'dashboard', label: 'Dashboard', path: '/app' },
    { id: 'grades', label: 'Voti', path: '/app/grades' },
    { id: 'tasks', label: 'Task', path: '/app/tasks' },
    { id: 'notes', label: 'Note', path: '/app/notes' },
    { id: 'knowledge', label: 'AI', path: '/app/knowledge' },
    { id: 'classroom', label: 'Class', path: '/app/classroom' },
    { id: 'pomodoro', label: 'Focus', path: '/app/pomodoro' },
    { id: 'duel', label: 'Arena', path: '/app/duel' },
]

export default function AppLayout() {
    const { user, signOut } = useAuth()
    const { data } = useData()
    const navigate = useNavigate()
    const location = useLocation()
    const [menuOpen, setMenuOpen] = useState(false)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    // Always force dark mode for the premium glassmorphism theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
        localStorage.setItem('theme', 'dark')
    }, [])

    // Initialize daily login bonus
    useDailyBonus()

    const handleSignOut = async () => {
        setMenuOpen(false)
        try {
            await signOut()
        } catch (err) {
            // silently handle
        } finally {
            navigate('/')
        }
    }

    const isActive = (path) => {
        if (path === '/app') return location.pathname === '/app'
        return location.pathname.startsWith(path)
    }

    return (
        <div className="app-layout" data-theme="dark">
            {/* Deep Cosmic Background & Orbs */}
            <div className="cosmic-bg">
                <div className="cosmic-orb orb-c1"></div>
                <div className="cosmic-orb orb-c2"></div>
                <div className="cosmic-orb orb-c3"></div>
            </div>

            {/* Top Navigation Pill (Dynamic Island) */}
            <header className="pill-nav-wrapper">
                <div className="pill-nav">
                    {/* Left: Logo */}
                    <Link to="/app" className="pill-logo">
                        <img src="/favicon.png" alt="StudyJournal Pro Logo" />
                        <span className="pill-logo-text">StudyJournal <strong>Pro</strong></span>
                    </Link>

                    {/* Center: Links (Hidden on small mobile) */}
                    <nav className={`pill-links ${mobileNavOpen ? 'mobile-open' : ''}`}>
                        {PILL_LINKS.map(link => (
                            <Link
                                key={link.id}
                                to={link.path}
                                className={`pill-link ${isActive(link.path) ? 'active' : ''}`}
                                onClick={() => setMobileNavOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Right: Actions */}
                    <div className="pill-actions">
                        {/* Mobile Hamburger toggle */}
                        <button className="mobile-toggle-btn" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
                            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        <div className="user-profile-wrapper">
                            <button
                                className="pill-account-btn"
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
                            >
                                <User size={18} />
                            </button>

                            {menuOpen && (
                                <div className="pill-dropdown show fade-in">
                                    <div className="dropdown-header">
                                        <span className="dropdown-email">{user?.email}</span>
                                        <span className="dropdown-level">Lvl. {data?.stats?.level || 1} • {data?.stats?.currentStreak || 0}🔥</span>
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    <Link to="/app/settings" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                                        <Settings size={14} /> Impostazioni
                                    </Link>
                                    <div className="dropdown-divider"></div>
                                    <button className="dropdown-item text-danger" onClick={handleSignOut}>
                                        <LogOut size={14} /> Esci
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Click outside to close dropdowns */}
            {menuOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 900 }} onClick={() => setMenuOpen(false)} />
            )}

            {/* Main content */}
            <main className="main-content-area">
                <div className="content page-transition" key={location.pathname}>
                    <Outlet />
                </div>
            </main>

            {/* AI Chatbot */}
            <ChatbotWidget />

            {/* In-app Notifications */}
            <NotificationCenter />
        </div>
    )
}
