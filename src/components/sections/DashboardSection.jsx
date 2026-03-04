import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Trophy, Swords, Timer, BookOpen, CheckSquare,
    ArrowRight, Star, Zap, Layout, Activity, Sparkles, PlusCircle
} from 'lucide-react'
import { useData } from '../../hooks/useData'
import { useNavigate } from 'react-router-dom'
import '../../styles/dashboard-pro.css'

export default function DashboardSection() {
    const { data, upcomingTasks, recentNotes } = useData()
    const navigate = useNavigate()
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.12, delayChildren: 0.1 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: 'spring', stiffness: 100, damping: 20 }
        }
    }

    const floatingVariants = {
        animate: {
            y: [0, -10, 0],
            transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }
    }

    // Helper for date safety
    const formatSafeDate = (dateStr, fallback = 'Data non impostata') => {
        const d = new Date(dateStr)
        return isNaN(d.getTime()) ? fallback : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    return (
        <div className="v3-dashboard-container">
            <div className="v3-ambient-canvas">
                <div className="v3-orb orb-1"></div>
                <div className="v3-orb orb-2"></div>
                <div className="v3-orb orb-3"></div>
            </div>

            <motion.section
                className="v3-hero-section"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                <div className="v3-hero-content">
                    <motion.div variants={itemVariants} className="v3-hero-badge">
                        <Sparkles size={14} />
                        <span>AI Dynamic Workspace</span>
                    </motion.div>

                    <motion.h1 variants={itemVariants} className="v3-display-title">
                        BENTORNATO,<br />
                        <span className="v3-gradient-text">{data.user?.name || 'STUDENTE'}</span>
                    </motion.h1>

                    <motion.div variants={itemVariants} className="v3-hero-actions">
                        <button className="v3-btn-primary" onClick={() => navigate('/app/notes/new')}>
                            <PlusCircle size={20} />
                            <span>Nuova Nota</span>
                        </button>
                        <button className="v3-btn-secondary" onClick={() => navigate('/app/duel')}>
                            <Swords size={20} />
                            <span>L'Arena</span>
                        </button>
                    </motion.div>
                </div>

                <motion.div className="v3-floating-metrics" variants={floatingVariants} animate="animate">
                    <div className="metric-pill glass-v3">
                        <Trophy size={16} />
                        <span>Livello {data.gamification?.level || 1}</span>
                    </div>
                    <div className="metric-pill glass-v3 highlight">
                        <Zap size={16} />
                        <span>{data.gamification?.streak || 0} Giorni</span>
                    </div>
                </motion.div>
            </motion.section>

            <motion.div
                className="v3-organic-grid"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={containerVariants}
            >
                {/* 1. ARENA SHOWCASE */}
                <motion.div className="v3-card arena-showcase-v3 glass-v3 col-2" variants={itemVariants}>
                    <div className="v3-badge-live">LIVE</div>
                    <div className="v3-card-inner">
                        <div className="v3-card-visual">
                            <div className="arena-glow-v3"></div>
                            <Swords size={48} />
                        </div>
                        <div className="v3-card-info">
                            <h3>L'Arena</h3>
                            <p>Sfida altri studenti in tempo reale e scala la classifica globale.</p>
                            <button className="v3-card-link" onClick={() => navigate('/app/duel')}>
                                Entra Ora <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* 2. ACTIVITY TREND */}
                <motion.div className="v3-card activity-card-v3 glass-v3" variants={itemVariants}>
                    <div className="v3-card-header">
                        <Activity size={20} />
                        <span>Sinergia di Studio</span>
                    </div>
                    <div className="v3-trend-viz">
                        {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                            <motion.div
                                key={i}
                                className="v3-bar"
                                initial={{ height: 0 }}
                                whileInView={{ height: `${h}%` }}
                                transition={{ delay: 0.2 + (i * 0.1), duration: 1 }}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* 3. AI COACHING */}
                <motion.div className="v3-card coaching-card-v3 glass-v3 highlight" variants={itemVariants}>
                    <div className="v3-card-header">
                        <Sparkles size={20} />
                        <span>AI Coaching</span>
                    </div>
                    <p>"Oggi è il momento perfetto per approfondire Matematica. La tua costanza sta dando frutti straordinari."</p>
                </motion.div>

                {/* 4. TASKS */}
                <motion.div className="v3-card tasks-card-v3 glass-v3 col-2" variants={itemVariants}>
                    <div className="v3-card-header">
                        <CheckSquare size={20} />
                        <span>Compiti Imminenti</span>
                    </div>
                    <div className="v3-item-list">
                        {(upcomingTasks || []).slice(0, 3).map(t => (
                            <div key={t.id} className="v3-list-item">
                                <div className="v3-dot"></div>
                                <div className="v3-item-content">
                                    <h4>{t.description}</h4>
                                    <span>{formatSafeDate(t.dueDate)}</span>
                                </div>
                            </div>
                        ))}
                        {(!upcomingTasks || upcomingTasks.length === 0) && (
                            <div className="v3-empty-msg">Ottimo lavoro! Nessun compito per ora.</div>
                        )}
                    </div>
                </motion.div>

                {/* 5. NOTES */}
                <motion.div className="v3-card notes-card-v3 glass-v3" variants={itemVariants}>
                    <div className="v3-card-header">
                        <BookOpen size={20} />
                        <span>Note Recenti</span>
                    </div>
                    <div className="v3-mini-notes">
                        {(recentNotes || []).slice(0, 2).map(n => (
                            <div key={n.id} className="v3-mini-note" onClick={() => navigate(`/app/notes?id=${n.id}`)}>
                                <h5>{n.title || 'Senza Titolo'}</h5>
                                <span>{formatSafeDate(n.updatedAt || n.createdAt, 'Recentemente')}</span>
                            </div>
                        ))}
                        {(!recentNotes || recentNotes.length === 0) && (
                            <div className="v3-empty-msg">Crea la tua prima nota!</div>
                        )}
                    </div>
                </motion.div>

                {/* 6. FOCUS AREA */}
                <motion.div className="v3-card focus-card-v3 glass-v3" variants={itemVariants} onClick={() => navigate('/app/pomodoro')}>
                    <Timer size={32} />
                    <span>Smart Focus</span>
                </motion.div>
            </motion.div>
        </div>
    )
}
