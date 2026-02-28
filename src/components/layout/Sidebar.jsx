import { NavLink } from 'react-router-dom'
import { LogOut, X, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function Sidebar({ sections, isOpen, setSidebarOpen, onExit }) {
    const { user, profile } = useAuth()
    const mainSections = sections.filter(s => !s.bottom)
    const bottomSections = sections.filter(s => s.bottom)

    const handleLinkClick = () => {
        if (window.innerWidth < 768) {
            setSidebarOpen(false)
        }
    }

    const userName = profile?.username || user?.email?.split('@')[0] || 'Utente'
    const initials = userName.substring(0, 2).toUpperCase()
    // Determiniamo se è premium (placeholder logico o vero)
    const isPremium = profile?.isPremium !== false

    return (
        <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
            {/* Mobile Close Button */}
            {isOpen && (
                <button
                    className="mobile-close-btn"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Chiudi menu"
                >
                    <X size={24} />
                </button>
            )}

            {/* Main Navigation Items */}
            <div className="sidebar-group">
                {mainSections.map((section, idx) => {
                    const IconComponent = section.Icon
                    return (
                        <NavLink
                            key={section.id}
                            to={section.path}
                            end={section.path === '/app'}
                            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                            onClick={handleLinkClick}
                            style={{ '--item-index': idx }}
                        >
                            {IconComponent && <IconComponent size={22} strokeWidth={2.5} />}
                            <span className="sidebar-label">{section.label}</span>
                            <div className="sidebar-glow-bg" />
                        </NavLink>
                    )
                })}
            </div>

            <div className="sidebar-bottom-group">
                {/* Bottom Group Items */}
                {bottomSections.map((section, idx) => {
                    const IconComponent = section.Icon
                    return (
                        <NavLink
                            key={section.id}
                            to={section.path}
                            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                            onClick={handleLinkClick}
                            style={{ '--item-index': mainSections.length + idx }}
                        >
                            {IconComponent && <IconComponent size={20} />}
                            <span className="sidebar-label">{section.label}</span>
                            <div className="sidebar-glow-bg" />
                        </NavLink>
                    )
                })}

                {/* Ultra-Premium User Profile Widget */}
                <div className="sidebar-profile-widget" style={{ '--item-index': mainSections.length + bottomSections.length }}>
                    <div className="profile-avatar">
                        {initials}
                    </div>

                    <div className="profile-info">
                        <div className="profile-name">{userName}</div>
                        <div className="profile-badge">{isPremium ? 'PRO' : 'Free'}</div>
                    </div>

                    <button
                        className="profile-logout-btn"
                        onClick={() => { handleLinkClick(); onExit() }}
                        title="Esci"
                        aria-label="Esci dall'account"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </nav>
    )
}
