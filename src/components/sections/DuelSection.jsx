import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { Swords, Target, Edit3, FileText, Paperclip, Clock, Key, User, Trophy, Play, RotateCcw, ChevronLeft, Sparkles, BookOpen, GraduationCap, Calculator, Globe, History, Atom, Brain, Zap, PlusCircle, X, Bot, Send, Eye, MessageCircle } from 'lucide-react'
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
    const [difficulty, setDifficulty] = useState('Medio')

    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [timeLeft, setTimeLeft] = useState(15)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [streak, setStreak] = useState(0)
    const [countdownNumber, setCountdownNumber] = useState(3)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [isAnswering, setIsAnswering] = useState(false)
    const [isSpectator, setIsSpectator] = useState(false)
    const [chatMessages, setChatMessages] = useState([])
    const [chatInput, setChatInput] = useState('')
    const timerRef = useRef(null)
    const pollIntervalRef = useRef(null)
    const answerTimeoutRef = useRef(null)
    const chatPollRef = useRef(null)
    const lastChatTimestamp = useRef(0)
    const chatEndRef = useRef(null)

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
            if (answerTimeoutRef.current) clearTimeout(answerTimeoutRef.current)
            if (chatPollRef.current) clearInterval(chatPollRef.current)
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

    // Chat polling
    useEffect(() => {
        if (currentRoom?.id && [DUEL_STATES.WAITING, DUEL_STATES.PLAYING, DUEL_STATES.COUNTDOWN].includes(state)) {
            chatPollRef.current = setInterval(async () => {
                try {
                    const res = await fetch(`${apiUrl}/api/duel/chat/${currentRoom.id}?since=${lastChatTimestamp.current}`)
                    if (!res.ok) return
                    const { messages } = await res.json()
                    if (messages.length > 0) {
                        setChatMessages(prev => [...prev, ...messages])
                        lastChatTimestamp.current = messages[messages.length - 1].timestamp
                        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
                    }
                } catch { }
            }, 2000)
        }
        return () => { if (chatPollRef.current) clearInterval(chatPollRef.current) }
    }, [state, currentRoom?.id])

    const sendChatMessage = async () => {
        if (!chatInput.trim() || !currentRoom?.id) return
        try {
            await fetch(`${apiUrl}/api/duel/chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: currentRoom.id, username: playerName, message: chatInput.trim() })
            })
            setChatInput('')
        } catch { }
    }

    const pollRoomStatus = async () => {
        if (!currentRoom?.id) return

        try {
            const res = await fetch(`${apiUrl}/api/duel/room-status/${currentRoom.id}`)
            if (!res.ok) throw new Error('Poll failed')
            const { room, players: playersList } = await res.json()

            setPlayers(playersList || [])
            setCurrentRoom(room)
        } catch (err) {
            console.error('[POLL_ERR]', err)
        }
    }

    const pollPlayersScore = async () => {
        if (!currentRoom?.id) return
        try {
            const res = await fetch(`${apiUrl}/api/duel/room-status/${currentRoom.id}`)
            if (!res.ok) return
            const { players: playersList } = await res.json()

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
            let body = { subject: 'Cultura Generale', context: '', amount: questionAmount, difficulty }
            if (sourceType === 'subject') body.subject = subject
            else if (sourceType === 'notes') {
                const note = appData?.notes?.find(n => String(n.id) === String(selectedNoteId))
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

            // Validate each question has the correct structure
            const validQuiz = quiz.filter(q => q.question && Array.isArray(q.options) && q.options.length >= 2 && typeof q.correct === 'number')
            if (validQuiz.length === 0) throw new Error("Le domande generate non hanno il formato corretto. Riprova.")

            const code = Math.random().toString(36).substring(2, 6).toUpperCase()

            // Create room via server-side API (no CORS issues)
            const roomRes = await fetch(`${apiUrl}/api/duel/create-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, subject: body.subject, quiz: validQuiz, playerName })
            })
            if (!roomRes.ok) {
                const errData = await roomRes.json().catch(() => ({}))
                throw new Error(errData.error || 'Errore creazione stanza')
            }
            const { room } = await roomRes.json()

            setQuestions(validQuiz)
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

    // SOLO PLAY (no Supabase needed)
    const handleSoloPlay = async () => {
        setLoading(true)
        setError('')
        try {
            let body = { subject: 'Cultura Generale', context: '', amount: questionAmount, difficulty }
            if (sourceType === 'subject') body.subject = subject
            else if (sourceType === 'notes') {
                const note = appData?.notes?.find(n => String(n.id) === String(selectedNoteId))
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
            try { responseData = JSON.parse(responseText) } catch (e) { }

            if (!response.ok) {
                let errorMsg = responseData.error || responseText || 'Errore generazione quiz AI.'
                if (String(errorMsg).includes('429')) errorMsg = 'Quota API esaurita. Riprova più tardi.'
                else errorMsg = `[Errore]: ${String(errorMsg)}`
                throw new Error(errorMsg)
            }

            const { quiz } = responseData
            if (!quiz || quiz.length === 0) throw new Error("L'AI non ha generato domande.")

            const validQuiz = quiz.filter(q => q.question && Array.isArray(q.options) && q.options.length >= 2 && typeof q.correct === 'number')
            if (validQuiz.length === 0) throw new Error("Le domande generate non hanno il formato corretto. Riprova.")

            // Skip Supabase entirely — just set local state and start
            setQuestions(validQuiz)
            setRoomCode('SOLO')
            setCurrentRoom(null)
            setIsHost(true)
            setPlayers([{ username: playerName, is_ready: true, score: 0 }])
            startCountdown() // Go directly to countdown, no waiting room
        } catch (err) {
            console.error('[SOLO_PLAY_ERR]', err)
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
            // First try joining as player
            const res = await fetch(`${apiUrl}/api/duel/join-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: joinCodeInput.toUpperCase().trim(), playerName })
            })
            const data = await res.json()

            if (res.ok) {
                // Joined as player
                const room = data.room
                setQuestions(room.ai_data || [])
                setRoomCode(room.code)
                setCurrentRoom(room)
                setIsHost(false)
                setIsSpectator(false)
                setState(DUEL_STATES.WAITING)
            } else if (res.status === 400 && data.error?.includes('iniziata')) {
                // Room already active — join as spectator
                const specRes = await fetch(`${apiUrl}/api/duel/join-spectator`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: joinCodeInput.toUpperCase().trim(), playerName })
                })
                const specData = await specRes.json()
                if (!specRes.ok) throw new Error(specData.error || 'Errore ingresso spettatore')

                setQuestions(specData.room.ai_data || [])
                setRoomCode(specData.room.code)
                setCurrentRoom(specData.room)
                setPlayers(specData.players || [])
                setIsHost(false)
                setIsSpectator(true)
                setState(specData.room.status === 'active' ? DUEL_STATES.PLAYING : DUEL_STATES.WAITING)
            } else {
                throw new Error(data.error || 'Errore ingresso stanza')
            }
        } catch (err) {
            console.error('[JOIN_MATCH_ERR]', err)
            setError(err?.message || String(err))
        } finally {
            setLoading(false)
        }
    }

    const handleLaunchDuel = async () => {
        if (!isHost || players.length < 2) return
        try {
            await fetch(`${apiUrl}/api/duel/launch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: currentRoom.id })
            })
        } catch (err) {
            setError('Errore nell\'avvio della sfida.')
        }
    }

    const startTimer = useCallback(() => {
        setTimeLeft(15)
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current)
                    handleAnswerInternal(false, -1)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, []) // eslint-disable-line

    const startCountdown = useCallback(() => {
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
    }, [startTimer])

    const [strikeClass, setStrikeClass] = useState('')

    // Auto-start countdown when room becomes active (fixes Guest sync)
    useEffect(() => {
        if (state === DUEL_STATES.WAITING && currentRoom?.status === 'active') {
            startCountdown()
        }
    }, [state, currentRoom?.status, startCountdown])

    // Hide sidebar during arena
    useEffect(() => {
        const isArena = [DUEL_STATES.COUNTDOWN, DUEL_STATES.PLAYING].includes(state)
        if (isArena) {
            document.body.classList.add('arena-fullscreen')
        } else {
            document.body.classList.remove('arena-fullscreen')
        }
        return () => document.body.classList.remove('arena-fullscreen')
    }, [state])

    // Internal answer handler (used by timer timeout to avoid stale closures)
    const handleAnswerInternal = (isCorrect, index) => {
        handleAnswer(isCorrect, index)
    }

    const handleAnswer = async (isCorrect, index) => {
        if (isAnswering) return // Prevent double-clicks
        setIsAnswering(true)
        clearInterval(timerRef.current)
        setSelectedAnswer(index)

        // Visual Arcade Strike Feedback
        setStrikeClass(isCorrect ? 'strike-correct' : 'strike-wrong')
        setTimeout(() => setStrikeClass(''), 400)

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

        // Sync score to DB via server-side API
        if (currentRoom?.id) {
            fetch(`${apiUrl}/api/duel/update-score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: currentRoom.id, playerName, score: newScore, questionIndex: currentIndex + 1 })
            }).catch(() => { })
        }

        answerTimeoutRef.current = setTimeout(() => {
            setSelectedAnswer(null)
            setIsAnswering(false)
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
        if (answerTimeoutRef.current) clearTimeout(answerTimeoutRef.current)
        if (chatPollRef.current) clearInterval(chatPollRef.current)
        setState(DUEL_STATES.LOBBY)
        setQuestions([]); setCurrentIndex(0); setScore(0); setStreak(0); setError(''); setStrikeClass('')
        setRoomCode(''); setCurrentRoom(null); setPlayers([]); setIsAnswering(false); setIsSpectator(false)
        setChatMessages([]); setChatInput(''); lastChatTimestamp.current = 0
    }

    const currentQ = questions[currentIndex]
    const timerPercent = (timeLeft / 15) * 100
    const opponent = players?.find(p => p.username !== playerName)
    const isFullscreen = [DUEL_STATES.WAITING, DUEL_STATES.COUNTDOWN, DUEL_STATES.PLAYING, DUEL_STATES.FINISHED].includes(state)

    const AmbientBackground = () => (
        <div className="ambient-mesh-bg">
            <div className="mesh-orb orb-1"></div>
            <div className="mesh-orb orb-2"></div>
            <div className="mesh-orb orb-3"></div>
        </div>
    )

    const sectionStyle = isFullscreen ? {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 100000,
        background: 'transparent',
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: '100vh',
        padding: '2rem 1rem',
        display: 'flex',
        flexDirection: 'column'
    } : { maxWidth: '1200px', margin: '0 auto', position: 'relative' }

    return (
        <section className={`section active ${isFullscreen ? 'duel-fullscreen' : ''} reveal-entrance`} style={sectionStyle}>
            <AmbientBackground />

            <AnimatePresence mode="wait">
                {state === DUEL_STATES.LOBBY && (
                    <motion.div
                        key="lobby"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="hero">
                            <motion.h1
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                Duello AI <Swords size={32} className="inline-icon hero-icon-floating" />
                            </motion.h1>
                            <p>Sfida un tuo amico in tempo reale con quiz generati dall'intelligenza artificiale</p>
                        </div>

                        {error && (
                            <motion.div
                                className="duel-card"
                                style={{ borderLeft: '4px solid #FF453A', marginBottom: '2rem', padding: '1.5rem' }}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                            >
                                <p style={{ color: '#FF453A', margin: 0, fontWeight: 700 }}>{error}</p>
                            </motion.div>
                        )}

                        <div className="duel-lobby-grid">
                            <div className="duel-card highlight-card">
                                <div className="duel-config-container">
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                                            <Target size={24} className="inline-icon text-accent" /> Configura Battaglia
                                        </h3>
                                        <p style={{ color: 'var(--color-text-tertiary)', fontSize: '1rem', fontWeight: 500 }}>
                                            Scegli la tua arma e preparati alla sfida.
                                        </p>
                                    </div>

                                    <div className="segmented-control">
                                        <button className={`segmented-btn ${sourceType === 'subject' ? 'active' : ''}`} onClick={() => setSourceType('subject')}><Globe size={18} /> Materia</button>
                                        <button className={`segmented-btn ${sourceType === 'notes' ? 'active' : ''}`} onClick={() => setSourceType('notes')}><Edit3 size={18} /> Note</button>
                                        <button className={`segmented-btn ${sourceType === 'pdf' ? 'active' : ''}`} onClick={() => setSourceType('pdf')}><FileText size={18} /> PDF</button>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {sourceType === 'subject' && (
                                            <motion.div
                                                key="subject"
                                                className="selection-grid"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                            >
                                                {[
                                                    { name: 'Matematica', icon: <Calculator size={22} /> },
                                                    { name: 'Italiano', icon: <BookOpen size={22} /> },
                                                    { name: 'Storia', icon: <History size={22} /> },
                                                    { name: 'Scienze', icon: <Atom size={22} /> },
                                                    { name: 'Inglese', icon: <Globe size={22} /> },
                                                    { name: 'Filosofia', icon: <Brain size={22} /> },
                                                    { name: 'Fisica', icon: <Zap size={22} /> },
                                                    { name: 'Generale', icon: <Sparkles size={22} /> },
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
                                            </motion.div>
                                        )}

                                        {sourceType === 'notes' && (
                                            <motion.div
                                                key="notes"
                                                className="selection-grid"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                            >
                                                {appData?.notes?.length > 0 ? (
                                                    appData.notes.map(n => (
                                                        <div
                                                            key={n.id}
                                                            className={`selection-card ${selectedNoteId === n.id ? 'active' : ''}`}
                                                            onClick={() => setSelectedNoteId(n.id)}
                                                        >
                                                            <div className="icon-box"><FileText size={22} /></div>
                                                            <div className="label">{n.title}</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                                                        Nessuna nota trovata.
                                                    </p>
                                                )}
                                            </motion.div>
                                        )}

                                        {sourceType === 'pdf' && (
                                            <motion.div
                                                key="pdf"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                            >
                                                <div style={{ marginBottom: '1.5rem' }}>
                                                    <label className="btn-secondary" style={{ width: '100%', marginBottom: '1.25rem', textAlign: 'center', cursor: 'pointer', borderRadius: '1.25rem', padding: '1rem' }}>
                                                        <input type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
                                                        <Paperclip size={20} /> {pdfName}
                                                    </label>
                                                    <textarea
                                                        className="form-input"
                                                        placeholder="O incolla testo qui per generare i quiz..."
                                                        style={{ height: '140px', borderRadius: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1.2rem', fontSize: '1rem' }}
                                                        value={pdfText}
                                                        onChange={e => setPdfText(e.target.value)}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="premium-config-box">
                                        <div className="slider-header" style={{ marginBottom: '1rem' }}>
                                            <label style={{ color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: '1rem' }}>Difficoltà</label>
                                        </div>
                                        <div className="segmented-control" style={{ marginBottom: '2rem', width: '100%' }}>
                                            {['Facile', 'Medio', 'Difficile'].map(lvl => (
                                                <button
                                                    key={lvl}
                                                    className={`segmented-btn ${difficulty === lvl ? 'active' : ''}`}
                                                    onClick={() => setDifficulty(lvl)}
                                                    style={{ flex: 1 }}
                                                >
                                                    {lvl}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="slider-header" style={{ marginBottom: '1.2rem' }}>
                                            <label style={{ color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: '1rem' }}>Numero di domande</label>
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

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                        <button
                                            className="btn-primary flex-center gap-sm"
                                            onClick={handleSoloPlay}
                                            disabled={loading}
                                            style={{ padding: '1.25rem', fontSize: '1.1rem', borderRadius: '1.5rem', boxShadow: '0 20px 40px rgba(91, 159, 243, 0.3)' }}
                                        >
                                            {loading ? <><Sparkles size={22} className="spin" /> GENERO ARENA...</> : <><Zap size={22} /> GIOCA DA SOLO</>}
                                        </button>
                                        <button
                                            className="btn-secondary flex-center gap-sm"
                                            onClick={handleCreateMatch}
                                            disabled={loading}
                                            style={{ padding: '1.1rem', fontSize: '1rem', borderRadius: '1.5rem', background: 'rgba(255,255,255,0.05)' }}
                                        >
                                            <Swords size={20} /> CREA STANZA MULTIPLAYER
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="duel-card" style={{ height: 'fit-content', alignSelf: 'start', position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <div className="icon-box" style={{ margin: '0 auto 1.5rem', width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(91, 159, 243, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                                    <Key size={32} />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Entra in Sfida</h3>
                                <p style={{ fontSize: '1rem', color: 'var(--color-text-tertiary)', marginBottom: '2rem', fontWeight: 500 }}>Inserisci il codice ricevuto dal tuo avversario.</p>

                                <div style={{ width: '100%', marginBottom: '2rem' }}>
                                    <input
                                        type="text"
                                        placeholder="----"
                                        maxLength={4}
                                        value={joinCodeInput}
                                        onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                                        style={{
                                            width: '100%',
                                            textAlign: 'center',
                                            fontSize: '2.5rem',
                                            fontWeight: 900,
                                            textTransform: 'uppercase',
                                            letterSpacing: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '1.5rem',
                                            color: 'var(--color-accent)',
                                            padding: '1.5rem 0'
                                        }}
                                    />
                                </div>

                                <button className="btn-primary" onClick={handleJoinMatch} disabled={loading} style={{ width: '100%', padding: '1.25rem', borderRadius: '1.5rem', boxShadow: '0 15px 30px rgba(91, 159, 243, 0.2)' }}>
                                    {loading ? <Clock size={20} className="spin" /> : <><Sparkles size={20} /> PARTECIPA</>}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {state === DUEL_STATES.WAITING && (
                    <motion.div
                        key="waiting"
                        className="duel-card"
                        style={{ textAlign: 'center', padding: '3rem', maxWidth: '800px', width: '100%', margin: 'auto' }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                    >
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h1 style={{ fontSize: '5rem', margin: '0.5rem 0', letterSpacing: '16px', color: 'var(--color-accent)', fontWeight: 900 }}>{roomCode}</h1>
                            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '1.2rem', fontWeight: 500 }}>Condividi questo codice con lo sfidante</p>
                        </div>

                        <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center', marginBottom: '4rem', alignItems: 'center' }}>
                            <div className="player-lobby-card">
                                <div className="avatar"><User size={40} /></div>
                                <div className="name">{playerName} (Tu)</div>
                                <div className="status ready">Pronto!</div>
                            </div>
                            <div className="vs-circle">VS</div>
                            <div className="player-lobby-card">
                                {opponent ? (
                                    <>
                                        <div className="avatar"><User size={40} /></div>
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                            {isHost ? (
                                <button
                                    className="btn-primary"
                                    style={{ padding: '1.25rem 4rem', fontSize: '1.3rem', borderRadius: '1.5rem', boxShadow: '0 20px 40px rgba(91, 159, 243, 0.4)' }}
                                    disabled={players.length < 2}
                                    onClick={handleLaunchDuel}
                                >
                                    <Sparkles size={24} /> INIZIA BATTAGLIA <Sparkles size={24} />
                                </button>
                            ) : (
                                <p style={{ color: 'var(--color-text-tertiary)', fontWeight: 600, fontSize: '1.1rem' }}>In attesa che l'Host avvii la sfida...</p>
                            )}

                            <button className="btn-minimal" onClick={resetQuiz} style={{ fontSize: '1rem', opacity: 0.7 }}>Esci dalla stanza</button>
                        </div>
                    </motion.div>
                )}

                {state === DUEL_STATES.COUNTDOWN && (
                    <motion.div
                        key="countdown"
                        className="duel-countdown-screen"
                        style={{ margin: 'auto' }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 2 }}
                    >
                        <div className="countdown-number">{countdownNumber > 0 ? countdownNumber : 'GO!'}</div>
                        <motion.p
                            style={{ fontSize: '2rem', fontWeight: 800, marginTop: '2rem', letterSpacing: '8px', color: 'var(--color-text)' }}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        >
                            PREPARATI ALLO SCONTRO!
                        </motion.p>
                    </motion.div>
                )}

                {state === DUEL_STATES.PLAYING && currentQ && Array.isArray(currentQ.options) && (
                    <motion.div
                        key="playing"
                        className={`duel-arena-wrapper ${strikeClass}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Top Bar: Timer + Progress */}
                        <header className="arena-header">
                            <div className="arena-logo">
                                <Swords size={22} className="text-accent" />
                                <span className="arena-logo-text" style={{ fontSize: '1.2rem', fontWeight: 800 }}>Arena Duello</span>
                                {isSpectator && <span className="spectator-badge"><Eye size={14} /> SPETTATORE</span>}
                            </div>
                            <div className="arena-progress-info">
                                <span className="arena-q-counter" style={{ fontSize: '1.1rem' }}>Domanda {currentIndex + 1}/{questions.length}</span>
                            </div>
                            <div className="arena-timer">
                                <div className="live-dot pulse"></div>
                                <span className="timer-value" style={{ color: timeLeft <= 5 ? '#FF453A' : 'var(--color-text)', fontSize: '1.5rem' }}>
                                    00:{String(timeLeft).padStart(2, '0')}
                                </span>
                            </div>
                        </header>

                        {/* Scoreboard Bar */}
                        <div className="arena-scoreboard-bar">
                            <div className="sb-player sb-blue">
                                <div className="avatar-sm" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(91, 159, 243, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={18} />
                                </div>
                                <span className="sb-name">{playerName}</span>
                                <span className="sb-score">{isSpectator ? (players[0]?.score || 0) : score}</span>
                            </div>
                            <div className="sb-vs" style={{ fontSize: '1.2rem', opacity: 0.5 }}>VS</div>
                            <div className="sb-player sb-red">
                                <div className="avatar-sm" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Bot size={18} />
                                </div>
                                <span className="sb-name">{opponent?.username || 'Avversario'}</span>
                                <span className="sb-score">{opponent?.score || 0}</span>
                            </div>
                        </div>

                        {/* Main Content: Question + Chat */}
                        <div className="arena-body">
                            <div className="arena-question-col">
                                {/* Question */}
                                <motion.div
                                    className="question-card"
                                    key={`q-${currentIndex}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <h2>{currentQ.question}</h2>
                                </motion.div>

                                {/* Options */}
                                <div className="options-grid">
                                    {currentQ.options.map((opt, i) => {
                                        let cls = 'option-btn'
                                        if (selectedAnswer !== null) {
                                            if (i === currentQ.correct) cls += ' correct'
                                            else if (i === selectedAnswer) cls += ' wrong'
                                        }
                                        return (
                                            <motion.button
                                                key={i}
                                                className={cls}
                                                onClick={() => !isSpectator && handleAnswer(i === currentQ.correct, i)}
                                                disabled={selectedAnswer !== null || isSpectator}
                                                whileHover={!isSpectator && selectedAnswer === null ? { x: 5 } : {}}
                                                whileTap={!isSpectator && selectedAnswer === null ? { scale: 0.98 } : {}}
                                            >
                                                <span className="opt-letter">{['A', 'B', 'C', 'D'][i]}</span>
                                                <span className="opt-text">{opt}</span>
                                            </motion.button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Live Chat Sidebar */}
                            <aside className="arena-chat-sidebar">
                                <h3 className="sidebar-title"><MessageCircle size={18} /> Live Chat</h3>
                                <div className="chat-messages">
                                    {chatMessages.length === 0 && (
                                        <div className="chat-empty">Nessun messaggio ancora...</div>
                                    )}
                                    {chatMessages.map((msg, i) => (
                                        <motion.div
                                            key={i}
                                            className={`chat-msg ${msg.username === playerName ? 'own' : ''}`}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                        >
                                            <span className="chat-user">{msg.username}</span>
                                            <span className="chat-text">{msg.message}</span>
                                        </motion.div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="chat-input-row">
                                    <input
                                        type="text"
                                        placeholder="Scrivi un messaggio..."
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                                        className="chat-input"
                                        maxLength={200}
                                    />
                                    <button className="chat-send-btn" onClick={sendChatMessage}><Send size={18} /></button>
                                </div>
                            </aside>
                        </div>

                        {/* Exit button */}
                        <button className="btn-minimal" onClick={resetQuiz} style={{ alignSelf: 'center', marginTop: '1rem', opacity: 0.6 }}>
                            Esci dall'arena
                        </button>
                    </motion.div>
                )}

                {state === DUEL_STATES.FINISHED && (
                    <motion.div
                        key="results"
                        className="duel-results-screen"
                        style={{ margin: 'auto', maxWidth: '800px', width: '100%', textAlign: 'center' }}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                    >
                        <div className="duel-trophy"><Trophy size={80} color="var(--color-accent)" /></div>
                        <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '2rem' }}>Sfida Conclusa!</h2>

                        <div style={{ display: 'flex', gap: '2.5rem', justifyContent: 'center', margin: '3rem 0', alignItems: 'flex-end' }}>
                            <div className={`result-card ${score >= (opponent?.score || 0) ? 'winner' : 'loser'}`}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, opacity: 0.6 }}>IL TUO SCORE</div>
                                <div className="val">{score}</div>
                                {score >= (opponent?.score || 0) && <div className="tag"><Trophy size={14} /> VINCITORE</div>}
                            </div>
                            <div className={`result-card ${(opponent?.score || 0) > score ? 'winner' : 'loser'}`}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, opacity: 0.6 }}>AVVERSARIO</div>
                                <div className="val">{opponent?.score || 0}</div>
                                {(opponent?.score || 0) > score && <div className="tag"><Trophy size={14} /> VINCITORE</div>}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '3rem' }}>
                            <button className="btn-primary" style={{ padding: '1.25rem 3rem', borderRadius: '1.5rem' }} onClick={resetQuiz}><RotateCcw size={20} /> Rigioca</button>
                            <button className="btn-secondary" style={{ padding: '1.25rem 3rem', borderRadius: '1.5rem', background: 'rgba(255,255,255,0.05)' }} onClick={resetQuiz}><ChevronLeft size={20} /> Lobby Principale</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}
