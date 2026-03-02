import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Sparkles, Brain, Users, ArrowRight, Mail, Lock, User, Calendar, AtSign, CheckCircle2, X, AlertCircle } from 'lucide-react'
import './AuthModal.css'

export default function AuthModal({ onClose }) {
    const { signIn, signUp } = useAuth()
    const navigate = useNavigate()
    const [tab, setTab] = useState('login')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    // Login fields
    const [loginEmail, setLoginEmail] = useState('')
    const [loginPassword, setLoginPassword] = useState('')

    // Signup fields
    const [signupName, setSignupName] = useState('')
    const [signupSurname, setSignupSurname] = useState('')
    const [signupAge, setSignupAge] = useState('')
    const [signupUsername, setSignupUsername] = useState('')
    const [signupEmail, setSignupEmail] = useState('')
    const [signupPassword, setSignupPassword] = useState('')

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')
        console.log('[AUTH] handleLogin: Starting login for', loginEmail)

        if (!loginEmail || !loginPassword) {
            setError('Inserisci email e password.')
            setLoading(false)
            return
        }

        const safetyTimeout = setTimeout(() => {
            console.warn('[AUTH] handleLogin reached 15s safety timeout - resetting loading')
            setLoading(false)
        }, 15000)

        try {
            await signIn(loginEmail, loginPassword)
            console.log('[AUTH] handleLogin: signIn successful')
            setSuccess('Accesso effettuato! Reindirizzamento...')
            setTimeout(() => {
                onClose()
                window.location.href = '/app'
            }, 1000)
        } catch (err) {
            console.error('[AUTH] handleLogin: signIn error:', err)
            let msg = err.message
            if (msg.includes('Invalid login')) msg = 'Email o password non corretti.'
            else if (msg.includes('Email not confirmed')) msg = 'Conferma la tua email prima di accedere.'
            else msg = msg
            setError(msg)
        } finally {
            clearTimeout(safetyTimeout)
            setLoading(false)
        }
    }

    const handleSignup = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!signupName || !signupSurname || !signupAge || !signupUsername || !signupEmail || !signupPassword) {
            setError('Compila tutti i campi.')
            return
        }
        if (signupPassword.length < 6) {
            setError('La password deve avere almeno 6 caratteri.')
            return
        }

        setLoading(true)
        try {
            await signUp(signupEmail, signupPassword, {
                name: signupName,
                surname: signupSurname,
                age: parseInt(signupAge),
                username: signupUsername
            })
            setSuccess('Account creato! Controlla l\'email per confermare.')
            setTimeout(() => {
                onClose()
            }, 3000)
        } catch (err) {
            let msg = err.message
            if (msg.includes('already registered')) msg = 'Questa email è già registrata.'
            else msg = msg
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="auth-card-premium">
                <button className="auth-close-btn" onClick={onClose}><X size={20} /></button>

                {/* LEFT SIDE: FORM AREA */}
                <div className="auth-form-section">
                    <div className="auth-header">
                        <img src="/favicon.png" alt="Logo" className="auth-mobile-logo" />
                        <h2>{tab === 'login' ? 'Bentornato' : 'Inizia Ora'}</h2>
                        <p>{tab === 'login' ? 'Accedi al tuo Diario di Studio AI' : 'Unisciti alla rivoluzione dello studio'}</p>
                    </div>

                    <div className="auth-tabs">
                        <button
                            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                            onClick={() => { setTab('login'); setError(''); setSuccess('') }}
                        >
                            Accedi
                        </button>
                        <button
                            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
                            onClick={() => { setTab('signup'); setError(''); setSuccess('') }}
                        >
                            Registrati
                        </button>
                    </div>

                    {error && (
                        <div className="auth-message auth-error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="auth-message auth-success">
                            <CheckCircle2 size={16} />
                            <span>{success}</span>
                        </div>
                    )}

                    {/* LOGIN FORM */}
                    {tab === 'login' && (
                        <form className="auth-form fade-in" onSubmit={handleLogin}>
                            <div className="auth-input-group">
                                <Mail className="auth-input-icon" size={18} />
                                <input
                                    type="email" id="authEmail" className="auth-input"
                                    placeholder="la-tua-email@esempio.com"
                                    value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                            <div className="auth-input-group">
                                <Lock className="auth-input-icon" size={18} />
                                <input
                                    type="password" id="authPassword" className="auth-input"
                                    placeholder="••••••••"
                                    value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                            <button type="submit" className="auth-submit-btn" disabled={loading}>
                                <span>{loading ? 'Caricamento...' : 'Accedi all\'App'}</span>
                                {!loading && <ArrowRight size={18} />}
                            </button>
                        </form>
                    )}

                    {/* SIGNUP FORM */}
                    {tab === 'signup' && (
                        <form className="auth-form fade-in" onSubmit={handleSignup}>
                            <div className="auth-fields-row">
                                <div className="auth-input-group">
                                    <User className="auth-input-icon" size={18} />
                                    <input
                                        type="text" id="signupName" className="auth-input"
                                        placeholder="Nome"
                                        value={signupName} onChange={e => setSignupName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="auth-input-group">
                                    <User className="auth-input-icon" size={18} />
                                    <input
                                        type="text" id="signupSurname" className="auth-input"
                                        placeholder="Cognome"
                                        value={signupSurname} onChange={e => setSignupSurname(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="auth-fields-row">
                                <div className="auth-input-group">
                                    <Calendar className="auth-input-icon" size={18} />
                                    <input
                                        type="number" id="signupAge" className="auth-input"
                                        placeholder="Età (es. 16)" min="10" max="99"
                                        value={signupAge} onChange={e => setSignupAge(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="auth-input-group">
                                    <AtSign className="auth-input-icon" size={18} />
                                    <input
                                        type="text" id="signupUsername" className="auth-input"
                                        placeholder="Username"
                                        value={signupUsername} onChange={e => setSignupUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="auth-input-group">
                                <Mail className="auth-input-icon" size={18} />
                                <input
                                    type="email" id="signupEmail" className="auth-input"
                                    placeholder="la-tua-email@esempio.com"
                                    value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                            <div className="auth-input-group">
                                <Lock className="auth-input-icon" size={18} />
                                <input
                                    type="password" id="signupPassword" className="auth-input"
                                    placeholder="Password (min. 6 car.)"
                                    value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                            <button type="submit" className="auth-submit-btn" disabled={loading}>
                                <span>{loading ? 'Creazione...' : 'Crea Account AI'}</span>
                                {!loading && <Sparkles size={18} />}
                            </button>
                        </form>
                    )}
                </div>

                {/* RIGHT SIDE: VISUAL SHOWCASE */}
                <div className="auth-showcase-section">
                    <div className="auth-glow-orb orb-1"></div>
                    <div className="auth-glow-orb orb-2"></div>

                    <div className="auth-showcase-content">
                        <div className="auth-glass-badge">
                            <Sparkles size={14} className="text-accent" />
                            <span>Potenziato dall'Intelligenza Artificiale</span>
                        </div>
                        <h3>Studia in modo più intelligente, non più duramente.</h3>
                        <ul className="auth-features-list">
                            <li>
                                <div className="feature-icon-wrapper"><Brain size={18} /></div>
                                <span>Generazione Flashcard e Quiz dai tuoi appunti</span>
                            </li>
                            <li>
                                <div className="feature-icon-wrapper"><Users size={18} /></div>
                                <span>Stanze di Studio virtuali con Pomodoro Timer</span>
                            </li>
                            <li>
                                <div className="feature-icon-wrapper"><CheckCircle2 size={18} /></div>
                                <span>Sistema XP, Avatar e Classifiche in tempo reale</span>
                            </li>
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    )
}
