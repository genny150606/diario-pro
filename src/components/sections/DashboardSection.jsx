import { useMemo, useState, useEffect } from 'react'
import { useData } from '../../hooks/useData'
import { useNavigate } from 'react-router-dom'
import {
    Clock, Flame, Play, Pause, SkipForward, SkipBack, MoreHorizontal
} from 'lucide-react'
import Skeleton from '../ui/Skeleton'
import '../../styles/dashboard-pro.css'

export default function DashboardSection() {
    const { data, loading } = useData()
    const navigate = useNavigate()

    const xp = data.stats?.xp || 0
    const level = data.stats?.level || 1
    const nextLevelXP = 5000 // Mock threshold based on the image
    const progress = Math.min(100, Math.max(0, (xp / nextLevelXP) * 100))

    const upcomingTasks = useMemo(() => {
        return (data.tasks || [])
            .filter(t => !t.completed && t.dueDate)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 3)
    }, [data.tasks])

    const recentNotes = useMemo(() => {
        return (data.notes || [])
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 3)
    }, [data.notes])

    const streak = data.stats?.currentStreak || 0
    const totalPomodoros = data.stats?.pomodoros || 0
    const studyHours = Math.floor((totalPomodoros * 25) / 60) || 0

    const radius = 30
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (progress / 100) * circumference

    // Mock Pomodoro State for Deep Work Card
    const [timeLeft, setTimeLeft] = useState(25 * 60)
    const [isRunning, setIsRunning] = useState(false)
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60

    if (loading) {
        return (
            <section className="dashboard-bento animate-fade-in" style={{ padding: '2rem' }}>
                <Skeleton variant="card" style={{ height: '120px', marginBottom: '1rem' }} />
                <Skeleton variant="card" style={{ height: '300px' }} />
            </section>
        )
    }

    return (
        <section className="dashboard-bento animate-fade-in">
            {/* ROW 1: Stats Grid */}
            <div className="bento-header">
                <h2 className="bento-title">Statistiche</h2>
            </div>

            <div className="bento-row grid-3">
                {/* 1. XP Progress */}
                <div className="bento-card bento-xp">
                    <div className="bento-xp-ring">
                        <svg width="80" height="80" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r={radius} fill="transparent" className="ring-bg" strokeWidth="6" />
                            <circle cx="40" cy="40" r={radius} fill="transparent"
                                stroke="url(#xpGrad)" strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                                className="ring-progress" />
                            <defs>
                                <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#6495FF" />
                                    <stop offset="100%" stopColor="#D946EF" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="ring-center">
                            <span className="ring-text">XP</span>
                        </div>
                    </div>
                    <div className="bento-xp-info">
                        <span className="card-label">Progresso XP</span>
                        <div className="card-value-row">
                            <span className="card-value">{xp}</span>
                            <span className="card-sub">/{nextLevelXP} XP</span>
                        </div>
                        <span className="card-bottom">Livello {level}</span>
                    </div>
                </div>

                {/* 2. Study Hours */}
                <div className="bento-card">
                    <div className="card-icon-wrapper" style={{ '--icon-color': '#818CF8' }}>
                        <Clock size={24} />
                    </div>
                    <div className="card-info">
                        <span className="card-label">Ore di Studio</span>
                        <div className="card-value-row">
                            <span className="card-value">{studyHours}</span>
                            <span className="card-sub">ore</span>
                        </div>
                        <span className="card-bottom">Questo mese</span>
                    </div>
                    <div className="card-glow" style={{ background: 'rgba(129, 140, 248, 0.15)' }}></div>
                </div>

                {/* 3. Daily Streak */}
                <div className="bento-card">
                    <div className="card-icon-wrapper" style={{ '--icon-color': '#F59E0B' }}>
                        <Flame size={24} />
                    </div>
                    <div className="card-info">
                        <span className="card-label">Serie di Giorni</span>
                        <div className="card-value-row">
                            <span className="card-value">{streak}</span>
                            <span className="card-sub">giorni</span>
                        </div>
                        <span className="card-bottom">Continua così!</span>
                    </div>
                    <div className="card-glow" style={{ background: 'rgba(245, 158, 11, 0.15)' }}></div>
                </div>
            </div>

            {/* ROW 2: Smart Cards */}
            <div className="bento-header" style={{ marginTop: '2rem' }}>
                <h2 className="bento-title">Schede Rapide</h2>
            </div>

            <div className="bento-row grid-smart">
                {/* 4. Deep Work (Pomodoro) */}
                <div className="bento-card card-deep-work">
                    <div className="deep-work-header">
                        <h3 className="card-section-title">Concentrazione</h3>
                    </div>
                    <div className="deep-work-body">
                        <div className="timer-inner-card">
                            <div className="timer-top-row">
                                <span className="timer-label">Pomodoro</span>
                                <MoreHorizontal size={18} className="icon-muted" />
                            </div>
                            <div className="timer-display">
                                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                            </div>
                            <button className="timer-start-btn" onClick={() => setIsRunning(!isRunning)}>
                                {isRunning ? 'Pausa' : 'Inizia Focus'}
                            </button>
                            <div className="timer-controls">
                                <button className="timer-ctrl-btn"><SkipBack size={14} /></button>
                                <button className="timer-ctrl-btn" onClick={() => setIsRunning(!isRunning)}>
                                    {isRunning ? <Pause size={14} /> : <Play size={14} />}
                                </button>
                                <button className="timer-ctrl-btn"><SkipForward size={14} /></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Recent Notes */}
                <div className="bento-card bento-list-card">
                    <div className="card-section-header">
                        <h3 className="card-section-title">Note Recenti</h3>
                        <button className="icon-btn-muted" onClick={() => navigate('/app/notes')}>
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                    <div className="bento-list">
                        {recentNotes.length === 0 ? (
                            <div className="empty-muted">Nessuna nota recente.</div>
                        ) : recentNotes.map(n => (
                            <div key={n.id} className="bento-list-item glow-item" onClick={() => navigate('/app/notes?id=' + n.id)}>
                                <h4 className="item-title">{n.title || 'Nota Senza Titolo'}</h4>
                                <p className="item-desc">
                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore...
                                </p>
                                <span className="item-meta">Ultima modifica recente</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 6. Upcoming Tasks */}
                <div className="bento-card bento-list-card card-tasks">
                    <div className="card-section-header">
                        <h3 className="card-section-title">Prossimi Task</h3>
                        <button className="icon-btn-muted" onClick={() => navigate('/app/tasks')}>
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                    <div className="bento-list">
                        {upcomingTasks.length === 0 ? (
                            <div className="empty-muted">Nessun task in scadenza.</div>
                        ) : upcomingTasks.map((t, idx) => {
                            const colors = ['#F43F5E', '#4ADE80', '#6495FF']
                            const dotColor = colors[idx % colors.length]
                            return (
                                <div key={t.id} className="bento-list-item outline-item" onClick={() => navigate('/app/tasks')}>
                                    <div className="task-title-row">
                                        <div className="task-dot" style={{ backgroundColor: dotColor }} />
                                        <h4 className="item-title task-title">{t.description}</h4>
                                    </div>
                                    <span className="item-meta task-meta">In Scadenza</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </section>
    )
}
