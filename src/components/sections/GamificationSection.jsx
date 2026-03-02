import { useState, useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { Trophy, Edit3, Zap, CheckCircle, Clock, Calendar, Sparkles, Flame } from 'lucide-react'
import { ACHIEVEMENTS, ACHIEVEMENT_RARITIES } from '../../data/achievements'

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 5000, 10000]
const LEVEL_NAMES = ['Principiante', 'Studioso', 'Impegnato', 'Dedito', 'Maestro', 'Saggio', 'Erudito', 'Genio', 'Leggenda']

export default function GamificationSection() {
    const { data } = useData()
    const [filterRarity, setFilterRarity] = useState('all')

    const xp = data.stats?.xp || 0
    const level = data.stats?.level || 1
    const nextLevelXP = LEVEL_THRESHOLDS[level] || 100000
    const prevLevelXP = LEVEL_THRESHOLDS[level - 1] || 0
    const progress = Math.min(100, Math.max(0, ((xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100))
    const levelName = LEVEL_NAMES[level - 1] || 'Studente'

    // Compute per-achievement progress
    const achievementData = useMemo(() => {
        return ACHIEVEMENTS.map(ach => {
            const current = ach.getCurrent(data)
            const percent = Math.min(100, (current / ach.target) * 100)
            const unlocked = current >= ach.target
            return { ...ach, current, percent, unlocked }
        })
    }, [data])

    const filtered = useMemo(() => {
        let list = [...achievementData]
        if (filterRarity !== 'all') list = list.filter(a => a.rarity === filterRarity)
        list.sort((a, b) => {
            if (a.unlocked !== b.unlocked) return b.unlocked - a.unlocked
            return b.percent - a.percent
        })
        return list
    }, [achievementData, filterRarity])

    const totalUnlocked = achievementData.filter(a => a.unlocked).length
    const totalPoints = achievementData.filter(a => a.unlocked).reduce((s, a) => s + a.points, 0)

    return (
        <section className="section active reveal-entrance">
            {/* Level Hero */}
            <div className="card glass-card hover-glow animated-border gamification-hero-mini" style={{ padding: '2rem' }}>
                <div className="hero-header-mini">
                    <div className="hero-level-circle-mini">
                        <span className="hero-level-number-mini">{level}</span>
                    </div>
                    <div className="hero-info-mini">
                        <h2>{levelName}</h2>
                        <p>Livello {level}</p>
                    </div>
                </div>
                <div className="hero-xp-bar-mini">
                    <div className="hero-xp-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="hero-xp-text-mini">{xp} / {nextLevelXP} XP</div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid-gamification" style={{ marginTop: '1.5rem' }}>
                <div className="stat-card-game glass-card hover-glow">
                    <div className="stat-game-value">{xp}</div>
                    <div className="stat-game-label">XP Totali</div>
                </div>
                <div className="stat-card-game glass-card hover-glow">
                    <div className="stat-game-value">{data.stats?.currentStreak || 0} <Flame size={20} className="inline-icon" /></div>
                    <div className="stat-game-label">Giorni di fila</div>
                </div>
                <div className="stat-card-game glass-card hover-glow">
                    <div className="stat-game-value">{totalUnlocked}/{ACHIEVEMENTS.length}</div>
                    <div className="stat-game-label">Achievements</div>
                </div>
                <div className="stat-card-game glass-card hover-glow">
                    <div className="stat-game-value">{totalPoints}</div>
                    <div className="stat-game-label">Punti Badge</div>
                </div>
            </div>

            {/* Achievements Section */}
            <h3 style={{ margin: '2rem 0 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={20} /> Obiettivi & Badge
            </h3>

            {/* Achievement Progress Bar */}
            <div className="card glass-card" style={{ padding: '1.2rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Progresso Totale</span>
                    <span style={{ color: '#FFD700', fontWeight: 700 }}>{totalUnlocked}/{ACHIEVEMENTS.length}</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${(totalUnlocked / ACHIEVEMENTS.length) * 100}%`,
                        background: 'linear-gradient(90deg, #6495FF, #FFD700)',
                        borderRadius: 4,
                        transition: 'width 0.5s ease'
                    }} />
                </div>
            </div>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {['all', 'common', 'rare', 'epic', 'legendary'].map(r => {
                    const rData = r !== 'all' ? ACHIEVEMENT_RARITIES[r] : null
                    return (
                        <button
                            key={r}
                            onClick={() => setFilterRarity(r)}
                            className="ach-filter-btn"
                            style={{
                                padding: '6px 14px',
                                background: filterRarity === r ? (rData?.borderColor || 'rgba(100,150,255,0.2)') : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${filterRarity === r ? (rData?.color || '#6495FF') : 'rgba(255,255,255,0.08)'}`,
                                color: filterRarity === r ? (rData?.color || '#6495FF') : 'rgba(255,255,255,0.5)',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 600,
                                transition: 'all 0.3s',
                            }}
                        >
                            {r === 'all' ? '🏆 Tutti' : rData?.label || r}
                        </button>
                    )
                })}
            </div>

            {/* Achievements Grid */}
            <div className="achievements-grid-new">
                {filtered.map((ach, idx) => {
                    const r = ACHIEVEMENT_RARITIES[ach.rarity]
                    return (
                        <div
                            key={ach.id}
                            className={`ach-card ${ach.unlocked ? 'ach-unlocked' : ''}`}
                            style={{
                                '--ach-color': r.color,
                                '--ach-border': r.borderColor,
                                '--ach-bg': r.backgroundColor,
                                animationDelay: `${idx * 0.05}s`,
                            }}
                        >
                            <div className="ach-rarity-badge">{r.label}</div>
                            <div className="ach-icon" style={{ filter: ach.unlocked ? `drop-shadow(0 0 8px ${r.color})` : 'grayscale(100%) opacity(0.5)' }}>
                                {ach.icon}
                            </div>
                            <div className="ach-name">{ach.name}</div>
                            <div className="ach-desc">{ach.description}</div>

                            {!ach.unlocked && (
                                <div className="ach-progress-wrap">
                                    <div className="ach-progress-bar">
                                        <div
                                            className="ach-progress-fill"
                                            style={{ width: `${ach.percent}%`, background: r.color }}
                                        />
                                    </div>
                                    <span className="ach-progress-text" style={{ color: r.color }}>
                                        {ach.current}/{ach.target}
                                    </span>
                                </div>
                            )}

                            {ach.unlocked && (
                                <div className="ach-unlocked-badge" style={{ color: r.color }}>✓ Sbloccato!</div>
                            )}

                            <div className="ach-points" style={{ borderTopColor: r.borderColor, color: r.color }}>
                                +{ach.points} punti
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* XP Guide */}
            <div className="xp-guide-section reveal-up" style={{ marginTop: '2rem' }}>
                <h3><Sparkles size={20} className="inline-icon" /> Come Guadagnare XP</h3>
                <div className="xp-guide-list">
                    {[
                        { icon: <Edit3 size={18} />, label: 'Nuova Nota', val: '+10 XP' },
                        { icon: <Zap size={18} />, label: 'Flashcard', val: '+5 XP' },
                        { icon: <CheckCircle size={18} />, label: 'Compito Fatto', val: '+20 XP' },
                        { icon: <Clock size={18} />, label: 'Pomodoro (25m)', val: '+25 XP' },
                        { icon: <Calendar size={18} />, label: 'Login Giornaliero', val: '+50 XP' },
                    ].map((item, i) => (
                        <div key={i} className="xp-guide-item">
                            <span className="xp-icon">{item.icon}</span>
                            <span className="xp-label">{item.label}</span>
                            <span className="xp-value">{item.val}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
