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
            {isOpen && window.innerWidth < 768 && (
                <button
                    className="mobile-close-btn"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'absolute',
                        top: '2rem',
                        right: '2rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        align- items: center,
            justify-content: center,
            color: 'white',
            cursor: 'pointer'
                    }}
                >
            <X size={24} />
        </button>
    )
}
{
    mainSections.map(section => {
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
    })
}

<span>Esci</span>
                </button >
            </div >
        </nav >
    )
}
