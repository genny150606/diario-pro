import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { supabase } from '../../lib/supabase'
import { Swords, Target, Edit3, FileText, Paperclip, Clock, Key, User, Trophy, Play, RotateCcw, ChevronLeft, Sparkles } from 'lucide-react'
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
    const [state, setState] = useState(DUEL_STATES.LOBBY)

    // Quiz Generation Sources
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
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const timerRef = useRef(null)
    const pollIntervalRef = useRef(null)

    const apiUrl = window.location.protocol === 'file:' ? 'https://diario-pro.vercel.app' : ''

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
        let count = 3
        const interval = setInterval(() => {
            count--
            if (count <= 0) {
                clearInterval(interval)
                setState(DUEL_STATES.PLAYING)
                startTimer()
            }
        }, 1000)
    }

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
        setQuestions([]); setCurrentIndex(0); setScore(0); setStreak(0); setError('')
        setRoomCode(''); setCurrentRoom(null); setPlayers([])
    }

    const currentQ = questions[currentIndex]
    const timerPercent = (timeLeft / 15) * 100
    const opponent = players.find(p => p.username !== playerName)

    const isFullscreen = [DUEL_STATES.COUNTDOWN, DUEL_STATES.PLAYING, DUEL_STATES.FINISHED].includes(state)

    const sectionStyle = isFullscreen ? {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        background: 'var(--color-bg)',
        overflowY: 'auto',
        padding: '2rem 1rem'
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(200px, 0.8fr)', gap: '1.5rem' }}>
                        <div className="duel-card highlight-card">
                            <h3><Target size={20} className="inline-icon" /> Crea una Sfida</h3>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                Scegli l'argomento e invita uno sfidante col codice.
                            </p>

                            <div className="tabs" style={{ marginBottom: '1.5rem' }}>
                                <button className={`tab-btn ${sourceType === 'subject' ? 'active' : ''}`} onClick={() => setSourceType('subject')}>🌍 Materia</button>
                                <button className={`tab-btn ${sourceType === 'notes' ? 'active' : ''}`} onClick={() => setSourceType('notes')}><Edit3 size={14} /> Note</button>
                                <button className={`tab-btn ${sourceType === 'pdf' ? 'active' : ''}`} onClick={() => setSourceType('pdf')}><FileText size={14} /> PDF</button>
                            </div>

                            {sourceType === 'subject' && (
                                <select value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', marginBottom: '1rem' }}>
                                    {['Matematica', 'Italiano', 'Storia', 'Scienze', 'Inglese', 'Filosofia', 'Fisica', 'Cultura Generale'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            )}

                            {sourceType === 'notes' && (
                                <select value={selectedNoteId} onChange={e => setSelectedNoteId(e.target.value)} style={{ width: '100%', marginBottom: '1rem' }}>
                                    <option value="">-- Seleziona Appunti --</option>
                                    {appData?.notes?.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                                </select>
                            )}

                            {sourceType === 'pdf' && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label className="btn-secondary" style={{ width: '100%', marginBottom: '0.5rem', textAlign: 'center' }}>
                                        <input type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
                                        <Paperclip size={16} /> {pdfName || 'Carica PDF/TXT'}
                                    </label>
                                    <textarea className="form-input" placeholder="O incolla testo qui..." style={{ height: '80px' }} value={pdfText} onChange={e => setPdfText(e.target.value)} />
                                </div>
                            )}

                            <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                                    <span>Numero di Domande:</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--color-accent)' }}>{questionAmount}</span>
                                </label>
                                <input
                                    type="range"
                                    min="3"
                                    max="20"
                                    value={questionAmount}
                                    onChange={e => setQuestionAmount(parseInt(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                                />
                            </div>

                            <button className="btn-primary duel-start-btn" onClick={handleCreateMatch} disabled={loading}>
                                {loading ? '⏳ Generazione...' : '🚀 CREA STANZA'}
                            </button>
                        </div>

                        <div className="duel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <h3><Key size={20} className="inline-icon" /> Entra in Sfida</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Inserisci il codice ricevuto.</p>
                            <input
                                type="text"
                                placeholder="Codice"
                                maxLength={4}
                                value={joinCodeInput}
                                onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                                style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '1rem' }}
                            />
                            <button className="btn-secondary duel-start-btn" onClick={handleJoinMatch} disabled={loading}>
                                {loading ? <><Clock size={18} className="spin" /> Entrata...</> : <><Swords size={18} /> UNISCITI</>}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {state === DUEL_STATES.WAITING && (
                <div className="duel-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{ fontSize: '3rem', margin: '0.5rem 0', letterSpacing: '8px', color: 'var(--color-accent)' }}>{roomCode}</h1>
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
                        <button className="btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem' }} disabled={players.length < 2} onClick={handleLaunchDuel}>
                            <Sparkles size={20} /> INIZIA BATTAGLIA <Sparkles size={20} />
                        </button>
                    ) : (
                        <p style={{ color: 'var(--color-text-secondary)' }}>In attesa che l'Host avvii la sfida...</p>
                    )}

                    <button className="btn-minimal" onClick={resetQuiz} style={{ marginTop: '2rem', display: 'block', margin: '2rem auto' }}>Esci dalla stanza</button>
                </div>
            )}

            {state === DUEL_STATES.COUNTDOWN && (
                <div className="duel-countdown-screen">
                    <div className="countdown-number">3</div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>PREPARATI ALLO SCONTRO!</p>
                </div>
            )}

            {state === DUEL_STATES.PLAYING && currentQ && (
                <div className="duel-game-screen">
                    <div className="multi-scoreboard">
                        <div className="score-item me">
                            <div className="name">{playerName}</div>
                            <div className="bar"><div className="fill" style={{ width: `${(currentIndex / questions.length) * 100}%` }} /></div>
                            <div className="pts">{score} pts</div>
                        </div>
                        <div className="score-item vs">VS</div>
                        <div className="score-item opp">
                            <div className="name">{opponent?.username || 'Sfidante'}</div>
                            <div className="bar"><div className="fill" style={{ width: `${((opponent?.current_question_index || 0) / questions.length) * 100}%` }} /></div>
                            <div className="pts">{opponent?.score || 0} pts</div>
                        </div>
                    </div>

                    <div className="duel-timer-bar">
                        <div className="duel-timer-fill" style={{
                            width: `${timerPercent}%`,
                            background: timerPercent > 50 ? '#30D158' : timerPercent > 25 ? '#FF9F0A' : '#FF453A'
                        }} />
                    </div>

                    <div className="duel-question-card">
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: '0.5rem' }}>Domanda {currentIndex + 1} di {questions.length}</span>
                        <h3>{currentQ.question}</h3>
                    </div>

                    <div className="duel-options">
                        {currentQ.options.map((opt, i) => {
                            let cls = 'duel-option'
                            if (selectedAnswer !== null) {
                                if (i === currentQ.correct) cls += ' correct'
                                else if (i === selectedAnswer) cls += ' wrong'
                            }
                            return (
                                <button key={i} className={cls} onClick={() => handleAnswer(i === currentQ.correct, i)} disabled={selectedAnswer !== null}>
                                    <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
                                    {opt}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {state === DUEL_STATES.FINISHED && (
                <div className="duel-results-screen reveal-up">
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
