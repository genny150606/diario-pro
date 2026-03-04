import { useState, useEffect } from 'react'
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useDailyBonus } from '../../hooks/useDailyBonus'
import ChatbotWidget from '../chatbot/ChatbotWidget'
import NotificationCenter from '../NotificationCenter'
import Sidebar from './Sidebar'
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
import { LogOut, User, Settings, Menu, X, Home, CheckSquare, BookOpen, Users, Brain, Swords, Timer, GraduationCap, BarChart2, Calendar, Trophy, Globe, LayoutGrid } from 'lucide-react'

const APP_SECTIONS = [
    { id: 'dashboard', label: 'Home', path: '/app', Icon: Home },
    { id: 'tasks', label: 'Task', path: '/app/tasks', Icon: CheckSquare },
    { id: 'notes', label: 'Note', path: '/app/notes', Icon: BookOpen },
    { id: 'classroom', label: 'Classi', path: '/app/classroom', Icon: Users },
    { id: 'knowledge', label: 'AI', path: '/app/knowledge', Icon: Brain },
    { id: 'duel', label: 'Arena', path: '/app/duel', Icon: Swords },
    { id: 'pomodoro', label: 'Focus', path: '/app/pomodoro', Icon: Timer },
    { id: 'grades', label: 'Voti', path: '/app/grades', Icon: GraduationCap },
    { id: 'stats', label: 'Statistiche', path: '/app/stats', Icon: BarChart2 },
    { id: 'calendar', label: 'Calendario', path: '/app/calendar', Icon: Calendar },
    { id: 'gamification', label: 'Livelli', path: '/app/gamification', Icon: Trophy },
    { id: 'social', label: 'Social', path: '/app/social', Icon: Globe },
    { id: 'study-rooms', label: 'Rooms', path: '/app/study-rooms', Icon: LayoutGrid, bottom: true },
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
            {/* Mobile Header (Only visible on small screens) */}
            <div className="mobile-header">
                <Link to="/app" className="pill-logo">
                    <img src="/favicon.png" alt="StudyJournal Pro Logo" />
                    <span className="pill-logo-text">StudyJournal <strong>Pro</strong></span>
                </Link>
                <button className="mobile-toggle-btn" onClick={() => setMobileNavOpen(true)}>
                    <Menu size={24} color="#00f3ff" />
                </button>
            </div>

            {/* Main Sidebar */}
            <Sidebar
                sections={APP_SECTIONS}
                isOpen={mobileNavOpen}
                setSidebarOpen={setMobileNavOpen}
                onExit={handleSignOut}
            />

            {/* Click outside to close mobile sidebar */}
            {mobileNavOpen && (
                <div className="mobile-sidebar-overlay" onClick={() => setMobileNavOpen(false)} />
            )}

            {/* Main content */}
            <main className="main-content-area">
                <AnimatePresence mode="wait">
                    <motion.div
                        className="content"
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* AI Chatbot */}
            <ChatbotWidget />

            {/* In-app Notifications */}
            <NotificationCenter />
        </div>
    )
}
