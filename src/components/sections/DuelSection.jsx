import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { supabase } from '../../lib/supabase'
import { Swords, Target, Edit3, FileText, Paperclip, Clock, Key, User, Trophy, Play, RotateCcw, ChevronLeft, Sparkles, BookOpen, GraduationCap, Calculator, Globe, History, Atom, Brain, Zap, PlusCircle, X, Bot } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './DuelSection.css'

const DUEL_STATES = {
    LOBBY: 'lobby',
    WAITING: 'waiting',
    COUNTDOWN: 'countdown',
    PLAYING: 'playing',
    FINISHED: 'finished'
}

export default function DuelSection() {
    const { user } = useAuth()
    const { data: appData } = useData()
    const navigate = useNavigate()
    const [state, setState] = useState(DUEL_STATES.LOBBY)

    // Quiz Generation 
    const [sourceType, setSourceType] = useState('subject') // 'subject', 'notes', 'pdf'
    const [subject, setSubject] = useState('Matematica')
    const [selectedNoteId, setSelectedNoteId] = useState('')
    const [pdfText, setPdfText] = useState('')
    const [pdfName, setPdfName] = useState('')

    // Multiplayer State
    const [roomCode, setRoomCode] = useState('')
    const [isHost, setIsHost] = useState(false)
    const [currentRoom, setCurrentRoom] = useState(null)
    const [players, setPlayers] = useState([])
    const [joinCodeInput, setJoinCodeInput] = useState('')
    const [playerName, setPlayerName] = useState('')
    const [questionAmount, setQuestionAmount] = useState(5)

    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [timeLeft, setTimeLeft] = useState(15)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [streak, setStreak] = useState(0)
    const [countdownNumber, setCountdownNumber] = useState(3)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const timerRef = useRef(null)
    const pollIntervalRef = useRef(null)

    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://diario-pro.vercel.app')

    // Initialize player name from auth
    useEffect(() => {
        if (user) {
            const name = user.user_metadata?.username || user.email?.split('@')[0] || 'Guerriero'
            setPlayerName(name)
        }
    }, [user])

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [])

    // Polling logic for room status
    useEffect(() => {
        if (state === DUEL_STATES.WAITING && currentRoom?.id) {
            pollIntervalRef.current = setInterval(pollRoomStatus, 2000)
        } else if (state === DUEL_STATES.PLAYING && currentRoom?.id) {
            pollIntervalRef.current = setInterval(pollPlayersScore, 2000)
        } else {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
            }
        }

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        }
    }, [state, currentRoom])

    const pollRoomStatus = async () => {
        if (!currentRoom?.id) return

        try {
            const { data: room, error: roomErr } = await supabase
                .from('quiz_rooms')
                .select('*')
                .eq('id', currentRoom.id)
                .single()

            if (roomErr) throw roomErr

            const { data: playersList, error: pErr } = await supabase
                .from('quiz_players')
                .select('*')
                .eq('room_id', currentRoom.id)
                .order('created_at', { ascending: true })

            if (pErr) throw pErr

            setPlayers(playersList || [])
            setCurrentRoom(room)
        } catch (err) {
            console.error('[POLL_ERR]', err)
        }
    }

    const pollPlayersScore = async () => {
        if (!currentRoom?.id) return
        try {
            const { data: playersList } = await supabase
                .from('quiz_players')
                .select('username, score, current_question_index')
                .eq('room_id', currentRoom.id)

            if (playersList) setPlayers(playersList)
        } catch (err) {
            console.error('[SCORE_POLL_ERR]', err)
        }
    }

    // --- PDF parsing ---
    const loadPdfJs = async () => {
        if (window.pdfjsLib) return
        return new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
                resolve()
            }
            script.onerror = reject
            document.head.appendChild(script)
        })
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        setPdfName(file.name)
        try {
            if (file.type === 'application/pdf') {
                await loadPdfJs()
                const arrayBuffer = await file.arrayBuffer()
                const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise
                let fullText = ''
                for (let i = 1; i <= pdf.numPages; i++) {
                    if (fullText.length > 15000) break
                    const page = await pdf.getPage(i)
                    const textContent = await page.getTextContent()
                    fullText += textContent.items.map(item => item.str).join(' ') + '\n'
                }
                setPdfText(fullText.substring(0, 15000))
            } else {
                const text = await file.text()
                setPdfText(text.substring(0, 15000))
            }
        } catch (err) {
            setError('Errore nella lettura del file.')
        }
    }

    // CREATE MATCH
    const handleCreateMatch = async () => {
        setLoading(true)
        setError('')
        try {
            let body = { subject: 'Cultura Generale', context: '', amount: questionAmount }
            if (sourceType === 'subject') body.subject = subject
            else if (sourceType === 'notes') {
                const note = appData?.notes?.find(n => n.id.toString() === selectedNoteId.toString())
                if (!note) throw new Error('Seleziona un appunto.')
                body.subject = `Note: ${note.title}`; body.context = note.content
            } else if (sourceType === 'pdf') {
                if (!pdfText.trim()) throw new Error('Carica un file.')
                body.subject = `Document: ${pdfName || 'Manuale'}`; body.context = pdfText
            }

            const response = await fetch(`${apiUrl}/api/generate-duel-quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const responseText = await response.text()
            let responseData = {}
            try {
                responseData = JSON.parse(responseText)
            } catch (e) { }

            if (!response.ok) {
                let errorMsg = responseData.error || responseText || 'Errore generazione quiz AI.'
                if (String(errorMsg).includes('429')) errorMsg = 'Limite richieste superato (Quota API Gemini Esaurita). Riprova più tardi.'
                else errorMsg = `[Dettaglio Errore Server]: ${String(errorMsg)}`
                throw new Error(errorMsg)
            }

            const { quiz } = responseData
            if (!quiz || quiz.length === 0) throw new Error("L'AI non ha generato domande.")

            const code = Math.random().toString(36).substring(2, 6).toUpperCase()
            const { data: room, error: rErr } = await supabase
                .from('quiz_rooms')
                .insert([{ code, subject: body.subject, ai_data: quiz, status: 'waiting' }])
                .select().single()
            if (rErr) throw rErr

            // Add host to players
            await supabase.from('quiz_players').insert([{ room_id: room.id, username: playerName, score: 0, is_ready: true }])

            setQuestions(quiz)
            setRoomCode(code)
            setCurrentRoom(room)
            setIsHost(true)
            setState(DUEL_STATES.WAITING)
            setPlayers([{ username: playerName, is_ready: true, score: 0 }])
        } catch (err) {
            console.error('[CREATE_MATCH_ERR]', err)
            setError(err?.message || err?.error_description || String(err) || 'Errore Sconosciuto')
        } finally {
            setLoading(false)
        }
    }

    // JOIN MATCH
    const handleJoinMatch = async () => {
        if (!joinCodeInput) return setError('Inserisci un codice.')
        setLoading(true)
        setError('')
        try {
            const { data: room, error: rErr } = await supabase
                .from('quiz_rooms')
                .select('*')
                .eq('code', joinCodeInput.toUpperCase().trim())
                .maybeSingle()
            if (rErr) throw rErr
            if (!room) throw new Error('Codice non trovato.')
            if (room.status !== 'waiting') throw new Error('Partita già iniziata o terminata.')

            // Join as player
            const { error: pErr } = await supabase
                .from('quiz_players')
                .insert([{ room_id: room.id, username: playerName, score: 0, is_ready: true }])
            if (pErr) throw pErr

            setQuestions(room.ai_data || [])
            setRoomCode(room.code)
            setCurrentRoom(room)
            setIsHost(false)
            setState(DUEL_STATES.WAITING)
            // React useEffect will start polling on next render
        } catch (err) {
            console.error('[JOIN_MATCH_ERR]', err)
            setError(err?.message || err?.error_description || String(err) || 'Errore Sconosciuto')
        } finally {
            setLoading(false)
        }
    }

    const handleLaunchDuel = async () => {
        if (!isHost || players.length < 2) return
        try {
            await supabase.from('quiz_rooms').update({ status: 'active' }).eq('id', currentRoom.id)
        } catch (err) {
            setError('Errore nell\'avvio della sfida.')
        }
    }

    const startCountdown = () => {
        setState(DUEL_STATES.COUNTDOWN)
        setCountdownNumber(3)
        let count = 3
        const interval = setInterval(() => {
            count--
            setCountdownNumber(count)
            if (count <= 0) {
                clearInterval(interval)
                setState(DUEL_STATES.PLAYING)
                startTimer()
            }
        }, 1000)
    }

    const [strikeClass, setStrikeClass] = useState('')

    // Auto-start countdown when room becomes active (fixes Guest sync)
    useEffect(() => {
        if (state === DUEL_STATES.WAITING && currentRoom?.status === 'active') {
            startCountdown()
        }
    }, [state, currentRoom?.status])

    const startTimer = () => {
        setTimeLeft(15)
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current)
                    handleAnswer(false, -1)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    const handleAnswer = async (isCorrect, index) => {
        clearInterval(timerRef.current)
        setSelectedAnswer(index)

        // Visual Arcade Strike Feedback
        setStrikeClass(isCorrect ? 'strike-correct' : 'strike-wrong')
        setTimeout(() => setStrikeClass(''), 400) // Rimuovi l'animazione dopo 400ms

        let newScore = score
        if (isCorrect) {
            const bonus = Math.max(1, Math.floor(timeLeft / 3))
            const streakBonus = streak >= 3 ? 2 : 1
            newScore += (100 + bonus * 10) * streakBonus
            setScore(newScore)
            setStreak(prev => prev + 1)
        } else {
            setStreak(0)
        }

        // Sync score to DB
        if (currentRoom?.id) {
            supabase.from('quiz_players')
                .update({ score: newScore, current_question_index: currentIndex + 1 })
                .eq('room_id', currentRoom.id)
                .eq('username', playerName)
                .then(() => { })
        }

        setTimeout(() => {
            setSelectedAnswer(null)
            if (currentIndex + 1 >= questions.length) {
                setState(DUEL_STATES.FINISHED)
            } else {
                setCurrentIndex(prev => prev + 1)
                startTimer()
            }
        }, 1200)
    }

    const resetQuiz = () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        if (timerRef.current) clearInterval(timerRef.current)
        setState(DUEL_STATES.LOBBY)
        setQuestions([]); setCurrentIndex(0); setScore(0); setStreak(0); setError(''); setStrikeClass('')
        setRoomCode(''); setCurrentRoom(null); setPlayers([])
    }

    const currentQ = questions[currentIndex]
    const timerPercent = (timeLeft / 15) * 100
    const opponent = players?.find(p => p.username !== playerName)
    const isFullscreen = [DUEL_STATES.WAITING, DUEL_STATES.COUNTDOWN, DUEL_STATES.PLAYING, DUEL_STATES.FINISHED].includes(state)

    const sectionStyle = isFullscreen ? {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 100000, /* Sopra ogni altro Header o Sidebar */
        background: 'linear-gradient(135deg, #050505 0%, #0a0a0f 100%)',
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: '100vh',
        padding: '2rem 1rem',
        display: 'flex',
        flexDirection: 'column'
    } : { maxWidth: '800px', margin: '0 auto' }

    return (
        <section className={`section active ${isFullscreen ? 'duel-fullscreen' : ''} reveal-entrance`} style={sectionStyle}>
            {state === DUEL_STATES.LOBBY && (
                <>
                    <div className="hero">
                        <h1><span className="gradient-text">Duello AI</span> <Swords size={32} className="inline-icon hero-icon-floating" /></h1>
                        <p>Sfida un tuo amico in tempo reale con quiz generati dall'intelligenza artificiale</p>
                    </div>

                    {error && <div className="card" style={{ borderLeft: '3px solid #FF453A', marginBottom: '1rem' }}><p style={{ color: '#FF453A', margin: 0 }}>{error}</p></div>}

                    <div className="duel-lobby-grid">
                        <div className="duel-card highlight-card">
                            <div className="duel-config-container">
                                <div style={{ marginBottom: '1rem' }}>
                                    <h3><Target size={22} className="inline-icon text-accent" /> Configura Battaglia</h3>
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                        Scegli la tua arma e preparati alla sfida.
                                    </p>
                                </div>

                                <div className="segmented-control">
                                    <button className={`segmented-btn ${sourceType === 'subject' ? 'active' : ''}`} onClick={() => setSourceType('subject')}><Globe size={16} /> Materia</button>
                                    <button className={`segmented-btn ${sourceType === 'notes' ? 'active' : ''}`} onClick={() => setSourceType('notes')}><Edit3 size={16} /> Note</button>
                                    <button className={`segmented-btn ${sourceType === 'pdf' ? 'active' : ''}`} onClick={() => setSourceType('pdf')}><FileText size={16} /> PDF</button>
                                </div>

                                {sourceType === 'subject' && (
                                    <div className="selection-grid reveal-entrance">
                                        {[
                                            { name: 'Matematica', icon: <Calculator size={20} /> },
                                            { name: 'Italiano', icon: <BookOpen size={20} /> },
                                            { name: 'Storia', icon: <History size={20} /> },
                                            { name: 'Scienze', icon: <Atom size={20} /> },
                                            { name: 'Inglese', icon: <Globe size={20} /> },
                                            { name: 'Filosofia', icon: <Brain size={20} /> },
                                            { name: 'Fisica', icon: <Zap size={20} /> },
                                            { name: 'Generale', icon: <Sparkles size={20} /> },
                                        ].map(s => (
                                            <div
                                                key={s.name}
                                                className={`selection-card ${subject === s.name ? 'active' : ''}`}
                                                onClick={() => setSubject(s.name)}
                                            >
                                                <div className="icon-box">{s.icon}</div>
                                                <div className="label">{s.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {sourceType === 'notes' && (
                                    <div className="selection-grid reveal-entrance">
                                        {appData?.notes?.length > 0 ? (
                                            appData.notes.map(n => (
                                                <div
                                                    key={n.id}
                                                    className={`selection-card ${selectedNoteId === n.id ? 'active' : ''}`}
                                                    onClick={() => setSelectedNoteId(n.id)}
                                                >
                                                    <div className="icon-box"><FileText size={20} /></div>
                                                    <div className="label">{n.title}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '1rem', color: 'var(--color-text-tertiary)' }}>
                                                Nessuna nota trovata.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {sourceType === 'pdf' && (
                                    <div className="reveal-entrance">
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label className="btn-secondary" style={{ width: '100%', marginBottom: '1rem', textAlign: 'center', cursor: 'pointer', borderRadius: '1rem' }}>
                                                <input type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
                                                <Paperclip size={18} /> {pdfName}
                                            </label>
                                            <textarea
                                                className="form-input"
                                                placeholder="O incolla testo qui per generare i quiz..."
                                                style={{ height: '120px', borderRadius: '1.25rem', background: 'rgba(255,255,255,0.04)' }}
                                                value={pdfText}
                                                onChange={e => setPdfText(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="premium-config-box reveal-up">
                                    <div className="slider-header">
                                        <label style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Numero di domande</label>
                                        <div className="slider-val-badge">{questionAmount}</div>
                                    </div>
                                    <input
                                        type="range"
                                        min="3"
                                        max="20"
                                        value={questionAmount}
                                        onChange={e => setQuestionAmount(parseInt(e.target.value))}
                                        className="premium-slider"
                                    />
                                </div>

                                <button
                                    className="btn-primary flex-center gap-sm"
                                    onClick={handleCreateMatch}
                                    disabled={loading}
                                    style={{ marginTop: '1rem', padding: '1.2rem', fontSize: '1.1rem', borderRadius: '1.25rem', boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)' }}
                                >
                                    {loading ? <><Sparkles size={20} className="spin" /> GENERO ARENA...</> : <><Swords size={20} /> CREA STANZA DI BATTAGLIA</>}
                                </button>
                            </div>
                        </div>

                        <div className="duel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                            <div className="icon-box-large" style={{ margin: '0 auto 1.5rem', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                                <Key size={30} />
                            </div>
                            <h3>Entra in Sfida</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Inserisci il codice ricevuto dal tuo avversario.</p>
                            <input
                                type="text"
                                placeholder="----"
                                maxLength={4}
                                value={joinCodeInput}
                                onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                                style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '8px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '1rem', color: 'var(--color-accent)' }}
                            />
                            <button className="btn-secondary" onClick={handleJoinMatch} disabled={loading} style={{ padding: '1rem', borderRadius: '1rem' }}>
                                {loading ? <Clock size={18} className="spin" /> : <><Sparkles size={18} /> PARTECIPA</>}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {state === DUEL_STATES.WAITING && (
                <div className="duel-card" style={{ textAlign: 'center', padding: '3rem', maxWidth: '800px', width: '100%', margin: 'auto' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{ fontSize: '4rem', margin: '0.5rem 0', letterSpacing: '12px', color: 'var(--color-accent)', textShadow: '0 0 20px rgba(91,159,243,0.5)' }}>{roomCode}</h1>
                        <p style={{ color: 'var(--color-text-tertiary)' }}>Condividi questo codice con lo sfidante</p>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '3rem' }}>
                        <div className="player-lobby-card">
                            <div className="avatar"><User size={32} /></div>
                            <div className="name">{playerName} (Tu)</div>
                            <div className="status ready">Pronto!</div>
                        </div>
                        <div className="vs-circle">VS</div>
                        <div className="player-lobby-card">
                            {opponent ? (
                                <>
                                    <div className="avatar"><User size={32} /></div>
                                    <div className="name">{opponent.username}</div>
                                    <div className="status ready">Pronto!</div>
                                </>
                            ) : (
                                <>
                                    <div className="avatar pulse">?</div>
                                    <div className="name" style={{ opacity: 0.5 }}>In attesa...</div>
                                    <div className="status waiting">---</div>
                                </>
                            )}
                        </div>
                    </div>

                    {isHost ? (
                        <button className="btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem', boxShadow: '0 0 30px rgba(91, 159, 243, 0.4)' }} disabled={players.length < 2} onClick={handleLaunchDuel}>
                            <Sparkles size={20} /> INIZIA BATTAGLIA <Sparkles size={20} />
                        </button>
                    ) : (
                        <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>In attesa che l'Host avvii la sfida...</p>
                    )}

                    <button className="btn-minimal" onClick={resetQuiz} style={{ marginTop: '2rem', display: 'block', margin: '2rem auto' }}>Esci dalla stanza</button>
                </div>
            )}

            {state === DUEL_STATES.COUNTDOWN && (
                <div className="duel-countdown-screen" style={{ margin: 'auto' }}>
                    <div className="countdown-number" style={{ textShadow: '0 0 40px var(--color-accent)' }}>{countdownNumber > 0 ? countdownNumber : 'GO!'}</div>
                    <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '2rem', letterSpacing: '4px' }}>PREPARATI ALLO SCONTRO!</p>
                </div>
            )}

            {state === DUEL_STATES.PLAYING && currentQ && (
                <div className={`duel-arena-wrapper ${strikeClass}`}>
                    {/* Top Header */}
                    <header className="arena-header">
                        <div className="arena-logo">
                            <img src="/favicon.png" alt="Logo" className="arena-logo-img" />
                            <span className="arena-logo-text">StudyJournal <span className="pro-badge">Pro</span></span>
                            <span className="arena-divider">|</span>
                            <span className="arena-title">Duel Arena</span>
                        </div>
                        <div className="arena-timer">
                            <div className="live-dot pulse"></div>
                            <span>Live countdown:</span>
                            <span className="timer-value">
                                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                            </span>
                        </div>
                    </header>

                    {/* Main Arena Layout */}
                    <div className="arena-main-layout">

                        {/* LEFT: Player Panel */}
                        <div className="player-panel panel-blue">
                            <div className="player-avatar-wrapper">
                                <div className="avatar-glow"></div>
                                <div className="avatar-circle"><User size={48} /></div>
                            </div>
                            <h2 className="player-name">Tu (User)</h2>
                            <div className="player-level">Lvl {appData?.stats?.level || 1}</div>

                            <div className="player-score-block">
                                <span className="score-value">{score}</span>
                                <span className="score-label">Punti</span>
                            </div>

                            <div className="player-progress-wrapper">
                                <div className="player-progress-bar">
                                    <div className="progress-fill" style={{ width: `${((currentIndex) / questions.length) * 100}%` }}></div>
                                </div>
                                <span className="progress-text">{currentIndex}/{questions.length} Domande</span>
                            </div>
                        </div>

                        {/* CENTER: Question Area */}
                        <div className="arena-center">
                            <div className="question-card glass-neon">
                                <h2>{currentQ.question}</h2>
                            </div>

                            <div className="options-grid">
                                {currentQ.options.map((opt, i) => {
                                    let cls = 'option-btn'
                                    if (selectedAnswer !== null) {
                                        if (i === currentQ.correct) cls += ' correct'
                                        else if (i === selectedAnswer) cls += ' wrong'
                                    }
                                    return (
                                        <button key={i} className={cls} onClick={() => handleAnswer(i === currentQ.correct, i)} disabled={selectedAnswer !== null}>
                                            <span className="opt-letter">{['A)', 'B)', 'C)', 'D)'][i]}</span>
                                            <span className="opt-text">{opt}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* RIGHT: Opponent Panel */}
                        <div className="player-panel panel-red">
                            <div className="player-avatar-wrapper">
                                <div className="avatar-glow"></div>
                                <div className="avatar-circle"><Bot size={48} /></div>
                            </div>
                            <h2 className="player-name">{opponent?.username || 'Avversario'}</h2>
                            <div className="player-level">Lvl 5</div>

                            <div className="player-score-block">
                                <span className="score-value">{opponent?.score || 0}</span>
                                <span className="score-label">Punti</span>
                            </div>

                            <div className="player-progress-wrapper">
                                <div className="player-progress-bar">
                                    <div className="progress-fill" style={{ width: `${((opponent?.current_question_index || 0) / questions.length) * 100}%` }}></div>
                                </div>
                                <span className="progress-text">{opponent?.current_question_index || 0}/{questions.length} Domande</span>
                            </div>
                        </div>

                        {/* FAR RIGHT: Live Crowd Sidebar */}
                        <aside className="live-crowd-sidebar">
                            <h3 className="sidebar-title">Live Crowd & Classifica</h3>
                            <div className="crowd-feed">
                                <div className="feed-item"><span className="emoji">🔥</span> Andrea P. ha risposto correttamente!</div>
                                <div className="feed-item"><span className="emoji">🎉</span> Marco G. è salito in classifica!</div>
                                <div className="feed-item"><span className="emoji">👏</span> Tifate per Andrea!</div>
                                <div className="feed-item"><span className="emoji">🤓</span> Giulia R. ha una streak di 5!</div>
                            </div>

                            <div className="leaderboard">
                                <h4 className="leaderboard-title">Leaderboard</h4>
                                <ol className="leaderboard-list">
                                    <li>Giulia R. - 15800 Punti</li>
                                    <li>Matteo B. - 14200 Punti</li>
                                    <li>Andrea P. - 13900 Punti</li>
                                    <li>Tu - {score} Punti</li>
                                    <li>Avversario - {opponent?.score || 0} Punti</li>
                                </ol>
                            </div>
                        </aside>

                    </div>
                </div>
            )}

            {state === DUEL_STATES.FINISHED && (
                <div className="duel-results-screen reveal-up" style={{ margin: 'auto', maxWidth: '800px', width: '100%', textAlign: 'center' }}>
                    <div className="duel-trophy"><Trophy size={64} color="var(--color-accent)" /></div>
                    <h2>Sfida Conclusa!</h2>

                    <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', margin: '2rem 0' }}>
                        <div className={`result-card ${score >= (opponent?.score || 0) ? 'winner' : 'loser'}`}>
                            <div style={{ fontSize: '0.8rem' }}>IL TUO SCORE</div>
                            <div className="val">{score}</div>
                            {score >= (opponent?.score || 0) && <div className="tag"><Trophy size={14} /> VINCITORE</div>}
                        </div>
                        <div className={`result-card ${(opponent?.score || 0) > score ? 'winner' : 'loser'}`}>
                            <div style={{ fontSize: '0.8rem' }}>AVVERSARIO</div>
                            <div className="val">{opponent?.score || 0}</div>
                            {(opponent?.score || 0) > score && <div className="tag"><Trophy size={14} /> VINCITORE</div>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="btn-primary" onClick={resetQuiz}><RotateCcw size={18} /> Rigioca</button>
                        <button className="btn-secondary" onClick={resetQuiz}><ChevronLeft size={18} /> Lobby Principal</button>
                    </div>
                </div>
            )}
        </section>
    )
}
