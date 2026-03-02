import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState([])

    useEffect(() => {
        const handler = (e) => {
            const notif = { id: Date.now(), ...e.detail }
            setNotifications(prev => [notif, ...prev].slice(0, 5))

            // Auto-remove after 5s
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notif.id))
            }, 5000)
        }

        window.addEventListener('showNotification', handler)
        return () => window.removeEventListener('showNotification', handler)
    }, [])

    if (notifications.length === 0) return null

    return (
        <div style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            pointerEvents: 'none',
            maxWidth: 360,
            width: '100%'
        }}>
            {notifications.map((notif, idx) => (
                <div
                    key={notif.id}
                    style={{
                        background: 'rgba(20, 20, 24, 0.92)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: `1px solid ${notif.type === 'success' ? 'rgba(48,209,88,0.3)' : notif.type === 'warning' ? 'rgba(255,159,10,0.3)' : 'rgba(100,150,255,0.3)'}`,
                        borderRadius: 14,
                        padding: '1rem 1.2rem',
                        pointerEvents: 'auto',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                        animation: 'notifSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                >
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, color: '#fff' }}>
                            {notif.title}
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                            {notif.message}
                        </div>
                    </div>
                    <button
                        onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255,255,255,0.3)',
                            cursor: 'pointer',
                            padding: 0,
                            flexShrink: 0,
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    )
}
