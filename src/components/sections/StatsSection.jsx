import { useData } from '../../hooks/useData'

export default function StatsSection() {
    const { data, getWeightedAverage, getCompletedTasksCount } = useData()

    const completedTasks = getCompletedTasksCount()
    const totalTasks = (data.tasks || []).length
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return (
        <section className="section active">
            <div className="hero">
                <h1><span className="gradient-text">Statistiche</span> 📊</h1>
                <p>Analizza i tuoi progressi nel tempo</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-icon">📚</span>
                    <div className="stat-label">Voti Totali</div>
                    <div className="stat-value">{(data.grades || []).length}</div>
                    <div className="stat-change">voti registrati</div>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">🎯</span>
                    <div className="stat-label">Completamento Compiti</div>
                    <div className="stat-value">{completionPercent}%</div>
                    <div className="stat-change">{completedTasks}/{totalTasks} completati</div>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">📝</span>
                    <div className="stat-label">Note Create</div>
                    <div className="stat-value">{(data.notes || []).length}</div>
                    <div className="stat-change">appunti salvati</div>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">🎴</span>
                    <div className="stat-label">Flashcard</div>
                    <div className="stat-value">{(data.flashcards || []).length}</div>
                    <div className="stat-change">carte create</div>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">⭐</span>
                    <div className="stat-label">Media Voti</div>
                    <div className="stat-value">{getWeightedAverage() || '-'}</div>
                    <div className="stat-change">media ponderata</div>
                </div>
            </div>
        </section>
    )
}
