import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Settings, Coffee, Leaf, Book, Save } from 'lucide-react'
import './PomodoroSection.css'

const MODES = {
    study: { label: 'Studio', Icon: Book, color: '#5B9FF3' },
    shortBreak: { label: 'Pausa Breve', Icon: Coffee, color: '#30D158' },
    longBreak: { label: 'Pausa Lunga', Icon: Leaf, color: '#FF9F0A' }
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
            <div className="pomodoro-container-card">
                <div className="pomodoro-mode-selector">
                    {Object.entries(MODES).map(([mKey, mInfo]) => {
                        const Icon = mInfo.Icon
                        return (
                            <button
                                key={mKey}
                                className={`mode-btn ${mode === mKey ? 'active' : ''}`}
                                onClick={() => { setMode(mKey); setTimeLeft(mInfo.label === 'Studio' ? studyDuration * 60 : mInfo.label === 'Pausa Breve' ? shortBreakDuration * 60 : longBreakDuration * 60); setIsRunning(false); }}
                                style={{ '--mode-color': mInfo.color }}
                            >
                                <Icon size={16} /> {mInfo.label}
                            </button>
                        )
                    })}
                </div>

                <div className="pomodoro-timer-display">
                    <div className="timer-ring-wrapper">
                        <svg viewBox="0 0 200 200" className="timer-svg">
                            <circle cx="100" cy="100" r="92" className="ring-bg" />
                            <circle
                                cx="100" cy="100" r="92"
                                className="ring-progress"
                                stroke={modeInfo.color}
                                strokeDasharray={`${2 * Math.PI * 92}`}
                                strokeDashoffset={`${2 * Math.PI * 92 * (1 - progress / 100)}`}
                            />
                        </svg>
                        <div className="timer-content">
                            <div className="timer-digits">{formatTime(timeLeft)}</div>
                            <div className="timer-mode-label">{modeInfo.label.toUpperCase()}</div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="pomodoro-actions">
                    <button className={`pomo-action-btn ${isRunning ? 'pause' : 'start'}`} onClick={isRunning ? handlePause : handleStart} style={{ '--btn-color': modeInfo.color }}>
                        {isRunning ? <><Pause size={24} /> PAUSA</> : <><Play size={24} /> AVVIA</>}
                    </button>
                    <button className="pomo-action-btn reset" onClick={handleReset}>
                        <RotateCcw size={20} />
                    </button>
                </div>

                {/* Sessions counter */}
                <div className="pomodoro-status-footer">
                    <div className="session-count">
                        <span className="count-num">{sessionsCompleted}</span> sessioni completate
                    </div>
                    <div className="session-dots-progress">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className={`session-pip ${i < (sessionsCompleted % 4) ? 'done' : ''}`}
                                style={{ background: i < (sessionsCompleted % 4) ? modeInfo.color : undefined }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Settings */}
            <div className="card pomo-settings-card">
                <h3><Settings size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Impostazioni Timer</h3>
                <div className="pomo-settings-grid">
                    <div className="setting-input-group">
                        <label>Studio (min)</label>
                        <input type="number" min="1" max="120" value={studyDuration}
                            onChange={e => setStudyDuration(parseInt(e.target.value) || 25)} />
                    </div>
                    <div className="setting-input-group">
                        <label>Pausa breve</label>
                        <input type="number" min="1" max="30" value={shortBreakDuration}
                            onChange={e => setShortBreakDuration(parseInt(e.target.value) || 5)} />
                    </div>
                    <div className="setting-input-group">
                        <label>Pausa lunga</label>
                        <input type="number" min="1" max="60" value={longBreakDuration}
                            onChange={e => setLongBreakDuration(parseInt(e.target.value) || 15)} />
                    </div>
                </div>
                <button className="btn-secondary pomo-save-btn" onClick={handleSaveSettings}>
                    <Save size={16} /> Salva Impostazioni
                </button>
            </div>
        </section>
    )
}
