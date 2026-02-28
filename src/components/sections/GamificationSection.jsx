import { useData } from '../../hooks/useData'
import { Trophy, Edit3, Zap, GraduationCap, Flame, CheckCircle, Clock, Calendar, Sparkles } from 'lucide-react'

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 5000, 10000]
const LEVEL_NAMES = ['Principiante', 'Studioso', 'Impegnato', 'Dedito', 'Maestro', 'Saggio', 'Erudito', 'Genio', 'Leggenda']

export default function GamificationSection() {
    const { data } = useData()

    const xp = data.stats?.xp || 0
    const level = data.stats?.level || 1
    const nextLevelXP = LEVEL_THRESHOLDS[level] || 100000
    const prevLevelXP = LEVEL_THRESHOLDS[level - 1] || 0
    const progress = Math.min(100, Math.max(0, ((xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100))
    const levelName = LEVEL_NAMES[level - 1] || 'Studente'

    const achievements = [
        { id: 'firstNote', icon: <Edit3 />, title: 'Primo Passo', desc: 'Crea la tua prima nota', unlocked: data.notes.length > 0 },
        { id: 'firstFlash', icon: <Zap />, title: 'Memoria Veloce', desc: 'Crea 5 flashcard', unlocked: data.flashcards.length >= 5 },
        { id: 'level5', icon: <GraduationCap />, title: 'Veterano', desc: 'Raggiungi il livello 5', unlocked: level >= 5 },
        { id: 'streak3', icon: <Flame />, title: 'Costante', desc: 'Studia per 3 giorni di fila', unlocked: (data.stats?.currentStreak || 0) >= 3 },
    ]

    return (
        <section className="section active reveal-entrance">
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
                <div className="hero-xp-text-mini">
                    {xp} / {nextLevelXP} XP
                </div>
            </div>

            <div className="stats-grid-gamification">
                <div className="stat-card-game glass-card hover-glow">
                    <div className="stat-game-value">{xp}</div>
                    <div className="stat-game-label">XP Totali</div>
                </div>
                <div className="stat-card-game glass-card hover-glow">
                    <div className="stat-game-value">{data.stats?.currentStreak || 0} <Flame size={20} className="inline-icon" /></div>
                    <div className="stat-game-label">Giorni di fila</div>
                </div>
                <div className="stat-card-game glass-card hover-glow">
                    <div className="stat-game-value">{data.notes.length}</div>
                    <div className="stat-game-label">Note Create</div>
                </div>
                <div className="stat-card-game glass-card hover-glow">
                    <div className="stat-game-value">{data.flashcards.length}</div>
                    <div className="stat-game-label">Flashcard</div>
                </div>
            </div>

            <h3 style={{ marginBottom: 16 }}><Trophy size={20} className="inline-icon" /> Obiettivi & Badge</h3>
            <div className="achievements-grid">
                {achievements.map(ach => (
                    <div key={ach.id} className={`card glass-card hover-glow achievement-card ${ach.unlocked ? 'unlocked' : ''}`}>
                        <span className="achievement-icon">{ach.icon}</span>
                        <div className="achievement-title">{ach.title}</div>
                        <div className="achievement-desc">{ach.desc}</div>
                    </div>
                ))}
            </div>

            <div className="xp-guide-section reveal-up">
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
