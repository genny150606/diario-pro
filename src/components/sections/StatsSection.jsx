import { useData } from '../../hooks/useData'
import { useAnalytics } from '../../hooks/useAnalytics'

export default function StatsSection() {
    const { data, getWeightedAverage, getCompletedTasksCount } = useData()
    const { subjectPerformance, duelStats, consistencyAnalysis, insights } = useAnalytics()

    const completedTasks = getCompletedTasksCount()
    const totalTasks = (data.tasks || []).length
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return (
        <section className="section active reveal-entrance">
            <div className="hero">
                <h1><span className="gradient-text">Statistiche</span> 📊</h1>
                <p>Analizza i tuoi progressi e scopri i tuoi punti forti</p>
            </div>

            {/* Basic Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card glass-card hover-glow animated-border">
                    <span className="stat-icon">📚</span>
                    <div className="stat-label">Voti Registrati</div>
                    <div className="stat-value">{(data.grades || []).length}</div>
                </div>
                <div className="stat-card glass-card hover-glow animated-border">
                    <span className="stat-icon">🎯</span>
                    <div className="stat-label">Completamento Compiti</div>
                    <div className="stat-value">{completionPercent}%</div>
                    <div className="stat-change">{completedTasks}/{totalTasks}</div>
                </div>
                <div className="stat-card glass-card hover-glow animated-border">
                    <span className="stat-icon">📝</span>
                    <div className="stat-label">Note Create</div>
                    <div className="stat-value">{(data.notes || []).length}</div>
                </div>
                <div className="stat-card glass-card hover-glow animated-border">
                    <span className="stat-icon">🎴</span>
                    <div className="stat-label">Flashcard</div>
                    <div className="stat-value">{(data.flashcards || []).length}</div>
                </div>
                <div className="stat-card glass-card hover-glow animated-border">
                    <span className="stat-icon">⭐</span>
                    <div className="stat-label">Media Voti</div>
                    <div className="stat-value">{getWeightedAverage() || '-'}</div>
                </div>
            </div>

            {/* ═══ INSIGHTS ═══ */}
            {insights.length > 0 && (
                <div style={{ marginTop: '2.5rem' }}>
                    <h2 style={{ marginBottom: '1rem' }}>💡 Insights</h2>
                    <div style={{ display: 'grid', gap: '0.8rem' }}>
                        {insights.map((insight, idx) => (
                            <div
                                key={idx}
                                className="card glass-card"
                                style={{
                                    padding: '1.2rem 1.5rem',
                                    borderLeft: `4px solid ${insight.priority === 'high' ? '#FFD700' : insight.priority === 'medium' ? '#6495FF' : 'rgba(255,255,255,0.15)'}`,
                                    animation: `achFadeIn 0.4s ease ${idx * 0.1}s forwards`,
                                    opacity: 0
                                }}
                            >
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem' }}>{insight.title}</h4>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{insight.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ SUBJECT PERFORMANCE ═══ */}
            {subjectPerformance.length > 0 && (
                <div style={{ marginTop: '2.5rem' }}>
                    <h2 style={{ marginBottom: '1rem' }}>📊 Performance per Materia</h2>
                    <div className="card glass-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {subjectPerformance.map(s => (
                                <div key={s.subject}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                                        <span>{s.subject}</span>
                                        <span style={{ color: parseFloat(s.avg) >= 6 ? '#30D158' : '#FF453A', fontWeight: 700 }}>
                                            {s.avg}/10
                                        </span>
                                    </div>
                                    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${(parseFloat(s.avg) / 10) * 100}%`,
                                            background: parseFloat(s.avg) >= 6
                                                ? 'linear-gradient(90deg, #6495FF, #30D158)'
                                                : 'linear-gradient(90deg, #FF453A, #FF9F0A)',
                                            borderRadius: 3,
                                            transition: 'width 0.5s ease'
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ DUEL STATS ═══ */}
            {duelStats.totalDuels > 0 && (
                <div style={{ marginTop: '2.5rem' }}>
                    <h2 style={{ marginBottom: '1rem' }}>⚔️ Statistiche Duello</h2>
                    <div className="card glass-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 4 }}>Win Rate</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#6495FF' }}>{duelStats.winRate}%</div>
                            </div>
                            <div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 4 }}>Duelli Totali</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#FFD700' }}>{duelStats.totalDuels}</div>
                            </div>
                            <div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 4 }}>Vittorie</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#30D158' }}>{duelStats.duelsWon}</div>
                            </div>
                            <div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 4 }}>Sconfitte</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#FF453A' }}>{duelStats.duelsLost}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ CONSISTENCY ═══ */}
            <div style={{ marginTop: '2.5rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>📅 Consistenza (Ultimi 7 Giorni)</h2>
                <div className="card glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                        {consistencyAnalysis.days.map((day, idx) => (
                            <div key={idx} style={{
                                flex: 1,
                                height: 44,
                                background: day.studied ? '#30D158' : 'rgba(255,255,255,0.06)',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                                color: day.studied ? '#000' : 'rgba(255,255,255,0.25)'
                            }}>
                                {day.day}
                            </div>
                        ))}
                    </div>
                    <p style={{ margin: 0, fontSize: 14 }}>
                        Studi <strong>{consistencyAnalysis.studyDays}/7</strong> giorni ({consistencyAnalysis.consistency}%)
                    </p>
                </div>
            </div>
        </section>
    )
}
