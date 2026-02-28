import { useState, useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { ChevronLeft, ChevronRight, CalendarDays, CheckSquare, Star, Timer, BookOpen } from 'lucide-react'

const MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export default function CalendarSection() {
    const { data } = useData()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDay, setSelectedDay] = useState(null)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
    const goToday = () => { setCurrentDate(new Date()); setSelectedDay(new Date().getDate()) }

    // Build calendar grid
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startPad = (firstDay.getDay() + 6) % 7 // Monday start
        const totalDays = lastDay.getDate()

        const days = []
        // Previous month padding
        const prevLastDay = new Date(year, month, 0).getDate()
        for (let i = startPad - 1; i >= 0; i--) {
            days.push({ day: prevLastDay - i, isCurrentMonth: false, date: null })
        }
        // Current month
        for (let d = 1; d <= totalDays; d++) {
            days.push({ day: d, isCurrentMonth: true, date: new Date(year, month, d) })
        }
        // Next month padding
        const remaining = 7 - (days.length % 7)
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                days.push({ day: i, isCurrentMonth: false, date: null })
            }
        }
        return days
    }, [year, month])

    // Build events map for this month
    const eventsMap = useMemo(() => {
        const map = {}
        const pad = (d) => { const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; return key }

            // Tasks with due dates
            ; (data.tasks || []).forEach(t => {
                if (!t.dueDate) return
                const d = new Date(t.dueDate)
                if (d.getFullYear() === year && d.getMonth() === month) {
                    const key = d.getDate()
                    if (!map[key]) map[key] = []
                    map[key].push({ type: 'task', label: t.description, completed: t.completed, color: t.completed ? '#38F9D7' : '#FF6B6B', icon: 'task' })
                }
            })

            // Grades
            ; (data.grades || []).forEach(g => {
                const dateStr = g.date || g.createdAt
                if (!dateStr) return
                const d = new Date(dateStr)
                if (d.getFullYear() === year && d.getMonth() === month) {
                    const key = d.getDate()
                    if (!map[key]) map[key] = []
                    map[key].push({ type: 'grade', label: `${g.subject || 'Voto'}: ${g.value}`, color: '#FEE140', icon: 'grade' })
                }
            })

            // Pomodoro sessions
            ; (data.pomodoroSessions || []).forEach(s => {
                const dateStr = s.date || s.createdAt
                if (!dateStr) return
                const d = new Date(dateStr)
                if (d.getFullYear() === year && d.getMonth() === month) {
                    const key = d.getDate()
                    if (!map[key]) map[key] = []
                    map[key].push({ type: 'pomodoro', label: `Pomodoro ${s.duration || 25}m`, color: '#4FACFE', icon: 'pomodoro' })
                }
            })

            // Notes
            ; (data.notes || []).forEach(n => {
                const dateStr = n.createdAt
                if (!dateStr) return
                const d = new Date(dateStr)
                if (d.getFullYear() === year && d.getMonth() === month) {
                    const key = d.getDate()
                    if (!map[key]) map[key] = []
                    map[key].push({ type: 'note', label: n.title || 'Nota', color: '#A78BFA', icon: 'note' })
                }
            })

        return map
    }, [data, year, month])

    const today = new Date()
    const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

    const selectedEvents = selectedDay ? (eventsMap[selectedDay] || []) : []

    const getIcon = (type) => {
        switch (type) {
            case 'task': return <CheckSquare size={14} />
            case 'grade': return <Star size={14} />
            case 'pomodoro': return <Timer size={14} />
            case 'note': return <BookOpen size={14} />
            default: return null
        }
    }

    return (
        <section className="section active reveal-entrance">
            <div className="hero">
                <h1><span className="gradient-text">Calendario</span> <CalendarDays size={32} className="inline-icon hero-icon-floating" /></h1>
                <p>La tua agenda di studio visuale</p>
            </div>

            {/* Calendar Navigation */}
            <div className="card glass-card hover-glow animated-border" style={{
                background: 'rgba(15, 15, 25, 0.6)',
                backdropFilter: 'blur(20px)',
                padding: '1.25rem',
                maxWidth: '700px',
                margin: '0 auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <button onClick={prevMonth} className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.6rem', cursor: 'pointer', color: 'white' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, background: 'linear-gradient(135deg, #38F9D7, #4FACFE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {MONTHS_IT[month]} {year}
                        </h2>
                        <button onClick={goToday} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: '0.85rem', cursor: 'pointer', marginTop: '0.25rem' }}>
                            Vai ad Oggi
                        </button>
                    </div>
                    <button onClick={nextMonth} className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.6rem', cursor: 'pointer', color: 'white' }}>
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                    {DAYS_IT.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0.5rem 0' }}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {calendarDays.map((cell, i) => {
                        const hasEvents = cell.isCurrentMonth && eventsMap[cell.day]
                        const eventCount = hasEvents ? eventsMap[cell.day].length : 0
                        const isSel = cell.isCurrentMonth && selectedDay === cell.day
                        const isTodayCell = cell.isCurrentMonth && isToday(cell.day)

                        return (
                            <div
                                key={i}
                                onClick={() => cell.isCurrentMonth && setSelectedDay(cell.day === selectedDay ? null : cell.day)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '10px',
                                    padding: '0.5rem 0',
                                    minHeight: '52px',
                                    cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                                    opacity: cell.isCurrentMonth ? 1 : 0.25,
                                    background: isSel
                                        ? 'linear-gradient(135deg, rgba(56,249,215,0.2), rgba(79,172,254,0.2))'
                                        : isTodayCell
                                            ? 'rgba(56, 249, 215, 0.1)'
                                            : 'rgba(255,255,255,0.02)',
                                    border: isTodayCell
                                        ? '2px solid rgba(56, 249, 215, 0.5)'
                                        : isSel
                                            ? '2px solid rgba(79,172,254,0.5)'
                                            : '1px solid rgba(255,255,255,0.03)',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}
                            >
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: isTodayCell ? 800 : 500,
                                    color: isTodayCell ? '#38F9D7' : 'var(--color-text)'
                                }}>
                                    {cell.day}
                                </span>
                                {/* Event dots */}
                                {eventCount > 0 && (
                                    <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
                                        {eventsMap[cell.day].slice(0, 3).map((ev, idx) => (
                                            <div key={idx} style={{
                                                width: 6, height: 6, borderRadius: '50%',
                                                background: ev.color,
                                                boxShadow: `0 0 6px ${ev.color}60`
                                            }} />
                                        ))}
                                        {eventCount > 3 && (
                                            <span style={{ fontSize: '0.6rem', color: 'var(--color-text-secondary)' }}>+{eventCount - 3}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Selected Day Events */}
            {selectedDay && (
                <div className="card glass-card hover-glow" style={{
                    marginTop: '1.5rem',
                    background: 'rgba(15, 15, 25, 0.6)',
                    backdropFilter: 'blur(20px)',
                    padding: '1.25rem',
                    maxWidth: '700px',
                    margin: '1.5rem auto 0',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CalendarDays size={18} className="text-accent" />
                        {selectedDay} {MONTHS_IT[month]} {year}
                    </h3>
                    {selectedEvents.length === 0 ? (
                        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '1rem' }}>
                            Nessun evento per questo giorno. Giornata tranquilla! 😌
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {selectedEvents.map((ev, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.75rem 1rem', borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderLeft: `3px solid ${ev.color}`,
                                    transition: 'all 0.2s ease'
                                }}>
                                    <span style={{ color: ev.color }}>{getIcon(ev.type)}</span>
                                    <span style={{
                                        flex: 1, fontSize: '0.95rem',
                                        textDecoration: ev.completed ? 'line-through' : 'none',
                                        opacity: ev.completed ? 0.6 : 1
                                    }}>
                                        {ev.label}
                                    </span>
                                    <span style={{
                                        fontSize: '0.75rem', padding: '0.2rem 0.6rem',
                                        borderRadius: '8px', background: `${ev.color}20`, color: ev.color,
                                        fontWeight: 600, textTransform: 'uppercase'
                                    }}>
                                        {ev.type === 'task' ? (ev.completed ? 'Fatto' : 'Da fare') :
                                            ev.type === 'grade' ? 'Voto' :
                                                ev.type === 'pomodoro' ? 'Focus' : 'Nota'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                {[
                    { color: '#FF6B6B', label: 'Compiti' },
                    { color: '#38F9D7', label: 'Completati' },
                    { color: '#FEE140', label: 'Voti' },
                    { color: '#4FACFE', label: 'Pomodoro' },
                    { color: '#A78BFA', label: 'Note' }
                ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, boxShadow: `0 0 8px ${item.color}50` }} />
                        {item.label}
                    </div>
                ))}
            </div>
        </section>
    )
}
