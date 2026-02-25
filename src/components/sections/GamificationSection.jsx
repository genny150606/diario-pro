import { useData } from '../../hooks/useData'

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
        { id: 'firstNote', icon: '📝', title: 'Primo Passo', desc: 'Crea la tua prima nota', unlocked: data.notes.length > 0 },
        { id: 'firstFlash', icon: '⚡', title: 'Memoria Veloce', desc: 'Crea 5 flashcard', unlocked: data.flashcards.length >= 5 },
        { id: 'level5', icon: '🎓', title: 'Veterano', desc: 'Raggiungi il livello 5', unlocked: level >= 5 },
        { id: 'streak3', icon: '🔥', title: 'Costante', desc: 'Studia per 3 giorni di fila', unlocked: false },
    ]

    return (
        <section className="section active">
            <div className="gamification-hero-mini">
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
                <div className="stat-card-game">
                    <div className="stat-game-value">{xp}</div>
                    <div className="stat-game-label">XP Totali</div>
                </div>
                <div className="stat-card-game">
                    <div className="stat-game-value">0 🔥</div>
                    <div className="stat-game-label">Giorni di fila</div>
                </div>
                <div className="stat-card-game">
                    <div className="stat-game-value">{data.notes.length}</div>
                    <div className="stat-game-label">Note Create</div>
                </div>
                <div className="stat-card-game">
                    <div className="stat-game-value">{data.flashcards.length}</div>
                    <div className="stat-game-label">Flashcard</div>
                </div>
            </div>

            <h3 style={{ marginBottom: 16 }}>🏆 Obiettivi & Badge</h3>
            <div className="achievements-grid">
                {achievements.map(ach => (
                    <div key={ach.id} className={`achievement-card ${ach.unlocked ? 'unlocked' : ''}`}>
                        <span className="achievement-icon">{ach.icon}</span>
                        <div className="achievement-title">{ach.title}</div>
                        <div className="achievement-desc">{ach.desc}</div>
                    </div>
                ))}
            </div>

            <div className="xp-guide-section">
                <h3>💎 Come Guadagnare XP</h3>
                <div className="xp-guide-list">
                    {[
                        { icon: '📝', label: 'Nuova Nota', val: '+10 XP' },
                        { icon: '⚡', label: 'Flashcard', val: '+5 XP' },
                        { icon: '✅', label: 'Compito Fatto', val: '+20 XP' },
                        { icon: '⏳', label: 'Pomodoro (25m)', val: '+25 XP' },
                        { icon: '📅', label: 'Login Giornaliero', val: '+50 XP' },
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
