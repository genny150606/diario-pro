import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'
import { Settings, User, Moon, Sun, Palette, BookOpen, Download, Upload, Trash2, AlertTriangle, Plus, X, Shield, Info, Database, GraduationCap, Zap, Flame, LogOut, Camera } from 'lucide-react'

export default function SettingsSection() {
    const navigate = useNavigate()
    const { user, signOut, updatePassword } = useAuth()
    const { data, saveData } = useData()
    const { addToast } = useToast()
    const [gdprLoading, setGdprLoading] = useState(false)
    const [schoolType, setSchoolType] = useState(() => localStorage.getItem('schoolType') || 'liceo')
    const [newPassword, setNewPassword] = useState('')
    const [passwordMsg, setPasswordMsg] = useState('')
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
    const [deleteConfirm, setDeleteConfirm] = useState('')
    const [newSubject, setNewSubject] = useState('')
    const importRef = useRef(null)
    const photoRef = useRef(null)
    const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem('profilePhoto') || null)

    // Sync profile photo from cloud data when it loads
    useEffect(() => {
        if (data.profilePhoto && data.profilePhoto !== profilePhoto) {
            setProfilePhoto(data.profilePhoto)
            localStorage.setItem('profilePhoto', data.profilePhoto)
        }
    }, [data.profilePhoto])

    // Custom subjects
    const [customSubjects, setCustomSubjects] = useState(() => {
        try { return JSON.parse(localStorage.getItem('customSubjects') || '[]') }
        catch { return [] }
    })

    const handleSchoolChange = (type) => {
        setSchoolType(type)
        localStorage.setItem('schoolType', type)
    }

    const handleThemeToggle = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
        localStorage.setItem('theme', newTheme)
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

    const handleAddSubject = () => {
        if (!newSubject.trim() || customSubjects.includes(newSubject.trim())) return
        const updated = [...customSubjects, newSubject.trim()]
        setCustomSubjects(updated)
        localStorage.setItem('customSubjects', JSON.stringify(updated))
        setNewSubject('')
    }

    const handleRemoveSubject = (s) => {
        const updated = customSubjects.filter(sub => sub !== s)
        setCustomSubjects(updated)
        localStorage.setItem('customSubjects', JSON.stringify(updated))
    }

    const handleExportData = () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `studyjournal-backup-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleImportData = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const imported = JSON.parse(evt.target.result)
                if (imported && typeof imported === 'object') {
                    if (window.confirm('⚠️ Questo sovrascriverà i tuoi dati attuali. Continuare?')) {
                        saveData(imported)
                        addToast('✅ Dati importati con successo!', 'success')
                    }
                }
            } catch {
                addToast('❌ File JSON non valido', 'error')
            }
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    const handleResetData = () => {
        if (deleteConfirm !== 'ELIMINA') return
        const DEFAULT = { notes: [], tasks: [], grades: [], flashcards: [], diaryEntries: [], pomodoroSessions: [], presences: [], uniExams: [], uniGrades: [], counters: {}, stats: { totalHours: 0, totalSessions: 0, xp: 0, level: 1, unlockedFeatures: [] } }
        saveData(DEFAULT)
        setDeleteConfirm('')
        addToast('✅ Tutti i dati sono stati eliminati.', 'success')
    }

    // ── GDPR: Export All Data ──
    const handleGdprExport = async () => {
        try {
            setGdprLoading(true)
            const exportData = {
                exported_at: new Date().toISOString(),
                user_id: user.id,
                email: user.email,
                data: data
            }
            const jsonString = JSON.stringify(exportData, null, 2)
            const blob = new Blob([jsonString], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `diario-pro-${user.id}-${new Date().toISOString().split('T')[0]}.json`
            link.click()
            URL.revokeObjectURL(url)
            addToast('✅ Dati esportati con successo!', 'success')
        } catch (err) {
            console.error('GDPR Export failed:', err)
            addToast('❌ Errore durante l\'esportazione: ' + err.message, 'error')
        } finally {
            setGdprLoading(false)
        }
    }

    // ── GDPR: Delete Account ──
    const handleDeleteAccount = async () => {
        const confirmed = window.confirm(
            'ATTENZIONE: Questa azione è IRREVERSIBILE.\nEliminerà TUTTI i tuoi dati e il tuo account.\nSei sicuro di voler procedere?'
        )
        if (!confirmed) return

        try {
            setGdprLoading(true)
            const { error: deleteError } = await supabase
                .from('users_data')
                .delete()
                .eq('id', user.id)

            if (deleteError) throw deleteError

            localStorage.removeItem(`sj_data_${user.id}`)
            localStorage.removeItem('profilePhoto')
            await signOut()
            navigate('/')
            alert('Account eliminato permanentemente. Ci dispiace vederti andare via 😢')
        } catch (err) {
            console.error('Account delete failed:', err)
            alert('Errore durante l\'eliminazione: ' + err.message)
            setGdprLoading(false)
        }
    }

    // Storage stats
    const storageStats = useMemo(() => {
        const items = [
            { label: 'Note', count: data.notes?.length || 0, icon: '📝' },
            { label: 'Flashcard', count: data.flashcards?.length || 0, icon: '🃏' },
            { label: 'Compiti', count: data.tasks?.length || 0, icon: '✅' },
            { label: 'Voti', count: data.grades?.length || 0, icon: '📊' },
            { label: 'Sessioni Pomodoro', count: data.pomodoroSessions?.length || 0, icon: '🍅' },
            { label: 'Voci Diario', count: data.diaryEntries?.length || 0, icon: '📖' },
        ]
        const totalItems = items.reduce((sum, i) => sum + i.count, 0)
        const dataSize = new Blob([JSON.stringify(data)]).size
        return { items, totalItems, dataSize }
    }, [data])

    const formatBytes = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const handlePhotoUpload = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) { addToast('Seleziona un\'immagine valida', 'warning'); return }

        const reader = new FileReader()
        reader.onload = (evt) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const size = 200
                canvas.width = size
                canvas.height = size
                const ctx = canvas.getContext('2d')
                const min = Math.min(img.width, img.height)
                const sx = (img.width - min) / 2
                const sy = (img.height - min) / 2
                ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
                const base64 = canvas.toDataURL('image/jpeg', 0.6)
                setProfilePhoto(base64)
                localStorage.setItem('profilePhoto', base64)
                // Sync to Supabase so all users can see it
                saveData({ ...data, profilePhoto: base64 })
            }
            img.src = evt.target.result
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const handleRemovePhoto = (e) => {
        e.stopPropagation()
        setProfilePhoto(null)
        localStorage.removeItem('profilePhoto')
        // Remove from Supabase too
        const { profilePhoto: _, ...rest } = data
        saveData(rest)
    }

    const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : '??'

    return (
        <section className="section active reveal-entrance">
            <div className="hero">
                <h1><span className="gradient-text">Impostazioni</span> <Settings size={32} className="inline-icon hero-icon-floating" /></h1>
                <p>Personalizza la tua esperienza di studio</p>
            </div>

            {/* ── PROFILE CARD ── */}
            <div className="settings-profile-card card glass-card hover-glow">
                <div className="settings-avatar-wrapper" onClick={() => photoRef.current?.click()}>
                    <div className="settings-avatar">
                        {profilePhoto ? (
                            <img src={profilePhoto} alt="Profilo" className="avatar-photo" />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </div>
                    <div className="avatar-overlay">
                        <Camera size={20} />
                        <span>Cambia</span>
                    </div>
                    {profilePhoto && (
                        <button className="avatar-remove-btn" onClick={handleRemovePhoto} title="Rimuovi foto">
                            <X size={14} />
                        </button>
                    )}
                    <input type="file" ref={photoRef} accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                </div>
                <div className="settings-profile-info">
                    <h3>{user?.email || 'Utente'}</h3>
                    <div className="settings-profile-stats">
                        <div className="sps-item"><Zap size={14} /> <span>{data.stats?.xp || 0} XP</span></div>
                        <div className="sps-item"><GraduationCap size={14} /> <span>Lv. {data.stats?.level || 1}</span></div>
                        <div className="sps-item"><Flame size={14} /> <span>{data.stats?.currentStreak || 0}🔥</span></div>
                    </div>
                </div>
            </div>

            {/* ── THEME TOGGLE ── */}
            <div className="settings-group">
                <div className="settings-group-header">
                    <span className="settings-group-icon"><Palette size={20} /></span>
                    <div>
                        <h3 className="settings-group-title">Tema dell'App</h3>
                        <p className="settings-group-desc">Scegli tra tema chiaro e scuro</p>
                    </div>
                </div>
                <div className="theme-toggle-row" onClick={handleThemeToggle}>
                    <div className={`theme-toggle-track ${theme}`}>
                        <div className="theme-toggle-thumb">
                            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                        </div>
                    </div>
                    <span className="theme-label">{theme === 'dark' ? 'Tema Scuro' : 'Tema Chiaro'}</span>
                </div>
            </div>

            {/* ── SCHOOL TYPE ── */}
            <div className="settings-group">
                <div className="settings-group-header">
                    <span className="settings-group-icon">🎓</span>
                    <div>
                        <h3 className="settings-group-title">Tipo di Scuola</h3>
                        <p className="settings-group-desc">Seleziona il tuo percorso di studi</p>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {[
                        { value: 'liceo', icon: '🏫', label: 'Liceo', desc: 'Scuola superiore' },
                        { value: 'università', icon: '🎓', label: 'Università', desc: 'Percorso universitario' }
                    ].map(opt => (
                        <div
                            key={opt.value}
                            onClick={() => handleSchoolChange(opt.value)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                padding: '1.5rem', borderRadius: '1.5rem', cursor: 'pointer',
                                background: schoolType === opt.value ? 'rgba(91, 159, 243, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                border: schoolType === opt.value ? '2px solid var(--color-accent)' : '2px solid var(--glass-border)',
                                boxShadow: schoolType === opt.value ? '0 0 25px rgba(91, 159, 243, 0.15)' : 'none',
                                transition: 'all 0.3s ease',
                                position: 'relative', zIndex: 1
                            }}
                        >
                            <span style={{ fontSize: '2rem' }}>{opt.icon}</span>
                            <div>
                                <strong style={{ display: 'block', color: 'var(--color-text)', fontSize: '1rem' }}>{opt.label}</strong>
                                <small style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>{opt.desc}</small>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── CUSTOM SUBJECTS ── */}
            <div className="settings-group">
                <div className="settings-group-header">
                    <span className="settings-group-icon"><BookOpen size={20} /></span>
                    <div>
                        <h3 className="settings-group-title">Materie Personalizzate</h3>
                        <p className="settings-group-desc">Aggiungi le tue materie per note e flashcard</p>
                    </div>
                </div>
                <div className="subjects-manager">
                    <div className="subjects-chips">
                        {['Generale', 'Matematica', 'Italiano', 'Inglese', 'Scienze', 'Storia'].map(s => (
                            <span key={s} className="subject-chip default">{s}</span>
                        ))}
                        {customSubjects.map(s => (
                            <span key={s} className="subject-chip custom">
                                {s}
                                <button onClick={() => handleRemoveSubject(s)}><X size={12} /></button>
                            </span>
                        ))}
                    </div>
                    <div className="add-subject-row">
                        <input
                            type="text"
                            placeholder="Nuova materia..."
                            value={newSubject}
                            onChange={e => setNewSubject(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                        />
                        <button className="btn-add-subject" onClick={handleAddSubject} disabled={!newSubject.trim()}>
                            <Plus size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── STORAGE STATS ── */}
            <div className="settings-group">
                <div className="settings-group-header">
                    <span className="settings-group-icon"><Database size={20} /></span>
                    <div>
                        <h3 className="settings-group-title">Utilizzo Dati</h3>
                        <p className="settings-group-desc">{storageStats.totalItems} elementi • {formatBytes(storageStats.dataSize)}</p>
                    </div>
                </div>
                <div className="storage-grid">
                    {storageStats.items.map(item => (
                        <div key={item.label} className="storage-item">
                            <span className="storage-icon">{item.icon}</span>
                            <span className="storage-label">{item.label}</span>
                            <span className="storage-count">{item.count}</span>
                        </div>
                    ))}
                </div>
                <div className="storage-bar-container">
                    <div className="storage-bar-fill" style={{ width: `${Math.min(100, (storageStats.dataSize / (5 * 1024 * 1024)) * 100)}%` }}></div>
                </div>
                <p className="storage-hint">{formatBytes(storageStats.dataSize)} / 5 MB usati</p>
            </div>

            {/* ── EXPORT/IMPORT ── */}
            <div className="settings-group">
                <div className="settings-group-header">
                    <span className="settings-group-icon"><Shield size={20} /></span>
                    <div>
                        <h3 className="settings-group-title">Backup & Ripristino</h3>
                        <p className="settings-group-desc">Esporta o importa i tuoi dati</p>
                    </div>
                </div>
                <div className="backup-actions">
                    <button className="btn-primary" onClick={handleExportData}>
                        <Download size={18} /> Esporta Backup (JSON)
                    </button>
                    <button className="btn-secondary" onClick={() => importRef.current?.click()}>
                        <Upload size={18} /> Importa da File
                    </button>
                    <input type="file" ref={importRef} accept=".json" style={{ display: 'none' }} onChange={handleImportData} />
                </div>
            </div>

            {/* ── PASSWORD ── */}
            <div className="settings-group">
                <div className="settings-group-header">
                    <span className="settings-group-icon">🔒</span>
                    <div>
                        <h3 className="settings-group-title">Sicurezza</h3>
                        <p className="settings-group-desc">Cambia la tua password</p>
                    </div>
                </div>
                <div className="password-section">
                    <input type="password" placeholder="Nuova password (min. 6 caratteri)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <button className="btn-secondary" onClick={handlePasswordChange} disabled={!newPassword} style={{ width: '100%' }}>Aggiorna Password</button>
                    {passwordMsg && <p className="password-msg">{passwordMsg}</p>}
                </div>
            </div>

            {/* ── GDPR COMPLIANCE ── */}
            <div className="settings-group">
                <div className="settings-group-header">
                    <span className="settings-group-icon">⚖️</span>
                    <div>
                        <h3 className="settings-group-title">Privacy & Dati Personali (GDPR)</h3>
                        <p className="settings-group-desc">Controlli per i tuoi dati personali</p>
                    </div>
                </div>
                <div className="gdpr-controls">
                    <button
                        className="btn-secondary"
                        onClick={handleGdprExport}
                        disabled={gdprLoading}
                        style={{ width: '100%', marginBottom: '1rem' }}
                    >
                        <Download size={18} /> 📥 Scarica i miei dati (GDPR Art. 20)
                    </button>
                    <button
                        className="btn-danger-full"
                        onClick={handleDeleteAccount}
                        disabled={gdprLoading}
                        style={{ width: '100%' }}
                    >
                        <Trash2 size={18} /> 🗑️ Elimina account e tutti i dati
                    </button>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '1rem', lineHeight: 1.5 }}>
                        ⚠️ L'eliminazione è PERMANENTE e non può essere annullata.
                        I tuoi dati verranno cancellati da tutti i server entro 30 giorni.
                    </p>
                </div>
            </div>

            {/* ── DANGER ZONE ── */}
            <div className="settings-group settings-danger">
                <div className="settings-group-header">
                    <span className="settings-group-icon"><AlertTriangle size={20} /></span>
                    <div>
                        <h3 className="settings-group-title">Zona Pericolosa</h3>
                        <p className="settings-group-desc">Azioni irreversibili. Procedi con cautela.</p>
                    </div>
                </div>
                <div className="danger-actions">
                    <p className="danger-instruction">Scrivi <strong>ELIMINA</strong> per confermare la cancellazione di tutti i dati.</p>
                    <input
                        type="text"
                        placeholder='Scrivi "ELIMINA" per confermare'
                        value={deleteConfirm}
                        onChange={e => setDeleteConfirm(e.target.value)}
                        className="danger-input"
                    />
                    <button className="btn-danger-full" disabled={deleteConfirm !== 'ELIMINA'} onClick={handleResetData}>
                        <Trash2 size={18} /> Cancella tutti i dati
                    </button>
                </div>
            </div>

            {/* ── APP INFO ── */}
            <div className="settings-group settings-info">
                <div className="settings-group-header">
                    <span className="settings-group-icon"><Info size={20} /></span>
                    <div>
                        <h3 className="settings-group-title">Info App</h3>
                        <p className="settings-group-desc">StudyJournal Pro — v2.0</p>
                    </div>
                </div>
                <div className="app-info-grid">
                    <div className="app-info-item">
                        <span className="info-label">Versione</span>
                        <span className="info-value">2.0.0</span>
                    </div>
                    <div className="app-info-item">
                        <span className="info-label">Motore AI</span>
                        <span className="info-value">Gemini 2.0 Flash</span>
                    </div>
                    <div className="app-info-item">
                        <span className="info-label">Cloud</span>
                        <span className="info-value">Supabase</span>
                    </div>
                </div>
            </div>

            {/* ── LOGOUT ── */}
            <button className="btn-logout" onClick={signOut}>
                <LogOut size={18} /> Esci dall'account
            </button>
        </section>
    )
}
