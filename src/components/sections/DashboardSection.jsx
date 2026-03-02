import { useMemo, useState, useEffect } from 'react'
import { useData } from '../../hooks/useData'
import { useNavigate } from 'react-router-dom'
import {
    FileText, Layers, CheckCircle, GraduationCap, BarChart3, Swords, Sparkles,
    Target, Edit3, Clock, Zap, TrendingUp, CalendarDays, BookOpen,
    Timer, Trophy, Headphones, ArrowRight, Flame, Star, Brain
} from 'lucide-react'
import Skeleton from '../ui/Skeleton'
import '../../styles/dashboard-pro.css'

const QUOTES = [
    "Il successo è la somma di piccoli sforzi ripetuti giorno dopo giorno.",
    "Non hai bisogno di vedere l'intera scalinata, inizia dal primo gradino.",
    "La motivazione ti fa iniziare. L'abitudine ti fa continuare.",
    "L'unico posto in cui il successo viene prima del sudore è nel dizionario.",
    "Studia non per superare l'esame, ma per superare te stesso.",
    "La disciplina è il ponte tra i tuoi obiettivi e la loro realizzazione.",
    "Ogni esperto è stato un principiante. Ogni professionista è stato un dilettante.",
    "Il momento migliore per iniziare era ieri. Il secondo miglior momento è adesso."
]

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 5000, 10000]
const LEVEL_TITLES = ['Novizio', 'Studente', 'Apprendista', 'Esperto', 'Maestro', 'Erudito', 'Saggio', 'Leggenda', 'Divinità']

function getGreeting() {
    const h = new Date().getHours()
    if (h < 6) return { text: 'Buona notte', emoji: '🌙' }
    if (h < 12) return { text: 'Buongiorno', emoji: '☀️' }
    if (h < 18) return { text: 'Buon pomeriggio', emoji: '🌤️' }
    return { text: 'Buonasera', emoji: '🌙' }
}

// Mini activity heatmap for last 30 days
function ActivityHeatmap({ tasks, notes, flashcards }) {
    const days = useMemo(() => {
        const result = []
        const now = new Date()
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]

            // Count activity
            let count = 0
                ; (tasks || []).forEach(t => {
                    if (t.completed && t.completedAt?.startsWith(dateStr)) count++
                })
                ; (notes || []).forEach(n => {
                    if (n.createdAt?.startsWith(dateStr)) count++
                })
                ; (flashcards || []).forEach(f => {
                    if (f.createdAt?.startsWith(dateStr)) count++
                })

            result.push({
                date: d,
                count,
                label: d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })
            })
        }
        return result
    }, [tasks, notes, flashcards])

    const maxCount = Math.max(1, ...days.map(d => d.count))

    return (
        <div className="heatmap-container">
            <div className="heatmap-grid">
                {days.map((day, i) => {
                    const intensity = day.count === 0 ? 0 : Math.min(4, Math.ceil((day.count / maxCount) * 4))
                    return (
                        <div
                            key={i}
                            className={`heatmap-cell level-${intensity}`}
                            title={`${day.label}: ${day.count} attività`}
                        />
                    )
                })}
            </div>
            <div className="heatmap-legend">
                <span>Meno</span>
                <div className="heatmap-cell level-0 mini" />
                <div className="heatmap-cell level-1 mini" />
                <div className="heatmap-cell level-2 mini" />
                <div className="heatmap-cell level-3 mini" />
                <div className="heatmap-cell level-4 mini" />
                <span>Più</span>
            </div>
        </div>
    )
}

// Quick Actions
function QuickActions() {
    const navigate = useNavigate()
    const actions = [
        { icon: Edit3, label: 'Nuova Nota', path: '/app/notes', color: '#4FACFE', bg: 'rgba(79, 172, 254, 0.1)' },
        { icon: Layers, label: 'Flashcard', path: '/app/notes', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.1)' },
        { icon: Timer, label: 'Pomodoro', path: '/app/pomodoro', color: '#FF6B6B', bg: 'rgba(255, 107, 107, 0.1)' },
        { icon: Swords, label: 'Duello AI', path: '/app/duel', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
        { icon: Headphones, label: 'Stanza Studio', path: '/app/study-rooms', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
        { icon: GraduationCap, label: 'Classroom', path: '/app/classroom', color: '#F97316', bg: 'rgba(249, 115, 22, 0.1)' },
    ]

    return (
        <div className="quick-actions-grid">
            {actions.map((a, i) => (
                <button key={i} className="quick-action-btn hover-lift" onClick={() => navigate(a.path)}
                    style={{ '--action-color': a.color, '--action-bg': a.bg }}>
                    <div className="quick-action-icon"><a.icon size={20} /></div>
                    <span>{a.label}</span>
                </button>
            ))}
        </div>
    )
}

export default function DashboardSection() {
    const { data, loading, getWeightedAverage, getCompletedTasksCount } = useData()
    const navigate = useNavigate()
    const [greeting, setGreeting] = useState(getGreeting())

    const average = getWeightedAverage()
    const completedTasks = getCompletedTasksCount()
    const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [])

    const xp = data.stats?.xp || 0
    const level = data.stats?.level || 1
    const nextLevelXP = LEVEL_THRESHOLDS[level] || 100000
    const prevLevelXP = LEVEL_THRESHOLDS[level - 1] || 0
    const progress = Math.min(100, Math.max(0, ((xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100))
    const levelTitle = LEVEL_TITLES[level - 1] || 'Leggenda'

    const upcomingTasks = useMemo(() => {
        return (data.tasks || [])
            .filter(t => !t.completed && t.dueDate)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 4)
    }, [data.tasks])

    const recentGrades = useMemo(() => {
        return (data.grades || [])
            .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
            .slice(0, 5)
    }, [data.grades])

    const totalNotes = (data.notes || []).length
    const totalFlashcards = (data.flashcards || []).length
    const streak = data.stats?.currentStreak || 0
    const totalPomodoros = data.stats?.pomodoros || 0

    const radius = 42
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (progress / 100) * circumference

    // Daily challenge progress
    const challenges = [
        { icon: Edit3, name: 'Scrivi 3 note', goal: 3, current: totalNotes, reward: 50, color: '#4FACFE' },
        { icon: Layers, name: 'Crea 5 flashcard', goal: 5, current: totalFlashcards, reward: 100, color: '#A78BFA' },
        { icon: Swords, name: 'Combatti un Duello', goal: 1, current: data.stats?.duelsPlayed || 0, reward: 150, color: '#FF6B6B' },
    ]

    return (
        <section className="dashboard-section animate-fade-in">
            <header className="dashboard-header">
                <div className="header-greeting">
                    <span className="greeting-emoji">{greeting.emoji}</span>
                    <div className="greeting-text">
                        <h1>{greeting.text}, Genny</h1>
                        <p>{quote}</p>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="dashboard-skeletons" style={{ padding: '0 1.5rem' }}>
                    <div className="card glass-card" style={{ height: '180px', marginBottom: '1.5rem', padding: '1.5rem' }}>
                        <Skeleton variant="title" style={{ width: '40%' }} />
                        <Skeleton variant="text" style={{ width: '90%', marginTop: '1rem' }} />
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <Skeleton variant="avatar" />
                            <Skeleton variant="avatar" />
                            <Skeleton variant="avatar" />
                        </div>
                    </div>
                    <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="card glass-card" style={{ height: '300px' }}>
                            <Skeleton variant="title" style={{ width: '50%', margin: '1.5rem' }} />
                            <Skeleton variant="card" style={{ margin: '0 1.5rem', height: '180px' }} />
                        </div>
                        <div className="card glass-card" style={{ height: '300px' }}>
                            <Skeleton variant="title" style={{ width: '50%', margin: '1.5rem' }} />
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0 1.5rem 1rem' }}>
                                    <Skeleton style={{ width: '20px', height: '20px' }} />
                                    <Skeleton variant="text" style={{ flex: 1, marginBottom: 0 }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="dashboard-main-grid">
                    {/* Top Row: XP + Quick Actions */}
                    <div className="dash-top-row stagger-item stagger-1">
                        <div className="dash-card dash-xp-card">
                            <div className="xp-ring-wrapper">
                                <svg width="100" height="100" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r={radius} fill="transparent"
                                        className="xp-ring-bg" strokeWidth="6" />
                                    <circle cx="50" cy="50" r={radius} fill="transparent"
                                        stroke="url(#xpGrad)" strokeWidth="6"
                                        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                                        className="xp-ring-progress" />
                                    <defs>
                                        <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#38F9D7" />
                                            <stop offset="100%" stopColor="#4FACFE" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="xp-ring-center">
                                    <span className="xp-level-num">{level}</span>
                                    <span className="xp-level-label">LVL</span>
                                </div>
                            </div>
                            <div className="xp-info">
                                <div className="xp-title-row">
                                    <h3>{levelTitle}</h3>
                                    <span className="xp-badge"><Trophy size={12} /> Lv.{level}</span>
                                </div>
                                <div className="xp-bar-wrapper">
                                    <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="xp-detail">
                                    <span>{xp} / {nextLevelXP} XP</span>
                                    <span className="xp-remaining">{nextLevelXP - xp} XP rimasti</span>
                                </div>
                            </div>
                        </div>

                        <div className="dash-card dash-quick-card">
                            <h3><Zap size={18} /> Azioni Rapide</h3>
                            <QuickActions />
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="dash-stats-row stagger-item stagger-2">
                        <div className="dash-stat-item">
                            <div className="dash-stat-icon" style={{ '--stat-color': '#4FACFE' }}><FileText size={20} /></div>
                            <div className="dash-stat-content">
                                <span className="dash-stat-value">{totalNotes}</span>
                                <span className="dash-stat-label">Note</span>
                            </div>
                        </div>
                        <div className="dash-stat-item">
                            <div className="dash-stat-icon" style={{ '--stat-color': '#A78BFA' }}><Layers size={20} /></div>
                            <div className="dash-stat-content">
                                <span className="dash-stat-value">{totalFlashcards}</span>
                                <span className="dash-stat-label">Flashcard</span>
                            </div>
                        </div>
                        <div className="dash-stat-item">
                            <div className="dash-stat-icon" style={{ '--stat-color': '#38F9D7' }}><CheckCircle size={20} /></div>
                            <div className="dash-stat-content">
                                <span className="dash-stat-value">{completedTasks}</span>
                                <span className="dash-stat-label">Completati</span>
                            </div>
                        </div>
                        <div className="dash-stat-item">
                            <div className="dash-stat-icon" style={{ '--stat-color': '#F59E0B' }}><GraduationCap size={20} /></div>
                            <div className="dash-stat-content">
                                <span className="dash-stat-value">{average || '—'}</span>
                                <span className="dash-stat-label">Media</span>
                            </div>
                        </div>
                        <div className="dash-stat-item">
                            <div className="dash-stat-icon" style={{ '--stat-color': '#FF6B6B' }}><Timer size={20} /></div>
                            <div className="dash-stat-content">
                                <span className="dash-stat-value">{totalPomodoros}</span>
                                <span className="dash-stat-label">Pomodori</span>
                            </div>
                        </div>
                        <div className="dash-stat-item">
                            <div className="dash-stat-icon" style={{ '--stat-color': '#F43F5E' }}><Flame size={20} /></div>
                            <div className="dash-stat-content">
                                <span className="dash-stat-value">{streak}</span>
                                <span className="dash-stat-label">Streak</span>
                            </div>
                        </div>
                    </div>

                    {/* Middle Row: Heatmap + Deadlines */}
                    <div className="dash-mid-row stagger-item stagger-3">
                        <div className="dash-card dash-heatmap-card">
                            <h3><CalendarDays size={18} /> Attività Ultimi 30 Giorni</h3>
                            <ActivityHeatmap tasks={data.tasks} notes={data.notes} flashcards={data.flashcards} />
                        </div>

                        <div className="dash-card dash-deadlines-card">
                            <div className="dash-card-header">
                                <h3><Clock size={18} /> Prossime Scadenze</h3>
                                <button className="dash-see-all" onClick={() => navigate('/app/tasks')}>
                                    Vedi tutto <ArrowRight size={14} />
                                </button>
                            </div>
                            <div className="deadlines-list">
                                {upcomingTasks.length === 0 ? (
                                    <div className="dash-empty-state">
                                        <CheckCircle size={28} />
                                        <span>Nessuna scadenza a breve! 🎉</span>
                                    </div>
                                ) : upcomingTasks.map(t => {
                                    const daysLeft = Math.ceil((new Date(t.dueDate) - new Date()) / 86400000)
                                    const urgency = daysLeft <= 1 ? 'urgent' : daysLeft <= 3 ? 'soon' : 'normal'
                                    return (
                                        <div key={t.id} className={`deadline-item ${urgency}`}>
                                            <div className="deadline-dot" />
                                            <div className="deadline-info">
                                                <span className="deadline-name">{t.description}</span>
                                                <span className="deadline-date">
                                                    {daysLeft <= 0 ? 'Scaduto!' : daysLeft === 1 ? 'Domani' : `Fra ${daysLeft} giorni`}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Grades Trend + Challenges */}
                    <div className="dash-bottom-row stagger-item stagger-4">
                        <div className="dash-card dash-grades-card">
                            <h3><BarChart3 size={18} /> Trend Voti</h3>
                            {recentGrades.length === 0 ? (
                                <div className="dash-empty-state">
                                    <TrendingUp size={28} />
                                    <span>Nessun voto inserito</span>
                                </div>
                            ) : (
                                <div className="grades-chart">
                                    {[...recentGrades].reverse().map((g, i) => {
                                        const val = parseFloat(g.value) || 0
                                        const pct = Math.min(100, (val / 10) * 100)
                                        return (
                                            <div key={i} className="grade-bar-wrapper">
                                                <span className="grade-bar-value">{val}</span>
                                                <div className="grade-bar-track">
                                                    <div className={`grade-bar-fill ${val >= 6 ? 'pass' : 'fail'}`}
                                                        style={{ height: `${pct}%` }} />
                                                </div>
                                                <span className="grade-bar-label">{g.subject?.substring(0, 3) || '—'}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="dash-card dash-challenges-card">
                            <h3><Target size={18} /> Sfide del Giorno</h3>
                            <div className="challenges-list">
                                {challenges.map((c, i) => {
                                    const done = c.current >= c.goal
                                    const pct = Math.min(100, (c.current / c.goal) * 100)
                                    return (
                                        <div key={i} className={`challenge-row ${done ? 'done' : ''}`}>
                                            <div className="challenge-icon" style={{ background: `${c.color}15`, color: c.color }}>
                                                <c.icon size={18} />
                                            </div>
                                            <div className="challenge-body">
                                                <div className="challenge-top">
                                                    <span className="challenge-name">{c.name}</span>
                                                    <span className="challenge-reward">+{c.reward} XP</span>
                                                </div>
                                                <div className="challenge-bar">
                                                    <div className="challenge-bar-fill" style={{ width: `${pct}%`, background: c.color }} />
                                                </div>
                                                <span className="challenge-progress">{Math.min(c.current, c.goal)}/{c.goal}</span>
                                            </div>
                                            {done && <CheckCircle size={18} className="challenge-check" />}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
