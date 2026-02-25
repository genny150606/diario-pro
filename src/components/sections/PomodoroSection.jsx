import { useState, useEffect, useRef, useCallback } from 'react'
import './PomodoroSection.css'

const MODES = {
    study: { label: 'Studio', emoji: '📚', color: '#5B9FF3' },
    shortBreak: { label: 'Pausa Breve', emoji: '☕', color: '#30D158' },
    longBreak: { label: 'Pausa Lunga', emoji: '🌿', color: '#FF9F0A' }
}

export default function PomodoroSection() {
    const [studyDuration, setStudyDuration] = useState(() => parseInt(localStorage.getItem('studyDuration') || '25'))
    const [shortBreakDuration, setShortBreakDuration] = useState(() => parseInt(localStorage.getItem('shortBreakDuration') || '5'))
    const [longBreakDuration, setLongBreakDuration] = useState(() => parseInt(localStorage.getItem('longBreakDuration') || '15'))

    const [mode, setMode] = useState('study')
    const [timeLeft, setTimeLeft] = useState(studyDuration * 60)
    const [isRunning, setIsRunning] = useState(false)
    const [sessionsCompleted, setSessionsCompleted] = useState(0)

    const intervalRef = useRef(null)

    // Format time as MM:SS
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    // Calculate progress percentage
    const getTotalSeconds = useCallback(() => {
        if (mode === 'study') return studyDuration * 60
        if (mode === 'shortBreak') return shortBreakDuration * 60
        return longBreakDuration * 60
    }, [mode, studyDuration, shortBreakDuration, longBreakDuration])

    const progress = ((getTotalSeconds() - timeLeft) / getTotalSeconds()) * 100

    // Timer tick
    useEffect(() => {
        if (!isRunning) return

        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Phase complete
                    clearInterval(intervalRef.current)
                    setIsRunning(false)

                    if (mode === 'study') {
                        setSessionsCompleted(s => {
                            const newCount = s + 1
                            const isLongBreak = newCount % 4 === 0
                            const nextMode = isLongBreak ? 'longBreak' : 'shortBreak'
                            setMode(nextMode)
                            setTimeLeft(isLongBreak ? longBreakDuration * 60 : shortBreakDuration * 60)
                            return newCount
                        })
                    } else {
                        setMode('study')
                        setTimeLeft(studyDuration * 60)
                    }

                    // Play notification sound
                    try {
                        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==')
                        audio.play().catch(() => { })
                    } catch (e) { }

                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(intervalRef.current)
    }, [isRunning, mode, studyDuration, shortBreakDuration, longBreakDuration])

    const handleStart = () => setIsRunning(true)
    const handlePause = () => {
        setIsRunning(false)
        clearInterval(intervalRef.current)
    }

    const handleReset = () => {
        setIsRunning(false)
        clearInterval(intervalRef.current)
        setMode('study')
        setTimeLeft(studyDuration * 60)
    }

    const handleSaveSettings = () => {
        localStorage.setItem('studyDuration', studyDuration)
        localStorage.setItem('shortBreakDuration', shortBreakDuration)
        localStorage.setItem('longBreakDuration', longBreakDuration)
        if (!isRunning && mode === 'study') {
            setTimeLeft(studyDuration * 60)
        }
    }

    const modeInfo = MODES[mode]

    return (
        <section className="section active">
            <div className="hero">
                <h1><span className="gradient-text">Pomodoro</span> 🍅</h1>
                <p>Concentra il tuo studio con la tecnica del Pomodoro</p>
            </div>

            {/* Timer Display */}
            <div className="pomodoro-card">
                <div className="pomodoro-mode-badge" style={{ background: `${modeInfo.color}20`, color: modeInfo.color }}>
                    {modeInfo.emoji} {modeInfo.label}
                </div>

                <div className="pomodoro-timer-ring">
                    <svg viewBox="0 0 200 200" className="timer-svg">
                        <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                        <circle
                            cx="100" cy="100" r="90" fill="none"
                            stroke={modeInfo.color}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 90}`}
                            strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                            style={{ transition: 'stroke-dashoffset 0.5s ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                        />
                    </svg>
                    <div className="timer-text">
                        <span className="timer-digits">{formatTime(timeLeft)}</span>
                        <span className="timer-label">{modeInfo.label}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="pomodoro-controls">
                    {!isRunning ? (
                        <button className="pomo-btn pomo-start" onClick={handleStart} style={{ background: modeInfo.color }}>
                            ▶ Avvia
                        </button>
                    ) : (
                        <button className="pomo-btn pomo-pause" onClick={handlePause}>
                            ⏸ Pausa
                        </button>
                    )}
                    <button className="pomo-btn pomo-reset" onClick={handleReset}>
                        ↺ Reset
                    </button>
                </div>

                {/* Sessions counter */}
                <div className="pomodoro-sessions">
                    <span>{sessionsCompleted}</span> sessioni completate oggi
                    <div className="session-dots">
                        {[...Array(4)].map((_, i) => (
                            <span key={i} className={`session-dot ${i < (sessionsCompleted % 4) ? 'filled' : ''}`}
                                style={{ background: i < (sessionsCompleted % 4) ? modeInfo.color : undefined }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Settings */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3>⚙️ Impostazioni Timer</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Studio (min)</label>
                        <input type="number" min="1" max="120" value={studyDuration}
                            onChange={e => setStudyDuration(parseInt(e.target.value) || 25)}
                            style={{ marginBottom: 0 }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Pausa breve</label>
                        <input type="number" min="1" max="30" value={shortBreakDuration}
                            onChange={e => setShortBreakDuration(parseInt(e.target.value) || 5)}
                            style={{ marginBottom: 0 }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Pausa lunga</label>
                        <input type="number" min="1" max="60" value={longBreakDuration}
                            onChange={e => setLongBreakDuration(parseInt(e.target.value) || 15)}
                            style={{ marginBottom: 0 }} />
                    </div>
                </div>
                <button className="btn-secondary" onClick={handleSaveSettings} style={{ width: '100%' }}>💾 Salva Impostazioni</button>
            </div>
        </section>
    )
}
