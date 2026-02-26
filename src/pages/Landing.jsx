import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AuthModal from '../components/auth/AuthModal'
import '../styles/home.css'

export default function Landing() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [showAuth, setShowAuth] = useState(false)
    const [stats, setStats] = useState({ notes: '...', flashcards: '...', duels: '...', users: '...' })
    const [gdprAccepted, setGdprAccepted] = useState(
        () => localStorage.getItem('gdpr_accepted') === 'true'
    )

    // Load homepage stats
    useEffect(() => {
        let mounted = true
        async function loadStats() {
            try {
                const { count: users, error: err1 } = await supabase
                    .from('users_data')
                    .select('*', { count: 'exact', head: true })

                const { data: siteStats, error: err2 } = await supabase
                    .from('site_stats')
                    .select('key, value')

                if (mounted) {
                    const notes = siteStats?.find(s => s.key === 'total_notes_created')?.value || 0
                    const flashcards = siteStats?.find(s => s.key === 'total_flashcards_created')?.value || 0
                    const duels = siteStats?.find(s => s.key === 'total_duels_completed')?.value || 0

                    setStats({
                        notes: notes || '0',
                        flashcards: flashcards || '0',
                        duels: duels || '0',
                        users: users || '0'
                    })
                }
            } catch (err) {
                console.warn('Stats load error:', err)
                if (mounted) setStats({ notes: '0', flashcards: '0', duels: '0', users: '0' })
            }
        }
        loadStats()
        return () => { mounted = false }
    }, [])

    // Animations (Ported from ui-interactions.js)
    useEffect(() => {
        // Dynamic Island
        const nav = document.getElementById('mainNav');
        const handleScroll = () => {
            // Bind Scroll to Global CSS Var for Parallax Engine
            document.documentElement.style.setProperty('--scroll-y', window.scrollY);

            if (!nav) return
            if (window.scrollY > 50) {
                nav.style.transform = 'translateX(-50%) translateY(-10px) scale(0.95)';
                nav.style.background = 'var(--nav-dynamic-bg, rgba(10, 10, 12, 0.9))';
            } else {
                nav.style.transform = 'translateX(-50%) translateY(0) scale(1)';
                nav.style.background = 'rgba(20, 20, 22, 0.7)';
            }
        }
        window.addEventListener('scroll', handleScroll)

        // Reveal Animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        document.querySelectorAll('.reveal-section, .feature-large-text').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(150px) scale(0.85)';
            el.style.filter = 'blur(15px)';
            el.style.transition = 'all 1.8s cubic-bezier(0.16, 1, 0.3, 1)';
            observer.observe(el);
        });

        // Inject custom class for the reveal
        const style = document.createElement('style');
        style.id = 'landing-dynamic-styles';
        style.innerHTML = `
            .is-visible {
                opacity: 1 !important;
                transform: translateY(0) scale(1) !important;
                filter: blur(0px) !important;
            }
        `;
        document.head.appendChild(style);

        // Setup Hero Intro Start State
        const heroLogo = document.querySelector('.hero-title-main img');
        const lines = document.querySelectorAll('.title-line');
        const desc = document.querySelector('.hero-description');
        const actions = document.querySelector('.hero-actions-radical');
        const preview = document.querySelector('.hero-floating-preview');

        // Apply Premium CSS Animations via classes instead of manual JS transforms
        if (heroLogo) heroLogo.classList.add('animate-hero-logo');

        [...lines, desc, actions].forEach((el, index) => {
            if (!el) return;
            el.classList.add('animate-hero-text');
            el.style.animationDelay = `${0.3 + (index * 0.15)}s`;
        });

        if (preview) {
            preview.style.opacity = '0';
            preview.style.transform = 'rotateX(25deg) translateY(60px)';
            preview.style.transition = 'all 1.6s cubic-bezier(0.16, 1, 0.3, 1)';
            setTimeout(() => {
                preview.style.opacity = '1';
                preview.style.transform = 'rotateX(15deg) translateY(0)';
                // Add continuous floating physics after entrance
                setTimeout(() => {
                    preview.style.animation = 'smoothFloat 8s ease-in-out infinite';
                }, 1600);
            }, 800);
        }

        // Spatial Parallax & Dynamic Glare
        const handleMouseMove = (e) => {
            // Bind Normalized Mouse Coords [0..1] for Premium CSS Shaders/Glare
            const normX = e.clientX / window.innerWidth;
            const normY = e.clientY / window.innerHeight;
            document.documentElement.style.setProperty('--mouse-x', normX);
            document.documentElement.style.setProperty('--mouse-y', normY);

            if (!preview) return;
            const x = (window.innerWidth / 2 - e.pageX) / 25;
            const y = (window.innerHeight / 2 - e.pageY) / 25;
            // Add a scaling bump alongside the rotation for extreme physics
            preview.style.transform = `rotateX(${15 + y}deg) rotateY(${-x}deg) translateY(${-y}px) scale(1.03)`;
        }
        document.addEventListener('mousemove', handleMouseMove);

        // Dynamic Nav Color Observer
        const navObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const color = entry.target.dataset.navColor;
                    if (color) {
                        document.documentElement.style.setProperty('--nav-dynamic-bg', color);
                        if (nav && window.scrollY > 50) {
                            nav.style.background = color;
                        }
                    }
                }
            });
        }, { threshold: 0.35 });

        document.querySelectorAll('section[data-nav-color]').forEach(el => navObserver.observe(el));

        return () => {
            window.removeEventListener('scroll', handleScroll)
            document.removeEventListener('mousemove', handleMouseMove)
            observer.disconnect()

            // Cleanup injected styles
            const injectedStyle = document.getElementById('landing-dynamic-styles')
            if (injectedStyle) injectedStyle.remove()
        }
    }, [])

    const acceptGDPR = () => {
        localStorage.setItem('gdpr_accepted', 'true')
        setGdprAccepted(true)
    }

    return (
        <div className="landing-page">
            {/* ═══════════ DYNAMIC ISLAND NAV ═══════════ */}
            <nav className="dynamic-island-nav" id="mainNav">
                <div className="nav-content">
                    <a href="#" className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <img src="/S.png" alt="StudyJournal Pro Logo" style={{ height: '32px', filter: 'drop-shadow(0 0 10px rgba(100, 150, 255, 0.5))' }} />
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>StudyJournal</span>
                    </a>
                    <div className="nav-links">
                        <a href="#features">Tecnologia</a>
                        <a href="#philosophy">Filosofia</a>
                    </div>
                    <button
                        className="nav-cta"
                        onClick={() => user ? navigate('/app') : setShowAuth(true)}
                        style={{ border: 'none', cursor: 'pointer' }}
                    >
                        {user ? "Vai all'App" : "Entra Ora"}
                    </button>
                </div>
            </nav>

            {/* AURORA BACKGROUND */}
            <div className="aurora-bg" aria-hidden="true">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            {/* ═══════════ RADICAL HERO ═══════════ */}
            <main className="radical-container">
                <section className="hero-section" data-nav-color="rgba(10, 10, 12, 0.9)">
                    <div className="hero-content">
                        <div className="hero-tag">Progettato per eccellere</div>
                        <h1 className="hero-title-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <img src="/S.png" alt="StudyJournal Logo" style={{ width: '130px', height: '130px', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 20px rgba(100, 150, 255, 0.6))' }} />
                            <div className="title-line"><span>Studia meno,</span></div>
                            <div className="title-line"><span className="accent-text">Impara tutto.</span></div>
                        </h1>
                        <p className="hero-description">
                            Dimentica gli appunti disordinati e le nottate in bianco. Lascia che l'AI trasformi le tue lezioni
                            in flashcard, quiz e piani di studio perfetti.
                            Tu metti l'obiettivo, noi tracciamo la strada.
                        </p>
                        <div className="hero-actions-radical">
                            <button
                                className="cta-primary-glass"
                                onClick={() => user ? navigate('/app') : setShowAuth(true)}
                                style={{ border: 'none', cursor: 'pointer' }}
                            >
                                {user ? "Apri Dashboard" : "Inizia Gratis"}
                            </button>
                            <a href="#features" className="cta-secondary-minimal">Scopri di più</a>
                        </div>
                    </div>

                    <div className="hero-floating-preview">
                        <div className="preview-glass-card">
                            <div className="card-inner">
                                <div className="stat-group">
                                    <span className="stat-val">{stats.notes}</span>
                                    <span className="stat-lab">Note</span>
                                </div>
                                <div className="stat-divider"></div>
                                <div className="stat-group">
                                    <span className="stat-val">{stats.flashcards}</span>
                                    <span className="stat-lab">Flashcard</span>
                                </div>
                                <div className="stat-divider"></div>
                                <div className="stat-group">
                                    <span className="stat-val">{stats.duels}</span>
                                    <span className="stat-lab">Duelli</span>
                                </div>
                                <div className="stat-divider"></div>
                                <div className="stat-group">
                                    <span className="stat-val">{stats.users}</span>
                                    <span className="stat-lab">Menti</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ═══════════ FEATURE REVEAL SECTIONS ═══════════ */}
                <section id="features" className="reveal-section" data-nav-color="rgba(25, 15, 45, 0.85)">
                    <div className="reveal-content-box">
                        <div className="feature-large-text">
                            <h2 className="section-title-minimal">
                                L'AI che <br /><span className="muted">Studia con te.</span>
                            </h2>
                            <p className="section-desc-minimal">
                                Da semplici appunti a una memoria di ferro in un clic.
                                Genera flashcard istantanee, chiedi spiegazioni al tuo tutor virtuale e preparati per l'esame
                                senza perdere un secondo in organizzazione.
                            </p>
                        </div>
                    </div>
                </section>

                <section id="philosophy" className="reveal-section" data-nav-color="rgba(10, 35, 25, 0.85)">
                    <div className="reveal-content-box">
                        <div className="feature-large-text">
                            <h2 className="section-title-minimal">
                                Zero distrazioni.<br /><span className="muted">Solo deep work.</span>
                            </h2>
                            <p className="section-desc-minimal">
                                Un'interfaccia pulita, modalità scura nativa e un ambiente
                                progettato per eliminare il rumore di fondo.
                                Entra nel flow state e lascia il mondo fuori.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="reveal-section" data-nav-color="rgba(15, 25, 45, 0.85)">
                    <div className="reveal-content-box">
                        <div className="feature-large-text">
                            <h2 className="section-title-minimal">
                                Il tuo sapere <br /><span className="muted">Sempre in tasca.</span>
                            </h2>
                            <p className="section-desc-minimal">
                                I tuoi pensieri, ovunque tu sia. In tempo reale, senza barriere.
                            </p>
                        </div>
                    </div>
                </section>

                {/* FINAL CTA */}
                <section className="reveal-section" data-nav-color="rgba(40, 15, 25, 0.85)">
                    <div className="feature-large-text" style={{ textAlign: 'center' }}>
                        <h2 className="section-title-minimal">Prendi il controllo</h2>
                        <button
                            className="cta-primary-glass"
                            onClick={() => user ? navigate('/app') : setShowAuth(true)}
                            style={{ display: 'inline-block', marginTop: '2rem', border: 'none', cursor: 'pointer' }}
                        >
                            {user ? "Vai all'App" : "Accedi ora"}
                        </button>
                    </div>
                </section>

                <footer className="landing-footer">
                    <div className="footer-logo">SJ<span className="dot">.</span></div>
                    <div className="footer-links">
                        <a href="#features">Tecnologia</a>
                        <a href="#philosophy">Manifesto</a>
                        <button
                            onClick={() => user ? navigate('/app') : setShowAuth(true)}
                            style={{
                                background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                                fontSize: '0.9rem', cursor: 'pointer', padding: 0
                            }}
                        >
                            App
                        </button>
                    </div>
                    <p className="footer-credits">© 2026 StudyJournal Pro. Realizzato e ideato da Gennaro Pascale</p>
                </footer>
            </main>

            {/* GDPR BANNER */}
            {!gdprAccepted && (
                <div className="gdpr-banner">
                    <div className="gdpr-content">
                        <p>
                            Utilizziamo i cookie per migliorare la tua esperienza.{' '}
                            <button
                                onClick={acceptGDPR}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'var(--color-accent)', fontWeight: 700, cursor: 'pointer'
                                }}
                            >
                                Accetto ✨
                            </button>
                        </p>
                    </div>
                </div>
            )}

            {/* AUTH MODAL */}
            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </div>
    )
}
