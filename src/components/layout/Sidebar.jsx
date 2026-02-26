import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'

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
            {mainSections.map(section => {
                const IconComponent = section.Icon
                return (
                    <NavLink
                        key={section.id}
                        to={section.path}
                        end={section.path === '/app'}
                        className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                        onClick={handleLinkClick}
                    >
                        {IconComponent && <IconComponent size={22} strokeWidth={2.5} />}
                        <span>{section.label}</span>
                        <div className="sidebar-active-dot" />
                    </NavLink>
                )
            })}

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {bottomSections.map(section => {
                    const IconComponent = section.Icon
                    return (
                        <NavLink
                            key={section.id}
                            to={section.path}
                            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                            onClick={handleLinkClick}
                            title={section.label}
                        >
                            {IconComponent && <IconComponent size={20} />}
                            <span>{section.label}</span>
                        </NavLink>
                    )
                })}
                <button
                    className="sidebar-item"
                    onClick={() => { handleLinkClick(); onExit() }}
                    title="Esci"
                    style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
                >
                    <LogOut size={20} />
                    <span>Esci</span>
                </button>
            </div>
        </nav>
    )
}
