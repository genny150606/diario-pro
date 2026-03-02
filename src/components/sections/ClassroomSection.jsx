import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../contexts/ToastContext'
import {
    GraduationCap, Plus, Users, Trophy, BookOpen,
    ArrowLeft, Copy, Check, Zap, FileText,
    LogIn, Clock, Share2, Trash2, Crown
} from 'lucide-react'
import '../../styles/classroom.css'

// ============================================
// Leaderboard (Top 3)
// ============================================

function LeaderboardTab({ members }) {
    const [leaderboard, setLeaderboard] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchXP = async () => {
            if (!members.length) { setLoading(false); return }

            const userIds = members.map(m => m.user_id)
            const { data } = await supabase
                .from('users_data')
                .select('id, data')
                .in('id', userIds)

            if (data) {
                const scored = data.map(u => {
                    const userData = typeof u.data === 'string' ? JSON.parse(u.data) : u.data
                    const member = members.find(m => m.user_id === u.id)
                    return {
                        user_id: u.id,
                        email: member?.email || u.id.substring(0, 8),
                        xp: userData?.stats?.xp || 0,
                        level: userData?.stats?.level || 1
                    }
                }).sort((a, b) => b.xp - a.xp).slice(0, 3)
                setLeaderboard(scored)
            }
            setLoading(false)
        }
        fetchXP()
    }, [members])

    if (loading) return <div className="leaderboard-empty">Caricamento classifica...</div>
    if (!leaderboard.length) return <div className="leaderboard-empty">Nessun dato disponibile</div>

    const medals = ['🥇', '🥈', '🥉']
    const classes = ['gold', 'silver', 'bronze']

    return (
        <div className="leaderboard-section">
            <div className="podium-grid">
                {leaderboard.map((user, i) => (
                    <div key={user.user_id} className={`podium-item ${classes[i]}`}>
                        <span className="podium-medal">{medals[i]}</span>
                        <div className="podium-avatar">
                            {user.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="podium-name">{user.email}</span>
                        <span className="podium-xp">{user.xp} XP • Lv.{user.level}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ============================================
// Resources Tab
// ============================================

function ResourcesTab({ classroomId, userId }) {
    const { data: userData } = useData()
    const { addToast } = useToast()
    const [resources, setResources] = useState([])
    const [showShareModal, setShowShareModal] = useState(false)
    const [loading, setLoading] = useState(true)

    const fetchResources = useCallback(async () => {
        const { data } = await supabase
            .from('classroom_shared_resources')
            .select('*')
            .eq('classroom_id', classroomId)
            .order('created_at', { ascending: false })

        setResources(data || [])
        setLoading(false)
    }, [classroomId])

    useEffect(() => {
        fetchResources()

        const channel = supabase
            .channel(`classroom-resources-${classroomId}`)
            .on('postgres_changes', {
                event: '*', schema: 'public',
                table: 'classroom_shared_resources',
                filter: `classroom_id=eq.${classroomId}`
            }, () => fetchResources())
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [fetchResources, classroomId])

    const handleShare = async (type, item) => {
        try {
            let title, content
            if (type === 'note') {
                title = item.title || 'Nota senza titolo'
                content = { text: item.content || '', title: item.title }
            } else {
                title = `Flashcard: ${item.front?.substring(0, 40) || 'Set'}`
                content = { front: item.front, back: item.back }
            }

            console.log('[CLASSROOM] Sharing resource:', { type, title, classroomId, userId })

            const { error: insertErr } = await supabase.from('classroom_shared_resources').insert({
                classroom_id: classroomId,
                user_id: userId,
                type,
                title,
                content
            })

            if (insertErr) {
                console.error('[CLASSROOM] Share error:', insertErr)
                addToast('Errore nella condivisione: ' + insertErr.message, 'error')
                return
            }

            console.log('[CLASSROOM] Resource shared successfully!')
            await fetchResources()
            setShowShareModal(false)
        } catch (err) {
            console.error('[CLASSROOM] Share exception:', err)
            addToast('Errore: ' + err.message, 'error')
        }
    }

    const handleDelete = async (id) => {
        await supabase.from('classroom_shared_resources').delete().eq('id', id)
    }

    return (
        <div>
            <div className="resources-header">
                <h3>Risorse Condivise ({resources.length})</h3>
                <button className="btn-share-resource" onClick={() => setShowShareModal(true)}>
                    <Share2 size={13} /> Condividi
                </button>
            </div>

            {loading ? (
                <div className="resources-empty">Caricamento...</div>
            ) : resources.length === 0 ? (
                <div className="resources-empty">
                    Nessuna risorsa condivisa. Condividi le tue note o flashcard!
                </div>
            ) : (
                <div className="resources-list">
                    {resources.map(r => (
                        <div key={r.id} className="resource-item">
                            <div className={`resource-icon ${r.type}`}>
                                {r.type === 'note' ? <FileText size={18} /> : <Zap size={18} />}
                            </div>
                            <div className="resource-info">
                                <div className="resource-title">{r.title}</div>
                                <div className="resource-meta">
                                    <span className={`resource-type-badge ${r.type}`}>
                                        {r.type === 'note' ? 'Nota' : 'Flashcard'}
                                    </span>
                                    <span>{new Date(r.created_at).toLocaleDateString('it-IT')}</span>
                                </div>
                            </div>
                            {r.user_id === userId && (
                                <button
                                    onClick={() => handleDelete(r.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '0.3rem' }}
                                    title="Elimina"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showShareModal && (
                <ShareModal
                    notes={userData.notes || []}
                    flashcards={userData.flashcards || []}
                    onShare={handleShare}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </div>
    )
}

// ============================================
// Share Modal
// ============================================

function ShareModal({ notes, flashcards, onShare, onClose }) {
    const [tab, setTab] = useState('note')

    const items = tab === 'note' ? notes : flashcards

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3><Share2 size={18} /> Condividi Risorsa</h3>

                <div className="share-modal-tabs">
                    <button className={`share-modal-tab ${tab === 'note' ? 'active' : ''}`} onClick={() => setTab('note')}>
                        <FileText size={13} /> Note ({notes.length})
                    </button>
                    <button className={`share-modal-tab ${tab === 'flashcards' ? 'active' : ''}`} onClick={() => setTab('flashcards')}>
                        <Zap size={13} /> Flashcard ({flashcards.length})
                    </button>
                </div>

                <div className="share-items-list">
                    {items.length === 0 ? (
                        <div className="resources-empty" style={{ padding: '1.5rem' }}>
                            Nessun {tab === 'note' ? 'nota' : 'flashcard'} da condividere
                        </div>
                    ) : (
                        items.map((item, i) => (
                            <button
                                key={item.id || i}
                                className="share-item"
                                onClick={() => onShare(tab, item)}
                            >
                                {tab === 'note'
                                    ? (item.title || 'Nota senza titolo')
                                    : (item.front?.substring(0, 60) || `Flashcard ${i + 1}`)
                                }
                            </button>
                        ))
                    )}
                </div>

                <div className="modal-actions" style={{ marginTop: '1rem' }}>
                    <button className="modal-btn-cancel" onClick={onClose}>Chiudi</button>
                </div>
            </div>
        </div>
    )
}

// ============================================
// Members Tab
// ============================================

function MembersTab({ members }) {
    return (
        <div className="members-list">
            {members.map(m => (
                <div key={m.user_id} className="member-item">
                    <div className="member-avatar">
                        {(m.email || m.user_id).charAt(0).toUpperCase()}
                    </div>
                    <span className="member-name">{m.email || m.user_id.substring(0, 8)}</span>
                    <span className={`member-role-badge ${m.role}`}>
                        {m.role === 'admin' ? <><Crown size={10} /> Admin</> : 'Membro'}
                    </span>
                </div>
            ))}
        </div>
    )
}

// ============================================
// Classroom View (inside a class)
// ============================================

function ClassroomView({ classroom, onBack, userId }) {
    const [tab, setTab] = useState('resources')
    const [members, setMembers] = useState([])
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const fetchMembers = async () => {
            const { data } = await supabase
                .from('classroom_members')
                .select('*')
                .eq('classroom_id', classroom.id)

            if (data) {
                // Fetch emails for display
                const userIds = data.map(m => m.user_id)
                const { data: usersData } = await supabase
                    .from('users_data')
                    .select('id')
                    .in('id', userIds)

                const enriched = data.map(m => {
                    // Try to get email from auth — we just show user_id prefix for now
                    return { ...m, email: m.user_id.substring(0, 8) }
                })
                setMembers(enriched)
            }
        }
        fetchMembers()
    }, [classroom.id])

    const copyCode = () => {
        navigator.clipboard.writeText(classroom.code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="classroom-view">
            <div className="classroom-view-header">
                <h2><GraduationCap size={20} /> {classroom.name}</h2>
                <button className="btn-back-classroom" onClick={onBack}>
                    <ArrowLeft size={14} /> Torna alla Lista
                </button>
            </div>

            <div className="classroom-code-display">
                Codice Classe: <span onClick={copyCode} title="Clicca per copiare">
                    {copied ? <><Check size={12} /> Copiato!</> : classroom.code}
                </span>
            </div>

            <div className="classroom-tabs">
                <button className={`classroom-tab ${tab === 'resources' ? 'active' : ''}`} onClick={() => setTab('resources')}>
                    <BookOpen size={14} /> Risorse
                </button>
                <button className={`classroom-tab ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>
                    <Trophy size={14} /> Classifica
                </button>
                <button className={`classroom-tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
                    <Users size={14} /> Membri ({members.length})
                </button>
            </div>

            {tab === 'resources' && <ResourcesTab classroomId={classroom.id} userId={userId} />}
            {tab === 'leaderboard' && <LeaderboardTab members={members} />}
            {tab === 'members' && <MembersTab members={members} />}
        </div>
    )
}

// ============================================
// Create Classroom Modal
// ============================================

function CreateClassroomModal({ onClose, onCreate }) {
    const [name, setName] = useState('')
    const [desc, setDesc] = useState('')
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        if (!name.trim()) return
        setLoading(true)
        await onCreate(name.trim(), desc.trim())
        setLoading(false)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3><Plus size={18} /> Crea Classroom</h3>
                <input
                    className="modal-input"
                    type="text"
                    placeholder="Nome della classe..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                    maxLength={40}
                />
                <input
                    className="modal-input"
                    type="text"
                    placeholder="Descrizione (opzionale)..."
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    maxLength={100}
                />
                <div className="modal-actions">
                    <button className="modal-btn-cancel" onClick={onClose}>Annulla</button>
                    <button
                        className="modal-btn-confirm"
                        onClick={handleCreate}
                        disabled={!name.trim() || loading}
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
                    >
                        {loading ? 'Creazione...' : 'Crea Classe'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ============================================
// Join Classroom Modal
// ============================================

function JoinClassroomModal({ onClose, onJoin }) {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleJoin = async () => {
        if (!code.trim()) return
        setLoading(true)
        setError(null)
        const result = await onJoin(code.trim().toUpperCase())
        if (result?.error) setError(result.error)
        setLoading(false)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3><LogIn size={18} /> Unisciti con Codice</h3>
                <input
                    className="modal-input"
                    type="text"
                    placeholder="Inserisci codice classe (es. A3F2B1)..."
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    autoFocus
                    maxLength={6}
                    style={{ fontFamily: 'monospace', letterSpacing: '3px', fontSize: '1.1rem', textAlign: 'center' }}
                />
                {error && (
                    <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginBottom: '0.8rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}
                <div className="modal-actions">
                    <button className="modal-btn-cancel" onClick={onClose}>Annulla</button>
                    <button
                        className="modal-btn-confirm"
                        onClick={handleJoin}
                        disabled={code.trim().length < 6 || loading}
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
                    >
                        {loading ? 'Ricerca...' : 'Unisciti'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ============================================
// Main Component
// ============================================

export default function ClassroomSection() {
    const { user } = useAuth()
    const [classrooms, setClassrooms] = useState([])
    const [memberCounts, setMemberCounts] = useState({})
    const [activeClassroom, setActiveClassroom] = useState(null)
    const [showCreate, setShowCreate] = useState(false)
    const [showJoin, setShowJoin] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchClassrooms = useCallback(async () => {
        try {
            // Get classrooms the user is a member of
            const { data: memberships } = await supabase
                .from('classroom_members')
                .select('classroom_id')
                .eq('user_id', user.id)

            if (!memberships?.length) {
                setClassrooms([])
                setLoading(false)
                return
            }

            const classroomIds = memberships.map(m => m.classroom_id)
            const { data: rooms } = await supabase
                .from('classrooms')
                .select('*')
                .in('id', classroomIds)
                .order('created_at', { ascending: false })

            setClassrooms(rooms || [])

            // Count members per classroom
            const { data: allMembers } = await supabase
                .from('classroom_members')
                .select('classroom_id')
                .in('classroom_id', classroomIds)

            if (allMembers) {
                const counts = {}
                allMembers.forEach(m => { counts[m.classroom_id] = (counts[m.classroom_id] || 0) + 1 })
                setMemberCounts(counts)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [user.id])

    useEffect(() => {
        fetchClassrooms()

        const channel = supabase
            .channel('classrooms-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'classrooms' }, () => fetchClassrooms())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_members' }, () => fetchClassrooms())
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [fetchClassrooms])

    const handleCreate = async (name, description) => {
        try {
            const { data, error: createErr } = await supabase
                .from('classrooms')
                .insert({ name, description, creator_id: user.id })
                .select()
                .single()

            if (createErr) throw createErr

            // Auto-join as admin
            await supabase.from('classroom_members').insert({
                classroom_id: data.id,
                user_id: user.id,
                role: 'admin'
            })

            setShowCreate(false)
            setActiveClassroom(data)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleJoin = async (code) => {
        try {
            const { data: classroom, error: findErr } = await supabase
                .from('classrooms')
                .select('*')
                .eq('code', code)
                .single()

            if (findErr || !classroom) return { error: 'Classe non trovata. Controlla il codice.' }

            // Check if already a member
            const { data: existing } = await supabase
                .from('classroom_members')
                .select('user_id')
                .eq('classroom_id', classroom.id)
                .eq('user_id', user.id)
                .maybeSingle()

            if (existing) return { error: 'Sei già membro di questa classe!' }

            await supabase.from('classroom_members').insert({
                classroom_id: classroom.id,
                user_id: user.id,
                role: 'member'
            })

            setShowJoin(false)
            setActiveClassroom(classroom)
            fetchClassrooms()
            return {}
        } catch (err) {
            return { error: err.message }
        }
    }

    // Inside a classroom
    if (activeClassroom) {
        return (
            <ClassroomView
                classroom={activeClassroom}
                onBack={() => { setActiveClassroom(null); fetchClassrooms() }}
                userId={user.id}
            />
        )
    }

    // Classroom list
    return (
        <div className="classroom-container">
            <div className="classroom-header">
                <h2><GraduationCap size={22} /> Le Mie Classi</h2>
                <div className="classroom-actions">
                    <button className="btn-classroom-action secondary" onClick={() => setShowJoin(true)}>
                        <LogIn size={14} /> Unisciti
                    </button>
                    <button className="btn-classroom-action primary" onClick={() => setShowCreate(true)}>
                        <Plus size={14} /> Crea Classe
                    </button>
                </div>
            </div>

            {error && <div className="room-error">{error}</div>}

            {loading ? (
                <div className="classroom-empty">
                    <Clock size={40} />
                    <h3>Caricamento...</h3>
                </div>
            ) : classrooms.length === 0 ? (
                <div className="classroom-empty">
                    <GraduationCap size={48} />
                    <h3>Nessuna classe</h3>
                    <p>Crea una classe o unisciti con un codice per iniziare!</p>
                </div>
            ) : (
                <div className="classrooms-grid">
                    {classrooms.map(c => (
                        <div key={c.id} className="classroom-card" onClick={() => setActiveClassroom(c)}>
                            <div className="classroom-card-name">{c.name}</div>
                            {c.description && <div className="classroom-card-desc">{c.description}</div>}
                            <div className="classroom-card-footer">
                                <span className="classroom-card-code">{c.code}</span>
                                <span className="classroom-card-members">
                                    <Users size={12} /> {memberCounts[c.id] || 0} membri
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && <CreateClassroomModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
            {showJoin && <JoinClassroomModal onClose={() => setShowJoin(false)} onJoin={handleJoin} />}
        </div>
    )
}
