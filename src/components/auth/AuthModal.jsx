import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
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
            setError('❌ Inserisci email e password.')
            setLoading(false) // Reset loading if validation fails
            return
        }

        const safetyTimeout = setTimeout(() => {
            console.warn('[AUTH] handleLogin reached 15s safety timeout - resetting loading')
            setLoading(false)
        }, 15000)

        try {
            await signIn(loginEmail, loginPassword)
            console.log('[AUTH] handleLogin: signIn successful')
            setSuccess('✅ Accesso effettuato! Reindirizzamento...')
            setTimeout(() => {
                onClose()
                navigate('/app')
            }, 1000)
        } catch (err) {
            console.error('[AUTH] handleLogin: signIn error:', err)
            let msg = err.message
            if (msg.includes('Invalid login')) msg = '❌ Email o password non corretti.'
            else if (msg.includes('Email not confirmed')) msg = '❌ Conferma la tua email prima di accedere.'
            else msg = '❌ ' + msg
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
            setError('❌ Compila tutti i campi.')
            return
        }
        if (signupPassword.length < 6) {
            setError('❌ La password deve avere almeno 6 caratteri.')
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
            setSuccess('✅ Account creato! Controlla l\'email per confermare.')
        } catch (err) {
            let msg = err.message
            if (msg.includes('already registered')) msg = '❌ Questa email è già registrata.'
            else msg = '❌ ' + msg
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="auth-card">
                {/* Close button */}
                <button className="auth-close-btn" onClick={onClose}>✕</button>

                {/* Logo */}
                <div className="auth-logo">
                    <img src="/favicon.png" alt="Logo" style={{ width: 48, height: 48, borderRadius: 12 }} />
                    <h2>StudyJournal Pro</h2>
                </div>

                {/* Tabs */}
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

                {/* Error / Success messages */}
                {error && <div className="auth-message auth-error">{error}</div>}
                {success && <div className="auth-message auth-success">{success}</div>}

                {/* LOGIN FORM */}
                {tab === 'login' && (
                    <form className="auth-form" onSubmit={handleLogin}>
                        <div className="auth-field">
                            <label htmlFor="authEmail">📧 Email</label>
                            <input
                                type="email" id="authEmail" className="auth-input"
                                placeholder="la-tua-email@esempio.com"
                                value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </div>
                        <div className="auth-field">
                            <label htmlFor="authPassword">🔒 Password</label>
                            <input
                                type="password" id="authPassword" className="auth-input"
                                placeholder="••••••••"
                                value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            <span>{loading ? 'Caricamento...' : 'Accedi'}</span>
                            <span>→</span>
                        </button>
                    </form>
                )}

                {/* SIGNUP FORM */}
                {tab === 'signup' && (
                    <form className="auth-form" onSubmit={handleSignup}>
                        <div className="auth-fields-row">
                            <div className="auth-field">
                                <label htmlFor="signupName">👤 Nome</label>
                                <input
                                    type="text" id="signupName" className="auth-input"
                                    placeholder="Il tuo nome"
                                    value={signupName} onChange={e => setSignupName(e.target.value)}
                                />
                            </div>
                            <div className="auth-field">
                                <label htmlFor="signupSurname">👤 Cognome</label>
                                <input
                                    type="text" id="signupSurname" className="auth-input"
                                    placeholder="Il tuo cognome"
                                    value={signupSurname} onChange={e => setSignupSurname(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="auth-fields-row">
                            <div className="auth-field">
                                <label htmlFor="signupAge">🎂 Età</label>
                                <input
                                    type="number" id="signupAge" className="auth-input"
                                    placeholder="16" min="10" max="99"
                                    value={signupAge} onChange={e => setSignupAge(e.target.value)}
                                />
                            </div>
                            <div className="auth-field">
                                <label htmlFor="signupUsername">🏷️ Username</label>
                                <input
                                    type="text" id="signupUsername" className="auth-input"
                                    placeholder="il-tuo-username"
                                    value={signupUsername} onChange={e => setSignupUsername(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="auth-field">
                            <label htmlFor="signupEmail">📧 Email</label>
                            <input
                                type="email" id="signupEmail" className="auth-input"
                                placeholder="la-tua-email@esempio.com"
                                value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </div>
                        <div className="auth-field">
                            <label htmlFor="signupPassword">🔒 Password</label>
                            <input
                                type="password" id="signupPassword" className="auth-input"
                                placeholder="Almeno 6 caratteri"
                                value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            <span>{loading ? 'Creazione...' : 'Crea Account'}</span>
                            <span>→</span>
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
