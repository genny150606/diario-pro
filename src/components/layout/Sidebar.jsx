import { LogOut } from 'lucide-react'

export default function Sidebar({ sections, activeSection, isOpen, onSectionChange, onSignOut }) {
    const mainSections = sections.filter(s => !s.bottom)
    const bottomSections = sections.filter(s => s.bottom)

    return (
        <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
            {mainSections.map(section => {
                const IconComponent = section.Icon
                return (
                    <a
                        key={section.id}
                        href="#"
                        className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); onSectionChange(section.id) }}
                        title={section.label}
                    >
                        {IconComponent && <IconComponent size={20} />}
                        <span>{section.label}</span>
                    </a>
                )
            })}

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {bottomSections.map(section => {
                    const IconComponent = section.Icon
                    return (
                        <a
                            key={section.id}
                            href="#"
                            className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
                            onClick={(e) => { e.preventDefault(); onSectionChange(section.id) }}
                            title={section.label}
                        >
                            {IconComponent && <IconComponent size={20} />}
                            <span>{section.label}</span>
                        </a>
                    )
                })}
                <a href="#" className="sidebar-item" onClick={(e) => { e.preventDefault(); onSignOut() }} title="Esci">
                    <LogOut size={20} />
                    <span>Esci</span>
                </a>
            </div>
        </nav>
    )
}
