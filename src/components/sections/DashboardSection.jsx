import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { FileText, Layers, CheckCircle, GraduationCap, BarChart3, Swords, Sparkles, Target, Edit3, Clock, AlertCircle } from 'lucide-react'

const QUOTES = [
    "Il successo è la somma di piccoli sforzi ripetuti giorno dopo giorno.",
    "Non hai bisogno di vedere l'intera scalinata, inizia dal primo gradino.",
    "La motivazione ti fa iniziare. L'abitudine ti fa continuare.",
    "L'unico posto in cui il successo viene prima del sudore è nel dizionario.",
    "Studia non per superare l'esame, ma per superare te stesso."
]

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 5000, 10000]

export default function DashboardSection() {
    const { data, getWeightedAverage, getCompletedTasksCount } = useData()

    const average = getWeightedAverage()
    const completedTasks = getCompletedTasksCount()
    const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [])

    const xp = data.stats?.xp || 0
    const level = data.stats?.level || 1
    const nextLevelXP = LEVEL_THRESHOLDS[level] || 100000
    const prevLevelXP = LEVEL_THRESHOLDS[level - 1] || 0
    const progress = Math.min(100, Math.max(0, ((xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100))

    const upcomingTasks = useMemo(() => {
        return (data.tasks || [])
            .filter(t => !t.completed && t.dueDate)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 3)
    }, [data.tasks])

    const recentGrades = useMemo(() => {
        return (data.grades || [])
            .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
            .slice(0, 5)
    }, [data.grades])

    const radius = 36
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (progress / 100) * circumference

    return (
        <section className="section active reveal-entrance" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="hero" style={{ marginBottom: 0 }}>
                <h1><span className="gradient-text">Benvenuto!</span> <Sparkles size={32} className="inline-icon hero-sparkle" /></h1>
                <p style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', marginTop: '0.5rem', opacity: 0.9 }}>
                    &ldquo;{quote}&rdquo;
                </p>
            </div>

            {/* Top Widgets Row: XP Ring + Next Deadlines */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* XP Progress Ring */}
                <div className="card glass-card hover-glow" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                    <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="45" cy="45" r="36" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                            <circle cx="45" cy="45" r="36" fill="transparent" stroke="url(#xpGradient)" strokeWidth="6"
                                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)', strokeLinecap: 'round' }} />
                            <defs>
                                <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#38F9D7" />
                                    <stop offset="100%" stopColor="#4FACFE" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{level}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>LVL</span>
                        </div>
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Livello {level}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                            {xp} / {nextLevelXP} XP
                        </p>
                        <div style={{ fontSize: '0.75rem', color: '#38F9D7', background: 'rgba(56, 249, 215, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px', display: 'inline-block' }}>
                            {nextLevelXP - xp} XP al prossimo
                        </div>
                    </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="card glass-card hover-glow" style={{ padding: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
                        <Clock size={18} className="text-accent" /> Prossime Scadenze
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {upcomingTasks.length === 0 ? (
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                Nessuna scadenza a breve!
                            </p>
                        ) : upcomingTasks.map(t => (
                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.8rem', borderRadius: '8px', borderLeft: '3px solid #FF6B6B' }}>
                                <span style={{ fontSize: '0.9rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '65%' }}>{t.description}</span>
                                <span style={{ fontSize: '0.75rem', color: '#FF6B6B', background: 'rgba(255, 107, 107, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                                    {new Date(t.dueDate).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card hover-glow animated-border">
                    <div className="stat-header">
                        <FileText size={20} className="stat-icon-svg" />
                        <div className="stat-label">Note</div>
                    </div>
                    <div className="stat-value">{(data.notes || []).length}</div>
                    <div className="stat-change">appunti salvati</div>
                </div>

                <div className="stat-card hover-glow animated-border">
                    <div className="stat-header">
                        <Layers size={20} className="stat-icon-svg" />
                        <div className="stat-label">Flashcard</div>
                    </div>
                    <div className="stat-value">{(data.flashcards || []).length}</div>
                    <div className="stat-change">flashcard create</div>
                </div>

                <div className="stat-card hover-glow animated-border">
                    <div className="stat-header">
                        <CheckCircle size={20} className="stat-icon-svg text-accent" />
                        <div className="stat-label">Compiti</div>
                    </div>
                    <div className="stat-value">{completedTasks}</div>
                    <div className="stat-change text-accent">completati</div>
                </div>

                <div className="stat-card hover-glow animated-border">
                    <div className="stat-header">
                        <GraduationCap size={20} className="stat-icon-svg" />
                        <div className="stat-label">Media</div>
                    </div>
                    <div className="stat-value">{average || '-'}</div>
                    <div className="stat-change">media ponderata</div>
                </div>

                <div className="stat-card hover-glow animated-border" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
                    <div className="stat-header" style={{ marginBottom: '1rem' }}>
                        <BarChart3 size={20} className="stat-icon-svg" />
                        <div className="stat-label">Trend Ultimi Voti</div>
                    </div>
                    {recentGrades.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Nessun voto inserito</div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flex: 1, gap: '8px', padding: '0 1rem' }}>
                            {recentGrades.reverse().map((g, i) => {
                                const numVal = parseFloat(g.value) || 0;
                                const percentage = Math.min(100, (numVal / 10) * 100);
                                return (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{numVal}</span>
                                        <div style={{
                                            width: '100%', maxWidth: '20px', height: '60px',
                                            background: 'rgba(255,255,255,0.05)', borderRadius: '4px',
                                            position: 'relative', overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                                height: `${percentage}%`,
                                                background: numVal >= 6 ? 'linear-gradient(to top, #38F9D7, #4FACFE)' : '#FF6B6B',
                                                borderRadius: '4px', transition: 'height 1s cubic-bezier(0.16, 1, 0.3, 1)'
                                            }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Daily Challenges */}
            <div className="daily-challenges-widget reveal-up glass-card" style={{ animationDelay: '0.2s', padding: '1.5rem', background: 'rgba(15, 15, 25, 0.5)' }}>
                <div className="challenge-header" style={{ marginBottom: '1rem' }}>
                    <div className="header-text">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={20} className="text-secondary" /> Sfide del Giorno</h3>
                        <p className="challenge-subtitle" style={{ color: 'var(--color-text-secondary)' }}>Guadagna XP extra completando le missioni</p>
                    </div>
                </div>
                <div className="challenge-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <div className={`challenge-item ${(data.notes || []).length >= 3 ? 'completed' : ''}`} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className="challenge-icon-box" style={{ background: 'rgba(79, 172, 254, 0.1)', color: '#4FACFE', padding: '0.5rem', borderRadius: '8px' }}><Edit3 size={18} /></div>
                            <div className="challenge-info" style={{ flex: 1 }}>
                                <div className="challenge-name" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Scrivi 3 note</div>
                                <div className="challenge-reward" style={{ fontSize: '0.8rem', color: '#38F9D7' }}>+50 XP</div>
                            </div>
                            {(data.notes || []).length >= 3 && <div className="challenge-check-badge" style={{ color: '#38F9D7' }}><CheckCircle size={18} /></div>}
                        </div>
                    </div>
                    <div className={`challenge-item ${(data.flashcards || []).length >= 5 ? 'completed' : ''}`} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className="challenge-icon-box" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA', padding: '0.5rem', borderRadius: '8px' }}><Layers size={18} /></div>
                            <div className="challenge-info" style={{ flex: 1 }}>
                                <div className="challenge-name" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Crea 5 flashcard</div>
                                <div className="challenge-reward" style={{ fontSize: '0.8rem', color: '#38F9D7' }}>+100 XP</div>
                            </div>
                            {(data.flashcards || []).length >= 5 && <div className="challenge-check-badge" style={{ color: '#38F9D7' }}><CheckCircle size={18} /></div>}
                        </div>
                    </div>
                    <div className="challenge-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className="challenge-icon-box" style={{ background: 'rgba(255, 107, 107, 0.1)', color: '#FF6B6B', padding: '0.5rem', borderRadius: '8px' }}><Swords size={18} /></div>
                            <div className="challenge-info" style={{ flex: 1 }}>
                                <div className="challenge-name" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Combatti un Duello</div>
                                <div className="challenge-reward" style={{ fontSize: '0.8rem', color: '#38F9D7' }}>+150 XP</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
