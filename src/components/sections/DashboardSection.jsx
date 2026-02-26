import { useData } from '../../hooks/useData'
import { FileText, Layers, CheckCircle, GraduationCap, BarChart3, Swords, Sparkles, Target, Edit3 } from 'lucide-react'

export default function DashboardSection() {
    const { data, getWeightedAverage, getCompletedTasksCount } = useData()

    const average = getWeightedAverage()
    const completedTasks = getCompletedTasksCount()

    return (
        <section className="section active reveal-entrance">
            <div className="hero">
                <h1><span className="gradient-text">Benvenuto!</span> <Sparkles size={32} className="inline-icon hero-sparkle" /></h1>
                <p>Visualizza il tuo progresso di studio in tempo reale</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <FileText size={20} className="stat-icon-svg" />
                        <div className="stat-label">Note</div>
                    </div>
                    <div className="stat-value">{(data.notes || []).length}</div>
                    <div className="stat-change">appunti salvati</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <Layers size={20} className="stat-icon-svg" />
                        <div className="stat-label">Flashcard</div>
                    </div>
                    <div className="stat-value">{(data.flashcards || []).length}</div>
                    <div className="stat-change">flashcard create</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <CheckCircle size={20} className="stat-icon-svg" />
                        <div className="stat-label">Compiti</div>
                    </div>
                    <div className="stat-value">{completedTasks}</div>
                    <div className="stat-change">completati</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <GraduationCap size={20} className="stat-icon-svg" />
                        <div className="stat-label">Media</div>
                    </div>
                    <div className="stat-value">{average || '-'}</div>
                    <div className="stat-change">media ponderata</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <BarChart3 size={20} className="stat-icon-svg" />
                        <div className="stat-label">Voti</div>
                    </div>
                    <div className="stat-value">{(data.grades || []).length}</div>
                    <div className="stat-change">voti totali</div>
                </div>

                <div className="stat-card duel-card">
                    <div className="stat-header">
                        <Swords size={20} className="stat-icon-svg" />
                        <div className="stat-label">AI Duel</div>
                    </div>
                    <div className="stat-value">SFIDA!</div>
                    <div className="stat-change">Sfida i tuoi compagni</div>
                </div>
            </div>

            {/* Daily Challenges */}
            <div className="daily-challenges-widget reveal-up" style={{ animationDelay: '0.4s' }}>
                <div className="challenge-header">
                    <div className="header-text">
                        <h3><Target size={20} className="inline-icon" /> Sfide del Giorno</h3>
                        <p className="challenge-subtitle">Guadagna XP extra completando le missioni</p>
                    </div>
                </div>
                <div className="challenge-list">
                    <div className={`challenge-item ${(data.notes || []).length >= 3 ? 'completed' : ''}`}>
                        <div className="challenge-icon-box"><Edit3 size={18} /></div>
                        <div className="challenge-info">
                            <div className="challenge-name">Scrivi 3 nuove note</div>
                            <div className="challenge-reward">+50 XP</div>
                        </div>
                        {(data.notes || []).length >= 3 && <div className="challenge-check-badge"><CheckCircle size={14} /></div>}
                    </div>
                    <div className={`challenge-item ${(data.flashcards || []).length >= 5 ? 'completed' : ''}`}>
                        <div className="challenge-icon-box"><Layers size={18} /></div>
                        <div className="challenge-info">
                            <div className="challenge-name">Crea 5 flashcard</div>
                            <div className="challenge-reward">+100 XP</div>
                        </div>
                        {(data.flashcards || []).length >= 5 && <div className="challenge-check-badge"><CheckCircle size={14} /></div>}
                    </div>
                    <div className="challenge-item">
                        <div className="challenge-icon-box"><Swords size={18} /></div>
                        <div className="challenge-info">
                            <div className="challenge-name">Partecipa a un Duello AI</div>
                            <div className="challenge-reward">+150 XP</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
