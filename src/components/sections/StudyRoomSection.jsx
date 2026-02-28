import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
    LiveKitRoom,
    TrackToggle,
    useParticipants,
    useConnectionState,
    useTracks,
    AudioTrack
} from '@livekit/components-react'
import { Track, ConnectionState } from 'livekit-client'
import {
    Headphones, Plus, Users, Timer, Play, Pause,
    RotateCcw, LogOut, MicOff, Coffee, Flame, Clock
} from 'lucide-react'
import '../../styles/study-room.css'

// LiveKit server URL - reads from env or uses placeholder
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://your-project.livekit.cloud'

// ============================================
// Sub-components
// ============================================

function ParticipantsGrid() {
    const participants = useParticipants()

    return (
        <div className="participants-section">
            <h3>Partecipanti ({participants.length})</h3>
            <div className="participants-grid">
                {participants.map((p) => {
                    const isMuted = !p.isMicrophoneEnabled
                    const isSpeaking = p.isSpeaking
                    return (
                        <div
                            key={p.identity}
                            className={`participant-tile ${isSpeaking ? 'speaking' : ''}`}
                        >
                            <div className="participant-avatar">
                                {p.identity?.charAt(0)?.toUpperCase() || '?'}
                                {isMuted && (
                                    <span className="muted-indicator">
                                        <MicOff size={10} color="#fff" />
                                    </span>
                                )}
                            </div>
                            <span className="participant-name">{p.identity || 'Anonimo'}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function AudioRenderer() {
    const tracks = useTracks([Track.Source.Microphone])
    return (
        <>
            {tracks.map((trackRef) => (
                <AudioTrack
                    key={trackRef.participant.sid + '-' + trackRef.publication.trackSid}
                    trackRef={trackRef}
                />
            ))}
        </>
    )
}

function ConnectionBadge() {
    const connectionState = useConnectionState()
    const labels = {
        [ConnectionState.Connected]: { text: 'Connesso', cls: 'connected' },
        [ConnectionState.Connecting]: { text: 'Connessione...', cls: 'connecting' },
        [ConnectionState.Reconnecting]: { text: 'Riconnessione...', cls: 'connecting' },
        [ConnectionState.Disconnected]: { text: 'Disconnesso', cls: 'disconnected' },
    }
    const info = labels[connectionState] || labels[ConnectionState.Disconnected]

    return (
        <div className="connection-status">
            <span className={`connection-dot ${info.cls}`}></span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{info.text}</span>
        </div>
    )
}

function VoiceControls() {
    return (
        <div className="voice-controls">
            <TrackToggle source={Track.Source.Microphone} />
            <ConnectionBadge />
        </div>
    )
}

// ============================================
// Pomodoro Timer (synced via Supabase Realtime)
// ============================================

function PomodoroTimer({ room, isCreator }) {
    const [status, setStatus] = useState(room?.pomodoro_status || 'idle')
    const [timeRemaining, setTimeRemaining] = useState(room?.time_remaining ?? 1500)

    // Subscribe to realtime changes
    useEffect(() => {
        if (!room?.id) return

        const channel = supabase
            .channel(`room-pomodoro-${room.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'study_rooms',
                filter: `id=eq.${room.id}`
            }, (payload) => {
                const updated = payload.new
                setStatus(updated.pomodoro_status)
                setTimeRemaining(updated.time_remaining)
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [room?.id])

    // Local countdown timer
    useEffect(() => {
        if (status !== 'focus' && status !== 'break') return
        if (timeRemaining <= 0) return

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(interval)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [status, timeRemaining])

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    const updatePomodoro = async (newStatus, newTime) => {
        await supabase
            .from('study_rooms')
            .update({ pomodoro_status: newStatus, time_remaining: newTime })
            .eq('id', room.id)
    }

    const handleStart = () => updatePomodoro('focus', 1500)
    const handlePause = () => updatePomodoro('idle', timeRemaining)
    const handleReset = () => updatePomodoro('idle', 1500)
    const handleBreak = () => updatePomodoro('break', 300)

    const statusLabels = {
        idle: 'In Attesa',
        focus: '🔥 Focus',
        break: '☕ Pausa'
    }

    return (
        <div className="pomodoro-panel">
            <h3><Timer size={14} /> Pomodoro Sincronizzato</h3>
            <div className={`pomodoro-timer-display ${status}`}>
                {formatTime(timeRemaining)}
            </div>
            <div className={`pomodoro-status-label ${status}`}>
                {statusLabels[status]}
            </div>

            {isCreator && (
                <div className="pomodoro-controls">
                    {status === 'idle' && (
                        <button className="pomodoro-btn start" onClick={handleStart}>
                            <Play size={14} /> Focus (25 min)
                        </button>
                    )}
                    {status === 'focus' && (
                        <>
                            <button className="pomodoro-btn pause" onClick={handlePause}>
                                <Pause size={14} /> Pausa
                            </button>
                            <button className="pomodoro-btn reset" onClick={handleBreak}>
                                <Coffee size={14} /> Break (5 min)
                            </button>
                        </>
                    )}
                    {status === 'break' && (
                        <button className="pomodoro-btn start" onClick={handleStart}>
                            <Flame size={14} /> Nuovo Focus
                        </button>
                    )}
                    <button className="pomodoro-btn reset" onClick={handleReset}>
                        <RotateCcw size={14} /> Reset
                    </button>
                </div>
            )}

            {!isCreator && (
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>
                    Solo il creatore della stanza può controllare il timer
                </p>
            )}
        </div>
    )
}

// ============================================
// Active Room View (inside a room with LiveKit)
// ============================================

function ActiveRoomView({ room, token, onLeave, userId }) {
    const isCreator = room.creator_id === userId

    return (
        <div className="study-room-active">
            <div className="room-top-bar">
                <div>
                    <h2>
                        <Headphones size={20} />
                        {room.name}
                    </h2>
                    <div style={{ color: 'var(--color-accent)', fontWeight: 800, letterSpacing: '2px', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        CODICE STANZA: {room.id.substring(0, 6).toUpperCase()}
                    </div>
                </div>
                <button className="btn-leave-room" onClick={onLeave}>
                    <LogOut size={14} /> Esci dalla Stanza
                </button>
            </div>

            <LiveKitRoom
                serverUrl={LIVEKIT_URL}
                token={token}
                connect={true}
                audio={true}
                video={false}
                onDisconnected={onLeave}
                style={{ background: 'transparent' }}
            >
                <VoiceControls />
                <AudioRenderer />
                <ParticipantsGrid />
            </LiveKitRoom>

            <PomodoroTimer room={room} isCreator={isCreator} />
        </div>
    )
}

// ============================================
// Create Room Modal
// ============================================

function CreateRoomModal({ onClose, onCreate }) {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        if (!name.trim()) return
        setLoading(true)
        await onCreate(name.trim())
        setLoading(false)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3><Plus size={18} /> Crea Stanza di Studio</h3>
                <input
                    className="modal-input"
                    type="text"
                    placeholder="Nome della stanza..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    autoFocus
                    maxLength={50}
                />
                <div className="modal-actions">
                    <button className="modal-btn-cancel" onClick={onClose}>Annulla</button>
                    <button
                        className="modal-btn-confirm"
                        onClick={handleCreate}
                        disabled={!name.trim() || loading}
                    >
                        {loading ? 'Creazione...' : 'Crea Stanza'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ============================================
// Main Component
// ============================================

export default function StudyRoomSection() {
    const { user } = useAuth()
    const [rooms, setRooms] = useState([])
    const [participantCounts, setParticipantCounts] = useState({})
    const [activeRoom, setActiveRoom] = useState(null)
    const [livekitToken, setLivekitToken] = useState(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [joinCode, setJoinCode] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)

    // Derived short code
    const getShortCode = (id) => id?.substring(0, 6).toUpperCase()

    const handleJoinByCode = () => {
        if (!joinCode.trim()) return
        const targetRoom = rooms.find(r => getShortCode(r.id) === joinCode.trim().toUpperCase() || r.id === joinCode.trim())
        if (targetRoom) {
            joinRoom(targetRoom)
            setJoinCode('')
        } else {
            setError('Codice stanza non valido o stanza inesistente.')
            setTimeout(() => setError(null), 3000)
        }
    }

    // Fetch rooms
    const fetchRooms = useCallback(async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('study_rooms')
                .select('*')
                .order('created_at', { ascending: false })

            if (fetchError) throw fetchError
            setRooms(data || [])

            // Fetch participant counts
            const { data: participants } = await supabase
                .from('study_participants')
                .select('room_id')

            if (participants) {
                const counts = {}
                participants.forEach(p => {
                    counts[p.room_id] = (counts[p.room_id] || 0) + 1
                })
                setParticipantCounts(counts)
            }
        } catch (err) {
            console.error('[STUDY_ROOMS] Fetch error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRooms()

        // Realtime subscription for room list updates
        const channel = supabase
            .channel('study-rooms-list')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'study_rooms'
            }, () => fetchRooms())
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'study_participants'
            }, () => fetchRooms())
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [fetchRooms])

    // Create room
    const handleCreateRoom = async (name) => {
        try {
            const { data, error: createError } = await supabase
                .from('study_rooms')
                .insert({ name, creator_id: user.id })
                .select()
                .single()

            if (createError) throw createError
            setShowCreateModal(false)
            await joinRoom(data)
        } catch (err) {
            console.error('[STUDY_ROOMS] Create error:', err)
            setError(err.message)
        }
    }

    // Join room
    const joinRoom = async (room) => {
        setError(null)
        try {
            // Assicuriamoci che sui dispositivi Mobile/Capacitor l'URL sia assoluto
            const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://studyjournal-pro.vercel.app')
            const participantName = user.email?.split('@')[0] || user.id.substring(0, 8)
            const response = await fetch(`${apiUrl}/api/livekit-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomName: room.id,
                    participantName
                })
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || `Errore ${response.status}`)
            }

            const { token } = await response.json()

            // Add participant to Supabase
            await supabase
                .from('study_participants')
                .upsert({
                    room_id: room.id,
                    user_id: user.id,
                    is_muted: false
                })

            setLivekitToken(token)
            setActiveRoom(room)
        } catch (err) {
            console.error('[STUDY_ROOMS] Join error:', err)
            setError(`Impossibile entrare nella stanza: ${err.message}`)
        }
    }

    // Leave room
    const leaveRoom = async () => {
        if (activeRoom) {
            await supabase
                .from('study_participants')
                .delete()
                .eq('room_id', activeRoom.id)
                .eq('user_id', user.id)
        }
        setActiveRoom(null)
        setLivekitToken(null)
        fetchRooms()
    }

    // Active room view
    if (activeRoom && livekitToken) {
        return (
            <ActiveRoomView
                room={activeRoom}
                token={livekitToken}
                onLeave={leaveRoom}
                userId={user.id}
            />
        )
    }

    // Room list view
    return (
        <div className="study-rooms-container">
            <div className="study-rooms-header">
                <h2><Headphones size={22} /> Stanze di Studio</h2>
                <button className="btn-create-room" onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} /> Crea Stanza
                </button>
            </div>

            <div className="join-by-code-container" style={{ margin: '1rem 0 2rem 0', display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                <input
                    type="text"
                    placeholder="Incolla codice stanza (es. 12E4A9)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                    style={{ flex: 1, padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px' }}
                    maxLength={36}
                />
                <button className="btn-secondary" onClick={handleJoinByCode} disabled={!joinCode.trim()} style={{ padding: '0.8rem 1.5rem', borderRadius: '0.5rem', whiteSpace: 'nowrap' }}>
                    Entra con Codice
                </button>
            </div>

            {error && (
                <div className="room-error">{error}</div>
            )}

            {loading ? (
                <div className="rooms-empty">
                    <Clock size={40} />
                    <h3>Caricamento...</h3>
                </div>
            ) : rooms.length === 0 ? (
                <div className="rooms-empty">
                    <Headphones size={48} />
                    <h3>Nessuna stanza attiva</h3>
                    <p>Crea una stanza di studio per iniziare a collaborare!</p>
                </div>
            ) : (
                <div className="rooms-grid">
                    {rooms.map((room) => (
                        <div key={room.id} className="room-card">
                            <div className="room-card-header">
                                <span className="room-card-name">{room.name}</span>
                                <span className={`room-card-badge ${room.pomodoro_status}`}>
                                    {room.pomodoro_status === 'focus' && <><Flame size={10} /> Focus</>}
                                    {room.pomodoro_status === 'break' && <><Coffee size={10} /> Break</>}
                                    {room.pomodoro_status === 'idle' && 'In attesa'}
                                </span>
                            </div>
                            <div className="room-card-info" style={{ marginTop: '0.5rem', color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '1px' }}>
                                #{getShortCode(room.id)}
                            </div>
                            <div className="room-card-info" style={{ marginTop: '0.5rem' }}>
                                <span><Users size={13} /> {participantCounts[room.id] || 0} / {room.max_participants}</span>
                                <span><Clock size={13} /> {new Date(room.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <button className="room-card-join" onClick={() => joinRoom(room)}>
                                Entra nella Stanza
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <CreateRoomModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateRoom}
                />
            )}
        </div>
    )
}
