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
        <div className="auth-overlay-ultra" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="auth-card-ultra">
                <button className="auth-close-btn-ultra" onClick={onClose}><X size={20} /></button>

                {/* LEFT SIDE: FORM AREA */}
                <div className="auth-form-side-ultra">
                    <div className="auth-header-ultra">
                        <div className="auth-logo-badge">
                            <img src="/favicon.png" alt="StudyJournal Pro Logo" />
                            <span>Diario Pro</span>
                        </div>
                        <h2>{tab === 'login' ? 'Bentornato.' : 'Unisciti a Noi.'}</h2>
                        <p>{tab === 'login' ? 'Accedi al tuo ecosistema di studio potenziato dall\'IA' : 'Il tuo viaggio verso l\'eccellenza accademica inizia qui'}</p>
                    </div>

                    <div className="auth-tabs-ultra">
                        <button
                            className={`auth-tab-ultra ${tab === 'login' ? 'active' : ''}`}
                            onClick={() => { setTab('login'); setError(''); setSuccess('') }}
                        >
                            <User size={16} /> Login
                        </button>
                        <button
                            className={`auth-tab-ultra ${tab === 'signup' ? 'active' : ''}`}
                            onClick={() => { setTab('signup'); setError(''); setSuccess('') }}
                        >
                            <Sparkles size={16} /> Registrati
                        </button>
                    </div>

                    <div className="auth-messages-wrapper">
                        {error && (
                            <div className="auth-alert error">
                                <AlertCircle size={16} /> <span>{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="auth-alert success">
                                <CheckCircle2 size={16} /> <span>{success}</span>
                            </div>
                        )}
                    </div>

                    <div className="auth-forms-container">
                        {tab === 'login' && (
                            <form className="auth-form-ultra fade-in" onSubmit={handleLogin}>
                                <div className="input-group-ultra">
                                    <div className="input-icon-ultra"><Mail size={18} /></div>
                                    <input
                                        type="email" id="authEmail" className="input-ultra"
                                        placeholder="Email istituzionale o personale"
                                        value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                                        autoComplete="email" required
                                    />
                                </div>
                                <div className="input-group-ultra">
                                    <div className="input-icon-ultra"><Lock size={18} /></div>
                                    <input
                                        type="password" id="authPassword" className="input-ultra"
                                        placeholder="••••••••"
                                        value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                                        autoComplete="current-password" required
                                    />
                                </div>
                                <button type="submit" className="submit-btn-ultra" disabled={loading}>
                                    {loading ? <span className="loader-pulse"></span> : <><span>Accedi all'Avatar</span> <ArrowRight size={18} /></>}
                                </button>
                            </form>
                        )}

                        {tab === 'signup' && (
                            <form className="auth-form-ultra fade-in" onSubmit={handleSignup}>
                                <div className="input-row-ultra">
                                    <div className="input-group-ultra">
                                        <div className="input-icon-ultra"><User size={18} /></div>
                                        <input
                                            type="text" id="signupName" className="input-ultra"
                                            placeholder="Nome"
                                            value={signupName} onChange={e => setSignupName(e.target.value)} required
                                        />
                                    </div>
                                    <div className="input-group-ultra">
                                        <div className="input-icon-ultra"><User size={18} /></div>
                                        <input
                                            type="text" id="signupSurname" className="input-ultra"
                                            placeholder="Cognome"
                                            value={signupSurname} onChange={e => setSignupSurname(e.target.value)} required
                                        />
                                    </div>
                                </div>
                                <div className="input-row-ultra">
                                    <div className="input-group-ultra">
                                        <div className="input-icon-ultra"><Calendar size={18} /></div>
                                        <input
                                            type="number" id="signupAge" className="input-ultra"
                                            placeholder="Età" min="10" max="99"
                                            value={signupAge} onChange={e => setSignupAge(e.target.value)} required
                                        />
                                    </div>
                                    <div className="input-group-ultra">
                                        <div className="input-icon-ultra"><AtSign size={18} /></div>
                                        <input
                                            type="text" id="signupUsername" className="input-ultra"
                                            placeholder="Username"
                                            value={signupUsername} onChange={e => setSignupUsername(e.target.value)} required
                                        />
                                    </div>
                                </div>
                                <div className="input-group-ultra">
                                    <div className="input-icon-ultra"><Mail size={18} /></div>
                                    <input
                                        type="email" id="signupEmail" className="input-ultra"
                                        placeholder="tua@email.com"
                                        value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                                        autoComplete="email" required
                                    />
                                </div>
                                <div className="input-group-ultra">
                                    <div className="input-icon-ultra"><Lock size={18} /></div>
                                    <input
                                        type="password" id="signupPassword" className="input-ultra"
                                        placeholder="Min. 6 caratteri"
                                        value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                                        autoComplete="new-password" required
                                    />
                                </div>
                                <button type="submit" className="submit-btn-ultra" disabled={loading}>
                                    {loading ? <span className="loader-pulse"></span> : <><span>Forgia Profilo</span> <Sparkles size={18} /></>}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE: VISUAL SHOWCASE */}
                <div className="auth-visual-ultra">
                    <div className="visual-blur-orb orb-primary"></div>
                    <div className="visual-blur-orb orb-secondary"></div>
                    <div className="visual-blur-orb orb-tertiary"></div>

                    <div className="visual-content-ultra">
                        <div className="visual-glass-card">
                            <Sparkles size={24} color="#FFD700" />
                            <h3>L'arma segreta dei top performer.</h3>
                            <p>Oltre 1.000 studenti hanno già rivoluzionato il loro metodo di studio.</p>
                            <div className="visual-features">
                                <div className="visual-feature-item">
                                    <Brain size={16} /> <span>Flashcard Generate dall'IA</span>
                                </div>
                                <div className="visual-feature-item">
                                    <Users size={16} /> <span>Duelli e Stanze Multiplayer</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
