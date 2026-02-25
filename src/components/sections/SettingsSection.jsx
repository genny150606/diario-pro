import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'

export default function SettingsSection() {
    const { user, signOut, updatePassword } = useAuth()
    const { data, saveData } = useData()
    const [schoolType, setSchoolType] = useState(() => localStorage.getItem('schoolType') || 'liceo')
    const [newPassword, setNewPassword] = useState('')
    const [passwordMsg, setPasswordMsg] = useState('')

    const handleSchoolChange = (type) => {
        setSchoolType(type)
        localStorage.setItem('schoolType', type)
    }

    const handlePasswordChange = async () => {
        if (newPassword.length < 6) {
            setPasswordMsg('❌ La password deve avere almeno 6 caratteri')
            return
        }
        try {
            await updatePassword(newPassword)
            setPasswordMsg('✅ Password aggiornata!')
            setNewPassword('')
        } catch (err) {
            setPasswordMsg(`❌ Errore: ${err.message}`)
        }
    }

    const handleResetData = () => {
        if (window.confirm('⚠️ Sei sicuro? Questo cancellerà TUTTI i tuoi dati (note, compiti, voti, flashcard). Azione irreversibile!')) {
            const DEFAULT = { notes: [], tasks: [], grades: [], flashcards: [], diaryEntries: [], pomodoroSessions: [], presences: [], uniExams: [], uniGrades: [], counters: {}, stats: { totalHours: 0, totalSessions: 0, xp: 0, level: 1, unlockedFeatures: [] } }
            saveData(DEFAULT)
            alert('✅ Dati resettati')
        }
    }

    return (
        <section className="section active">
            <div className="hero">
                <h1><span className="gradient-text">Impostazioni</span> ⚙️</h1>
                <p>Personalizza la tua esperienza</p>
            </div>

            {/* Account Info */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3>👤 Account</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Email</span>
                    <span style={{ fontWeight: 600 }}>{user?.email || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Note</span>
                    <span style={{ fontWeight: 600 }}>{data.notes.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Flashcard</span>
                    <span style={{ fontWeight: 600 }}>{data.flashcards.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Livello</span>
                    <span style={{ fontWeight: 600 }}>Lv. {data.stats?.level || 1} ({data.stats?.xp || 0} XP)</span>
                </div>
            </div>

            {/* School Type */}
            <div className="settings-group">
                <div className="settings-group-header">
                    <span className="settings-group-icon">🎓</span>
                    <div>
                        <h3 className="settings-group-title">Tipo di Scuola</h3>
                        <p className="settings-group-desc">Seleziona il tuo percorso di studi</p>
                    </div>
                </div>
                <div className="settings-options">
                    <label className="settings-option">
                        <input type="radio" name="school" value="liceo" checked={schoolType === 'liceo'} onChange={() => handleSchoolChange('liceo')} />
                        <span className="settings-option-card">
                            <span className="settings-option-icon">🏫</span>
                            <span className="settings-option-text"><strong>Liceo</strong><small>Scuola superiore</small></span>
                        </span>
                    </label>
                    <label className="settings-option">
                        <input type="radio" name="school" value="università" checked={schoolType === 'università'} onChange={() => handleSchoolChange('università')} />
                        <span className="settings-option-card">
                            <span className="settings-option-icon">🎓</span>
                            <span className="settings-option-text"><strong>Università</strong><small>Percorso universitario</small></span>
                        </span>
                    </label>
                </div>
            </div>

            {/* Password */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3>🔒 Cambia Password</h3>
                <input type="password" placeholder="Nuova password (min. 6 caratteri)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <button className="btn-secondary" onClick={handlePasswordChange} disabled={!newPassword} style={{ width: '100%' }}>Aggiorna Password</button>
                {passwordMsg && <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{passwordMsg}</p>}
            </div>

            {/* Danger Zone */}
            <div className="card" style={{ marginTop: '1.5rem', borderLeft: '3px solid #FF453A' }}>
                <h3 style={{ color: '#FF453A' }}>⚠️ Zona Pericolosa</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    Queste azioni sono irreversibili. Fai attenzione!
                </p>
                <button className="btn-secondary" onClick={handleResetData} style={{ width: '100%', color: '#FF453A', borderColor: '#FF453A' }}>
                    🗑️ Resetta tutti i dati
                </button>
            </div>
        </section>
    )
}
