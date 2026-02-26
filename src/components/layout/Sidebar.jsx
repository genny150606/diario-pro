import { NavLink } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'

export default function Sidebar({ sections, isOpen, setSidebarOpen, onExit }) {
    const mainSections = sections.filter(s => !s.bottom)
    const bottomSections = sections.filter(s => s.bottom)

    const handleLinkClick = () => {
        if (window.innerWidth < 768) {
            setSidebarOpen(false)
        }
    }

    return (
        <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
            {/* Mobile Close Button - Only visible when expanded on mobile */}
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
                        <span>{section.label}</span>
                        <div className="sidebar-active-dot" />
                    </NavLink>
                )
            })}

            {/* Bottom Group items rendered directly to avoid display:contents breaking expansion */}
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
                        <span>{section.label}</span>
                    </NavLink>
                )
            })}

            {/* Exit Button */}
            <button
                className="sidebar-item exit-btn"
                onClick={() => { handleLinkClick(); onExit() }}
                style={{
                    '--item-index': mainSections.length + bottomSections.length,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                }}
            >
                <LogOut size={20} />
                <span>Esci</span>
            </button>
        </nav>
    )
}
