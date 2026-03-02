import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AuthModal from '../components/auth/AuthModal'
import {
    Sparkles, BrainCircuit, Swords, Calendar, Activity, Home,
    ArrowRight, Star, Check, X as XIcon, ChevronDown, Zap, Users, Trophy, Shield, BarChart3, MessageSquare, Send
} from 'lucide-react'
import '../styles/home.css'

// ═══ TESTIMONIALS DATA ═══
const TESTIMONIALS = [
    { name: 'Marco P.', school: 'Liceo Classico Milano', rating: 5, quote: 'Ho migliorato i miei voti da 7.2 a 8.8 in 3 mesi. I duelli mi motivano ogni giorno!', avatar: '👨‍🎓' },
    { name: 'Sofia T.', school: 'Istituto Tecnico Roma', rating: 5, quote: 'Le flashcard generate dall\'IA mi fanno risparmiare ore. Studio 2 ore invece di 4.', avatar: '👩‍🎓' },
    { name: 'Luca D.', school: 'Università - Ingegneria', rating: 5, quote: 'Il sistema di spaced repetition è fantastico. Non dimentico più nulla!', avatar: '🧑‍💻' },
    { name: 'Emma R.', school: 'Liceo Scientifico Torino', rating: 5, quote: 'L\'app è addictive nel senso positivo. Voglio studiare per vincere i duelli!', avatar: '👩‍💼' },
]

// ═══ FEATURES DATA ═══
const FEATURES_DATA = [
    { icon: Swords, emoji: '⚔️', title: 'Duel Arena', desc: 'Sfida gli amici in tempo reale con quiz personalizzati sui tuoi appunti.', color: '#FF6B9D', details: ['Duelli 1v1 real-time', 'Leaderboard globale', 'Streaks e combo', 'Skill matching'] },
    { icon: BrainCircuit, emoji: '🤖', title: 'AI Flashcards', desc: 'L\'IA genera flashcard da qualsiasi testo. Note a flashcard in pochi secondi.', color: '#6495FF', details: ['Genera da note', 'Spaced repetition SM-2', 'Batch creation', 'Performance tracking'] },
    { icon: Sparkles, emoji: '✨', title: 'Gamification', desc: 'XP, livelli, 17 achievements e streak giornalieri. Lo studio diventa un gioco.', color: '#FFD700', details: ['9 livelli progressivi', 'Sistema streak', '17+ achievements', 'Bonus giornalieri'] },
    { icon: BarChart3, emoji: '📊', title: 'Smart Analytics', desc: 'Scopri quando studi meglio, quali materie padroneggi e come migliorare.', color: '#30D158', details: ['Insights intelligenti', 'Performance per materia', 'Consistenza 7 gg', 'Duel statistics'] },
    { icon: Calendar, emoji: '📝', title: 'Rich Notes', desc: 'Editor Markdown con toolbar, colori, tag e AI assistant integrato.', color: '#9D4EDD', details: ['Markdown completo', 'Colori e tag', 'AI Riassunto', 'Ricerca avanzata'] },
    { icon: Shield, emoji: '🛡️', title: 'Privacy First', desc: 'I tuoi dati sono criptati. Puoi esportarli o eliminarli in qualsiasi momento.', color: '#FF9F0A', details: ['GDPR compliant', 'Dati criptati', 'Export/Delete', 'Zero tracking'] },
]

// ═══ PRICING ═══
const PRICING = [
    {
        name: 'Free', price: '€0', period: 'per sempre', desc: 'Tutto ciò che serve per iniziare', color: '#888', cta: 'Inizia Gratis',
        features: [
            { text: 'Note & Flashcard illimitate', ok: true },
            { text: 'AI Flashcard generation', ok: true },
            { text: 'Pomodoro & Tasks', ok: true },
            { text: '5 Duelli/giorno', ok: true },
            { text: 'Study Modes avanzati', ok: false },
            { text: 'Analytics completi', ok: false },
        ]
    },
    {
        name: 'Pro', price: '€7,99', period: '/mese', desc: 'Per chi vuole il massimo', color: '#6495FF', cta: 'Scegli Pro', badge: 'PIÙ POPOLARE', highlighted: true,
        features: [
            { text: 'Tutto del Free +', ok: true },
            { text: 'Duelli illimitati', ok: true },
            { text: '5 Study Modes', ok: true },
            { text: 'Analytics completi', ok: true },
            { text: 'AI illimitata', ok: true },
            { text: 'Zero pubblicità', ok: true },
        ]
    },
]

// ═══ FAQ ═══
const FAQS = [
    { q: 'È veramente gratis?', a: 'Sì! Diario Pro è gratuito per sempre. La versione Pro a €7,99/mese è opzionale. Nessuna carta di credito richiesta.' },
    { q: 'I miei dati sono al sicuro?', a: 'Usiamo Supabase (standard enterprise-grade). I dati sono criptati e puoi scaricarli o eliminarli in qualsiasi momento.' },
    { q: 'Come funzionano i Duelli?', a: 'Sfidi un altro studente a rispondere a domande. Hai 15 secondi per ogni domanda. Chi ha più risposte corrette vince!' },
    { q: 'Come genera flashcard l\'IA?', a: 'L\'IA legge il tuo testo (note, PDF) e genera coppie domanda-risposta. Puoi modificarle, eliminarle o aggiungerne di nuove.' },
    { q: 'Posso cancellare il mio account?', a: 'Certo! Vai in Impostazioni > Privacy. Tutti i dati verranno eliminati permanentemente.' },
    { q: 'Funziona offline?', a: 'Abbiamo una modalità offline per le flashcard. I dati si sincronizzano quando torni online.' },
]

export default function Landing() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [showAuth, setShowAuth] = useState(false)
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [reviews, setReviews] = useState([])
    const [newReviewText, setNewReviewText] = useState('')
    const [newReviewRating, setNewReviewRating] = useState(5)
    const [submittingReview, setSubmittingReview] = useState(false)
    const [stats, setStats] = useState({ notes: '...', flashcards: '...', duels: '...', users: '...' })
    const [gdprAccepted, setGdprAccepted] = useState(() => localStorage.getItem('gdpr_accepted') === 'true')
    const [openFaq, setOpenFaq] = useState(0)
    const [selectedFeature, setSelectedFeature] = useState(0)

    const ctaAction = () => user ? navigate('/app') : setShowAuth(true)

    const handleLeaveReviewClick = () => {
        if (!user) {
            setShowAuth(true)
        } else {
            setShowReviewModal(true)
        }
    }

    const submitReview = async () => {
        if (newReviewText.length < 10) return alert('La recensione deve avere almeno 10 caratteri.')
        setSubmittingReview(true)
        try {
            const { error } = await supabase.from('reviews').insert({
                user_id: user.id,
                rating: newReviewRating,
                content: newReviewText,
                is_approved: true
            })
            if (error) throw error

            const { data: revs } = await supabase.from('reviews_with_users').select('*').order('created_at', { ascending: false }).limit(6)
            if (revs) setReviews(revs)

            setShowReviewModal(false)
            setNewReviewText('')
            setNewReviewRating(5)
        } catch (err) {
            console.error('Error post review:', err)
            alert('Errore pubblicazione recensione. Riprova più tardi.')
        } finally {
            setSubmittingReview(false)
        }
    }

    // Load live stats and reviews
    useEffect(() => {
        let mounted = true
        async function loadStats() {
            try {
                const { count: users } = await supabase.from('users_data').select('*', { count: 'exact', head: true })
                const { data: siteStats } = await supabase.from('site_stats').select('key, value')
                const { data: revs } = await supabase.from('reviews_with_users').select('*').order('created_at', { ascending: false }).limit(6)
                if (mounted) {
                    setStats({
                        notes: siteStats?.find(s => s.key === 'total_notes_created')?.value || '0',
                        flashcards: siteStats?.find(s => s.key === 'total_flashcards_created')?.value || '0',
                        duels: siteStats?.find(s => s.key === 'total_duels_completed')?.value || '0',
                        users: users || '0'
                    })
                    if (revs) setReviews(revs)
                }
            } catch { if (mounted) setStats({ notes: '0', flashcards: '0', duels: '0', users: '0' }) }
        }
        loadStats()
        return () => { mounted = false }
    }, [])

    // Animations
    useEffect(() => {
        const nav = document.getElementById('mainNav')
        const handleScroll = () => {
            document.documentElement.style.setProperty('--scroll-y', window.scrollY)
            if (!nav) return
            if (window.scrollY > 50) {
                nav.style.transform = 'translateX(-50%) translateY(-10px) scale(0.95)'
                nav.style.background = 'var(--nav-dynamic-bg, rgba(10, 10, 12, 0.9))'
            } else {
                nav.style.transform = 'translateX(-50%) translateY(0) scale(1)'
                nav.style.background = 'rgba(20, 20, 22, 0.7)'
            }
        }
        window.addEventListener('scroll', handleScroll)

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible')
                    observer.unobserve(entry.target)
                }
            })
        }, { threshold: 0.15 })

        document.querySelectorAll('.reveal-section, .feature-large-text').forEach(el => {
            el.style.opacity = '0'
            el.style.transform = 'translateY(100px) scale(0.9)'
            el.style.filter = 'blur(10px)'
            el.style.transition = 'all 1.4s cubic-bezier(0.16, 1, 0.3, 1)'
            observer.observe(el)
        })

        const style = document.createElement('style')
        style.id = 'landing-dynamic-styles'
        style.innerHTML = `.is-visible { opacity: 1 !important; transform: translateY(0) scale(1) !important; filter: blur(0px) !important; }`
        document.head.appendChild(style)

        // Hero animations
        const lines = document.querySelectorAll('.title-line')
        const desc = document.querySelector('.hero-description')
        const actions = document.querySelector('.hero-actions-radical')
            ;[...lines, desc, actions].forEach((el, i) => {
                if (!el) return
                el.classList.add('animate-hero-text')
                el.style.animationDelay = `${0.3 + (i * 0.15)}s`
            })

        const preview = document.querySelector('.hero-floating-preview')
        if (preview) {
            preview.style.opacity = '0'
            preview.style.transform = 'rotateX(25deg) translateY(60px)'
            preview.style.transition = 'all 1.6s cubic-bezier(0.16, 1, 0.3, 1)'
            setTimeout(() => {
                preview.style.opacity = '1'
                preview.style.transform = 'rotateX(15deg) translateY(0)'
                setTimeout(() => { preview.style.animation = 'smoothFloat 8s ease-in-out infinite' }, 1600)
            }, 800)
        }

        const handleMouseMove = (e) => {
            const normX = e.clientX / window.innerWidth
            const normY = e.clientY / window.innerHeight
            document.documentElement.style.setProperty('--mouse-x', normX)
            document.documentElement.style.setProperty('--mouse-y', normY)
            if (!preview) return
            const x = (window.innerWidth / 2 - e.pageX) / 25
            const y = (window.innerHeight / 2 - e.pageY) / 25
            preview.style.transform = `rotateX(${15 + y}deg) rotateY(${-x}deg) translateY(${-y}px) scale(1.03)`
        }
        document.addEventListener('mousemove', handleMouseMove)

        const navObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const navColor = entry.target.dataset.navColor
                    if (navColor) {
                        document.documentElement.style.setProperty('--nav-dynamic-bg', navColor)
                        if (nav && window.scrollY > 50) nav.style.background = navColor
                    }
                }
            })
        }, { threshold: 0.35 })
        document.querySelectorAll('section[data-nav-color]').forEach(el => navObserver.observe(el))

        return () => {
            window.removeEventListener('scroll', handleScroll)
            document.removeEventListener('mousemove', handleMouseMove)
            observer.disconnect()
            navObserver.disconnect()
            document.getElementById('landing-dynamic-styles')?.remove()
        }
    }, [])

    const acceptGDPR = () => { localStorage.setItem('gdpr_accepted', 'true'); setGdprAccepted(true) }

    const feat = FEATURES_DATA[selectedFeature]

    return (
        <div className="landing-page">
            {/* ═══ DYNAMIC ISLAND NAV ═══ */}
            <nav className="dynamic-island-nav" id="mainNav">
                <div className="nav-content">
                    <a href="#" className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <img src="/S.png" alt="StudyJournal Pro" style={{ height: '32px', filter: 'drop-shadow(0 0 10px rgba(100, 150, 255, 0.5))' }} />
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>StudyJournal</span>
                    </a>
                    <div className="nav-links">
                        <Link to="/" className="nav-home-icon" title="Home"><Home size={20} /></Link>
                        <a href="#features">Features</a>
                        <a href="#reviews">Recensioni</a>
                        <a href="#pricing">Prezzi</a>
                    </div>
                    <button className="nav-cta" onClick={ctaAction} style={{ border: 'none', cursor: 'pointer' }}>
                        {user ? "Vai all'App" : "Entra Ora"}
                    </button>
                </div>
            </nav>

            {/* AURORA */}
            <div className="aurora-bg" aria-hidden="true">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <main className="radical-container">
                {/* ═══ HERO ═══ */}
                <section className="hero-section hero-scroll-track" data-nav-color="rgba(10, 10, 12, 0.9)">
                    <div className="hero-sticky-container">
                        <div className="hero-content" style={{ opacity: `calc(1 - (var(--scroll-y, 0) / 800))` }}>
                            {/* Badge */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <div style={{
                                    background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)',
                                    borderRadius: 50, padding: '8px 18px', fontSize: 13, color: '#6495FF', fontWeight: 600,
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}>
                                    <Zap size={14} /> 🚀 #1 App per Studenti in Italia
                                </div>
                            </div>

                            <h1 className="hero-title-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                <img src="/S.png" alt="StudyJournal Logo" style={{ width: '110px', height: '110px', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(100, 150, 255, 0.6))' }} />
                                <div className="title-line"><span>Studia meno,</span></div>
                                <div className="title-line"><span className="accent-text">Impara TUTTO.</span></div>
                            </h1>
                            <p className="hero-description">
                                L'app di studio gamificata che trasforma l'apprendimento in un'avventura.<br />
                                <strong style={{ color: '#fff' }}>Duelli in tempo reale, XP, streak giornalieri</strong> e
                                intelligenza artificiale che genera automaticamente le tue flashcard.
                            </p>

                            {/* Value Props Mini */}
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
                                {['⚔️ Duelli Multiplayer', '🤖 AI Flashcards', '🔥 Streak System', '🏆 Achievements'].map((p, i) => (
                                    <div key={i} style={{
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)'
                                    }}>{p}</div>
                                ))}
                            </div>

                            <div className="hero-actions-radical">
                                <button className="cta-primary-glass" onClick={ctaAction} style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem' }}>
                                    {user ? "Apri Dashboard" : "Inizia Gratis"} <ArrowRight size={18} />
                                </button>
                                <a href="#features" className="cta-secondary-minimal">Scopri di più ↓</a>
                            </div>

                            {/* Trust Badges */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                                <span>✅ Gratis per sempre</span>
                                <span>⚡ Zero carta di credito</span>
                                <span>🔒 100% Privacy</span>
                            </div>
                        </div>

                        {/* Live Stats Dashboard */}
                        <div className="hero-floating-preview">
                            <div className="hero-stats-dashboard">
                                <div className="stats-dashboard-header">
                                    <div className="dashboard-pulse" />
                                    <span>Live Platform Stats</span>
                                </div>
                                <div className="stats-dashboard-grid">
                                    <div className="dashboard-stat-card" style={{ '--accent': '#6495FF' }}>
                                        <div className="ds-icon">👥</div>
                                        <div className="ds-value">{stats.users}</div>
                                        <div className="ds-label">Studenti Attivi</div>
                                    </div>
                                    <div className="dashboard-stat-card" style={{ '--accent': '#30D158' }}>
                                        <div className="ds-icon">📝</div>
                                        <div className="ds-value">{stats.notes}</div>
                                        <div className="ds-label">Note Create</div>
                                    </div>
                                    <div className="dashboard-stat-card" style={{ '--accent': '#FFD60A' }}>
                                        <div className="ds-icon">🃏</div>
                                        <div className="ds-value">{stats.flashcards}</div>
                                        <div className="ds-label">Flashcard</div>
                                    </div>
                                    <div className="dashboard-stat-card" style={{ '--accent': '#FF6B9D' }}>
                                        <div className="ds-icon">⚔️</div>
                                        <div className="ds-value">{stats.duels}</div>
                                        <div className="ds-label">Sfide</div>
                                    </div>
                                </div>
                                <div className="stats-dashboard-footer">
                                    <span className="footer-dot" /> Aggiornamento in tempo reale
                                </div>
                            </div>
                            <div className="floating-badge badge-1"><BrainCircuit size={18} /> AI Flashcards</div>
                            <div className="floating-badge badge-2"><Swords size={18} /> Duel Arena</div>
                            <div className="floating-badge badge-3"><Sparkles size={18} /> Knowledge Hub</div>
                        </div>
                    </div>
                </section>

                {/* ═══ FEATURES INTERACTIVE ═══ */}
                <section id="features" className="bento-section reveal-section" data-nav-color="rgba(10, 10, 15, 0.85)">
                    <div className="bento-header feature-large-text">
                        <h2 className="section-title-minimal">
                            Funzioni che <br /><span className="muted" style={{ background: 'linear-gradient(135deg, #6495FF, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>cambiano il gioco.</span>
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start', maxWidth: 1100, margin: '0 auto', padding: '0 2rem' }}>
                        {/* Feature Selector */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {FEATURES_DATA.map((f, i) => (
                                <div key={i} onClick={() => setSelectedFeature(i)} style={{
                                    background: selectedFeature === i ? 'rgba(100,150,255,0.15)' : 'rgba(255,255,255,0.04)',
                                    border: selectedFeature === i ? `2px solid ${f.color}` : '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 12, padding: '1.2rem', cursor: 'pointer', textAlign: 'center',
                                    transition: 'all 0.3s',
                                }}>
                                    <div style={{ fontSize: 28, marginBottom: 6 }}>{f.emoji}</div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{f.title}</div>
                                </div>
                            ))}
                        </div>

                        {/* Feature Detail */}
                        <div style={{
                            background: `linear-gradient(135deg, ${feat.color}15, rgba(100,150,255,0.05))`,
                            border: `1px solid ${feat.color}44`, borderRadius: 16, padding: '2rem', position: 'relative', overflow: 'hidden',
                            transition: 'all 0.4s'
                        }}>
                            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: '0.8rem' }}>
                                {feat.emoji} {feat.title}
                            </h3>
                            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                {feat.desc}
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                {feat.details.map((d, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: feat.color, flexShrink: 0 }} />
                                        {d}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ═══ REVIEWS ═══ */}
                <section id="reviews" className="reviews-section reveal-section" data-nav-color="rgba(10, 10, 12, 0.85)" style={{ padding: '6rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
                    <div className="feature-large-text" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 className="section-title-minimal">
                            Più di 1000 studenti <br /><span className="muted" style={{ background: 'linear-gradient(135deg, #6495FF, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>studiano con noi.</span>
                        </h2>
                        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 500, margin: '1rem auto 0' }}>
                            Leggi cosa dicono gli studenti che hanno trasformato il loro modo di studiare
                        </p>
                        <button onClick={handleLeaveReviewClick} style={{ marginTop: '2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 20px', borderRadius: 20, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <MessageSquare size={16} /> Lascia Recensione Reale
                        </button>
                    </div>

                    {reviews.length > 0 ? (
                        <div className="reviews-masonry">
                            {reviews.map((t, i) => (
                                <div key={i} className="review-card hover-glow" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(100,150,255,0.15)', borderRadius: 14, padding: '1.5rem', breakInside: 'avoid', marginBottom: '1.5rem', transition: 'all 0.3s' }}>
                                    <div className="review-stars" style={{ display: 'flex', gap: 4, marginBottom: '0.8rem' }}>
                                        {[...Array(t.rating || 5)].map((_, j) => (
                                            <Star key={j} size={14} fill="#FFD700" color="#FFD700" />
                                        ))}
                                    </div>
                                    <div className="review-content" style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', marginBottom: '1rem', fontStyle: 'italic' }}>"{t.content}"</div>
                                    <div className="review-author" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="review-avatar" style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6495FF, #8264FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>{t.name ? t.name.charAt(0).toUpperCase() : 'S'}</div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.name} {t.surname ? t.surname.charAt(0) + '.' : ''}</div>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>@{t.username}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '4rem', marginTop: '2rem', borderRadius: 24, border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <Star size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: '1rem', margin: '0 auto' }} />
                            <h3 style={{ fontSize: 24 }}>Nessuna recensione</h3>
                            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Sii il primo a scrivere la storia di Diario Pro!</p>
                        </div>
                    )}

                    {/* Stats Bar */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '2rem', marginTop: '4rem', paddingTop: '3rem',
                        borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center'
                    }}>
                        {[
                            { val: `${stats.users}+`, label: 'Studenti Attivi', color: '#6495FF' },
                            { val: '4.9/5', label: 'Rating', color: '#FFD700' },
                            { val: `${stats.duels}+`, label: 'Sfide Completate', color: '#FF6B9D' },
                            { val: '+1.5', label: 'Media Voti', color: '#30D158' },
                        ].map((s, i) => (
                            <div key={i}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.val}</div>
                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══ PRICING ═══ */}
                <section id="pricing" className="reveal-section" data-nav-color="rgba(10, 10, 15, 0.85)" style={{ padding: '6rem 2rem', maxWidth: 900, margin: '0 auto' }}>
                    <div className="feature-large-text" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 className="section-title-minimal">
                            Semplice <span className="muted" style={{ background: 'linear-gradient(135deg, #6495FF, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>e trasparente.</span>
                        </h2>
                        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 400, margin: '1rem auto 0' }}>
                            Niente sorprese. Cancella quando vuoi.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                        {PRICING.map((plan, i) => (
                            <div key={i} style={{
                                background: plan.highlighted ? 'linear-gradient(135deg, rgba(100,150,255,0.12), rgba(157,78,221,0.05))' : 'rgba(255,255,255,0.04)',
                                border: plan.highlighted ? '2px solid #6495FF' : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 16, padding: '2rem', position: 'relative', transition: 'all 0.3s'
                            }} className="hover-glow">
                                {plan.badge && (
                                    <div style={{
                                        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                                        background: '#6495FF', color: '#000', padding: '4px 14px', borderRadius: 20,
                                        fontSize: 11, fontWeight: 700, letterSpacing: 0.5
                                    }}>{plan.badge}</div>
                                )}
                                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{plan.name}</h3>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>{plan.desc}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: '1.5rem' }}>
                                    <span style={{ fontSize: 36, fontWeight: 800, color: plan.color }}>{plan.price}</span>
                                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{plan.period}</span>
                                </div>
                                <button onClick={ctaAction} style={{
                                    width: '100%', padding: 12, borderRadius: 10, fontWeight: 700, cursor: 'pointer', marginBottom: '1.5rem', fontSize: 14,
                                    background: plan.highlighted ? 'linear-gradient(135deg, #6495FF, #FFD700)' : 'rgba(255,255,255,0.08)',
                                    border: plan.highlighted ? 'none' : '1px solid rgba(255,255,255,0.15)',
                                    color: plan.highlighted ? '#000' : '#fff', transition: 'all 0.3s'
                                }}>{plan.cta}</button>
                                <div style={{ display: 'grid', gap: '0.6rem' }}>
                                    {plan.features.map((f, j) => (
                                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: f.ok ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}>
                                            {f.ok ? <Check size={14} color="#30D158" /> : <XIcon size={14} color="#555" />}
                                            {f.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══ FAQ ═══ */}
                <section id="faq" className="reveal-section" style={{ padding: '6rem 2rem', maxWidth: 800, margin: '0 auto' }}>
                    <div className="feature-large-text" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 className="section-title-minimal">
                            Domande <span className="muted" style={{ background: 'linear-gradient(135deg, #6495FF, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>frequenti</span>
                        </h2>
                    </div>
                    <div style={{ display: 'grid', gap: '0.8rem', position: 'relative', zIndex: 10 }}>
                        {FAQS.map((faq, i) => (
                            <div key={i} style={{
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 12, overflow: 'hidden'
                            }}>
                                <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} style={{
                                    width: '100%', padding: '1.2rem 1.5rem', background: 'transparent', border: 'none',
                                    color: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: 15, fontWeight: 600,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    {faq.q}
                                    <ChevronDown size={18} style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s', flexShrink: 0 }} />
                                </button>
                                <div style={{
                                    maxHeight: openFaq === i ? 200 : 0, overflow: 'hidden',
                                    transition: 'max-height 0.4s ease, padding 0.4s ease',
                                    padding: openFaq === i ? '0 1.5rem 1.2rem' : '0 1.5rem',
                                    color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6
                                }}>
                                    {faq.a}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══ FINAL CTA ═══ */}
                <section className="reveal-section" style={{ padding: '4rem 2rem' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(100,150,255,0.1), rgba(157,78,221,0.1))',
                        border: '1px solid rgba(100,150,255,0.2)', borderRadius: 20,
                        padding: '4rem 2rem', textAlign: 'center', maxWidth: 800, margin: '0 auto'
                    }}>
                        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: '1rem' }}>
                            Pronto a trasformare il tuo studio?
                        </h2>
                        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', lineHeight: 1.6, maxWidth: 500, margin: '0 auto 2rem' }}>
                            Unisciti a migliaia di studenti che stanno già migliorando i loro voti con StudyJournal Pro. Completamente gratis.
                        </p>
                        <button onClick={ctaAction} style={{
                            padding: '16px 36px', background: 'linear-gradient(135deg, #6495FF, #FFD700)',
                            border: 'none', borderRadius: 12, color: '#000', fontSize: 16, fontWeight: 700,
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8
                        }}>
                            Inizia Gratis Adesso <ArrowRight size={18} />
                        </button>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: '1.5rem' }}>
                            ✅ Gratis per sempre · ⚡ Zero credit card · 🔒 GDPR Compliant
                        </p>
                    </div>
                </section>

                {/* ═══ FOOTER ═══ */}
                <footer className="landing-footer">
                    <div className="footer-logo">SJ<span className="dot">.</span></div>
                    <div className="footer-links">
                        <a href="#features">Features</a>
                        <a href="#pricing">Prezzi</a>
                        <a href="#faq">FAQ</a>
                        <button onClick={ctaAction} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', cursor: 'pointer', padding: 0 }}>
                            App
                        </button>
                    </div>
                    <p className="footer-credits">© 2026 StudyJournal Pro. Realizzato e ideato da Gennaro Pascale</p>
                </footer>
            </main>

            {/* GDPR */}
            {!gdprAccepted && (
                <div className="gdpr-banner">
                    <div className="gdpr-content">
                        <p>
                            Utilizziamo i cookie per migliorare la tua esperienza.{' '}
                            <button onClick={acceptGDPR} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontWeight: 700, cursor: 'pointer' }}>
                                Accetto ✨
                            </button>
                        </p>
                    </div>
                </div>
            )}

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

            {showReviewModal && (
                <div className="auth-overlay" onClick={(e) => e.target === e.currentTarget && setShowReviewModal(false)} style={{ zIndex: 100001, padding: '1rem', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0 }}>
                    <div className="auth-card" style={{ width: '100%', maxWidth: 500, padding: '3rem', background: 'rgba(15, 15, 18, 1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 32, boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: 28, fontWeight: 900, margin: 0, fontFamily: 'Outfit' }}>Lascia Feedback</h3>
                            <button onClick={() => setShowReviewModal(false)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', transition: 'all 0.3s' }}><XIcon size={20} /></button>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '1rem', fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Il tuo voto reale</label>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                        key={star}
                                        size={36}
                                        fill={star <= newReviewRating ? "#FFD700" : "transparent"}
                                        color={star <= newReviewRating ? "#FFD700" : "rgba(255,255,255,0.2)"}
                                        style={{ cursor: 'pointer', transition: 'all 0.2s', filter: star <= newReviewRating ? 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.4))' : 'none' }}
                                        onClick={() => setNewReviewRating(star)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '3rem' }}>
                            <label style={{ display: 'block', marginBottom: '1rem', fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>La tua opinione</label>
                            <textarea
                                value={newReviewText}
                                onChange={e => setNewReviewText(e.target.value)}
                                placeholder="Racconta come questo software ha impattato sul tuo studio..."
                                style={{ width: '100%', boxSizing: 'border-box', minHeight: 160, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '1.5rem', color: '#fff', fontSize: 16, fontFamily: 'inherit', resize: 'vertical', outline: 'none', transition: 'border-color 0.3s' }}
                                onFocus={(e) => e.target.style.borderColor = '#6495FF'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <button
                            disabled={submittingReview || newReviewText.length < 10}
                            onClick={submitReview}
                            style={{ width: '100%', padding: '1.4rem', background: 'linear-gradient(135deg, #6495FF, #8264FF)', color: '#fff', fontSize: 18, fontWeight: 800, borderRadius: 20, border: 'none', cursor: submittingReview || newReviewText.length < 10 ? 'not-allowed' : 'pointer', opacity: submittingReview || newReviewText.length < 10 ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, transition: 'all 0.3s', boxShadow: '0 10px 30px rgba(100,150,255,0.4)' }}
                        >
                            {submittingReview ? 'Pubblicazione...' : <><Send size={20} /> Condividi Feedback</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
