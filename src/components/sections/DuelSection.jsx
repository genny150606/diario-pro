import { useState, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { supabase } from '../../lib/supabase'
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

    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [timeLeft, setTimeLeft] = useState(15)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [streak, setStreak] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const timerRef = useRef(null)

    const apiUrl = window.location.protocol === 'file:' ? 'https://diario-pro.vercel.app' : ''

    // Generate questions via AI
    const generateQuestions = async (topic) => {
        const response = await fetch(`${apiUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Genera esattamente 5 domande quiz a risposta multipla su "${topic}". 
Formato JSON array (senza markdown): 
[{"question":"...", "options":["A","B","C","D"], "correct":0}]
dove "correct" è l'indice (0-3) della risposta corretta. Solo JSON, nient'altro.`,
                history: [],
                context: 'Quiz Generator'
            })
        })
        if (!response.ok) throw new Error('Errore generazione domande')
        const data = await response.json()
        // Parse from response text
        const text = data.response || data.text || ''
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) throw new Error('Formato risposta invalido')
        return JSON.parse(jsonMatch[0])
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
                    if (fullText.length > 15000) break // limit text length
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
            console.error('File parsing error:', err)
            setError('Errore nella lettura del file. Assicurati che sia un PDF o un file di testo valido.')
        }
    }

    // Create a solo quiz
    const handleCreateQuiz = async () => {
        setLoading(true)
        setError('')
        try {
            let genTopic = ''
            let genContext = ''

            if (sourceType === 'subject') {
                genTopic = subject
                genContext = ''
            } else if (sourceType === 'notes') {
                const note = appData.notes.find(n => n.id === selectedNoteId)
                if (!note) throw new Error('Seleziona un appunto prima di iniziare.')
                genTopic = `Appunti: ${note.title}`
                genContext = note.content
            } else if (sourceType === 'pdf') {
                if (!pdfText.trim()) throw new Error('Carica prima un file PDF/Testo.')
                genTopic = `Documento: ${pdfName}`
                genContext = pdfText
            }

            // Using the existing generateQuestions but modifying the prompt if context exists
            const prompt = genContext
                ? `Genera esattamente 5 domande quiz a risposta multipla basate sul seguente testo/appunto: "${genContext.substring(0, 3000)}".
Argomento: ${genTopic}.
Formato JSON array (senza markdown): 
[{"question":"...", "options":["A","B","C","D"], "correct":0}]
dove "correct" è l'indice (0-3) della risposta corretta. Solo JSON, nient'altro.`
                : `Genera esattamente 5 domande quiz a risposta multipla su "${genTopic}". 
Formato JSON array (senza markdown): 
[{"question":"...", "options":["A","B","C","D"], "correct":0}]
dove "correct" è l'indice (0-3) della risposta corretta. Solo JSON, nient'altro.`

            const response = await fetch(`${apiUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: prompt,
                    history: [],
                    context: 'Quiz Generator'
                })
            })

            if (!response.ok) throw new Error('Errore generazione domande')
            const data = await response.json()
            const text = data.response || data.text || ''
            const jsonMatch = text.match(/\[[\s\S]*\]/)
            if (!jsonMatch) throw new Error('L\'AI non ha generato un formato valido. Riprova.')

            const qs = JSON.parse(jsonMatch[0])
            if (!qs || qs.length === 0) throw new Error('L\'AI non ha generato domande.')

            setQuestions(qs)
            setCurrentIndex(0)
            setScore(0)
            setStreak(0)
            setState(DUEL_STATES.COUNTDOWN)

            // 3-2-1 countdown
            let count = 3
            const countdownInterval = setInterval(() => {
                count--
                if (count <= 0) {
                    clearInterval(countdownInterval)
                    setState(DUEL_STATES.PLAYING)
                    startTimer()
                }
            }, 1000)
        } catch (err) {
            setError(`❌ ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    // Timer per domanda
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

    const handleAnswer = (isCorrect, index) => {
        clearInterval(timerRef.current)
        setSelectedAnswer(index)

        if (isCorrect) {
            const bonus = Math.max(1, Math.floor(timeLeft / 3))
            const streakBonus = streak >= 3 ? 2 : 1
            setScore(prev => prev + (100 + bonus * 10) * streakBonus)
            setStreak(prev => prev + 1)
        } else {
            setStreak(0)
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
        clearInterval(timerRef.current)
        setState(DUEL_STATES.LOBBY)
        setQuestions([])
        setCurrentIndex(0)
        setScore(0)
        setStreak(0)
        setError('')
    }

    const currentQ = questions[currentIndex]
    const timerPercent = (timeLeft / 15) * 100

    return (
        <section className="section active">
            {/* LOBBY */}
            {state === DUEL_STATES.LOBBY && (
                <>
                    <div className="hero">
                        <h1><span className="gradient-text">Duello AI</span> ⚔️</h1>
                        <p>Sfida te stesso con quiz generati dall'intelligenza artificiale</p>
                    </div>

                    {error && <div className="card" style={{ borderLeft: '3px solid #FF453A', marginBottom: '1rem' }}><p style={{ color: '#FF453A' }}>{error}</p></div>}

                    <div className="duel-card">
                        <h3>🎯 Quiz Rapido</h3>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                            Seleziona da cosa vuoi generare le domande:
                        </p>

                        <div className="tabs" style={{ marginBottom: '1.5rem' }}>
                            <button className={`tab-btn ${sourceType === 'subject' ? 'active' : ''}`} onClick={() => setSourceType('subject')}>🌍 Materia</button>
                            <button className={`tab-btn ${sourceType === 'notes' ? 'active' : ''}`} onClick={() => setSourceType('notes')}>📝 Note</button>
                            <button className={`tab-btn ${sourceType === 'pdf' ? 'active' : ''}`} onClick={() => setSourceType('pdf')}>📄 PDF</button>
                        </div>

                        {sourceType === 'subject' && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Scegli Argomento Generale</label>
                                <select value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%' }}>
                                    <option value="Matematica">Matematica</option>
                                    <option value="Italiano">Italiano</option>
                                    <option value="Storia">Storia</option>
                                    <option value="Scienze">Scienze</option>
                                    <option value="Inglese">Inglese</option>
                                    <option value="Filosofia">Filosofia</option>
                                    <option value="Geografia">Geografia</option>
                                    <option value="Fisica">Fisica</option>
                                    <option value="Cultura Generale">Cultura Generale</option>
                                </select>
                            </div>
                        )}

                        {sourceType === 'notes' && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Seleziona un tuo Appunto</label>
                                <select value={selectedNoteId} onChange={e => setSelectedNoteId(e.target.value)} style={{ width: '100%' }}>
                                    <option value="">-- Seleziona Appunti --</option>
                                    {appData.notes && appData.notes.length > 0 ? (
                                        appData.notes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)
                                    ) : (
                                        <option value="" disabled>Nessuna nota trovata. Creane una prima!</option>
                                    )}
                                </select>
                            </div>
                        )}

                        {sourceType === 'pdf' && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Carica Documento o Incolla Testo</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem' }}>
                                    <label className="btn-secondary" style={{ cursor: 'pointer', flex: 1, textAlign: 'center' }}>
                                        <input type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
                                        📎 Carica File (PDF/TXT)
                                    </label>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                        {pdfName || 'Nessun file'}
                                    </span>
                                </div>
                                <textarea
                                    className="form-input"
                                    placeholder="Incolla qui il testo su cui basare il quiz..."
                                    style={{ height: '100px', resize: 'vertical' }}
                                    value={pdfText}
                                    onChange={e => setPdfText(e.target.value)}
                                ></textarea>
                            </div>
                        )}

                        <button
                            className="btn-primary duel-start-btn"
                            onClick={handleCreateQuiz}
                            disabled={loading || (sourceType === 'notes' && !selectedNoteId) || (sourceType === 'pdf' && !pdfText.trim())}
                        >
                            {loading ? '⏳ Generazione Arena...' : '⚔️ Inizia Quiz'}
                        </button>
                    </div>

                    <div className="duel-card" style={{ marginTop: '1rem' }}>
                        <h3>📊 Le tue statistiche duello</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 800 }}>0</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>Partite</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#30D158' }}>0%</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>Precisione</div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* COUNTDOWN */}
            {state === DUEL_STATES.COUNTDOWN && (
                <div className="duel-countdown-screen">
                    <div className="countdown-number">3</div>
                    <p>Preparati!</p>
                </div>
            )}

            {/* PLAYING */}
            {state === DUEL_STATES.PLAYING && currentQ && (
                <div className="duel-game-screen">
                    {/* Header */}
                    <div className="duel-game-header">
                        <div className="duel-progress">
                            Domanda {currentIndex + 1}/{questions.length}
                        </div>
                        <div className="duel-score">{score} pt</div>
                        {streak >= 2 && <div className="duel-streak">🔥 {streak}x</div>}
                    </div>

                    {/* Timer bar */}
                    <div className="duel-timer-bar">
                        <div className="duel-timer-fill" style={{
                            width: `${timerPercent}%`,
                            background: timerPercent > 50 ? '#30D158' : timerPercent > 25 ? '#FF9F0A' : '#FF453A'
                        }} />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>{timeLeft}s</div>

                    {/* Question */}
                    <div className="duel-question-card">
                        <h3>{currentQ.question}</h3>
                    </div>

                    {/* Options */}
                    <div className="duel-options">
                        {currentQ.options.map((opt, i) => {
                            let cls = 'duel-option'
                            if (selectedAnswer !== null) {
                                if (i === currentQ.correct) cls += ' correct'
                                else if (i === selectedAnswer) cls += ' wrong'
                            }
                            return (
                                <button
                                    key={i}
                                    className={cls}
                                    onClick={() => handleAnswer(i === currentQ.correct, i)}
                                    disabled={selectedAnswer !== null}
                                >
                                    <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
                                    {opt}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* FINISHED */}
            {state === DUEL_STATES.FINISHED && (
                <div className="duel-results-screen">
                    <div className="duel-trophy">🏆</div>
                    <h2>Quiz Completato!</h2>
                    <div className="duel-final-score">{score}</div>
                    <p>punti totali</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                        <button className="btn-primary" onClick={handleCreateQuiz} disabled={loading}>
                            🔄 Rigioca
                        </button>
                        <button className="btn-secondary" onClick={resetQuiz}>
                            ↩ Lobby
                        </button>
                    </div>
                </div>
            )}
        </section>
    )
}
