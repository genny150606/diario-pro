import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useData } from '../../hooks/useData'
import { Plus, Sparkles, BookOpen, Trash2, Calendar, FileText, HelpCircle, CheckCircle, ChevronDown, Info, Search, Edit3, X, Zap, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

export default function NotesSection() {
    const { data, addNote, updateNote, deleteNote, saveData } = useData()
    const [activeTab, setActiveTab] = useState('notes')

    // Note Management States
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [subject, setSubject] = useState('Generale')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [editingNoteId, setEditingNoteId] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterSubject, setFilterSubject] = useState('Tutti')

    // AI States
    const [generating, setGenerating] = useState(false)
    const [enhancing, setEnhancing] = useState(null) // 'summary' or 'title'
    const [selectedNoteId, setSelectedNoteId] = useState(null)

    // Flashcard Study States
    const [studyMode, setStudyMode] = useState(false)
    const [currentFcIndex, setCurrentFcIndex] = useState(0)
    const [flippedCards, setFlippedCards] = useState(new Set())
    const [studyFcs, setStudyFcs] = useState([])
    const [swipeState, setSwipeState] = useState(null) // null, 'swipe-out-left', 'swipe-out-right', 'swipe-out-up'

    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://diario-pro.vercel.app')

    // NOTE ACTIONS
    const handleAddOrUpdateNote = () => {
        if (!title.trim()) return
        if (editingNoteId) {
            updateNote(editingNoteId, { title, content, subject, date })
            setEditingNoteId(null)
        } else {
            addNote({ title, content, subject, date })
        }
        resetNoteForm()
    }

    const resetNoteForm = () => {
        setTitle('')
        setContent('')
        setSubject('Generale')
        setDate(new Date().toISOString().split('T')[0])
        setEditingNoteId(null)
    }

    const startEditing = (note) => {
        setEditingNoteId(note.id)
        setTitle(note.title)
        setContent(note.content)
        setSubject(note.subject || 'Generale')
        setDate(note.date || new Date().toISOString().split('T')[0])
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDeleteNote = (id) => {
        if (window.confirm('Sei sicuro di voler eliminare questa nota?')) {
            deleteNote(id)
        }
    }

    // AI NOTE ACTIONS
    const handleSmartTitle = async () => {
        if (!content.trim()) return
        setEnhancing('title')
        try {
            const res = await fetch(`${apiUrl}/api/smart-title`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            })
            const result = await res.json()
            if (result.title) setTitle(result.title)
        } catch (err) {
            console.error("Smart Title ERR:", err)
        } finally {
            setEnhancing(null)
        }
    }

    const handleSummarize = async () => {
        if (!content.trim()) return
        setEnhancing('summary')
        try {
            const res = await fetch(`${apiUrl}/api/summarize-note`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            })
            const result = await res.json()
            if (result.summary) {
                setContent(prev => prev + "\n\n--- RIASSUNTO AI ---\n" + result.summary)
            }
        } catch (err) {
            console.error("Summarize ERR:", err)
        } finally {
            setEnhancing(null)
        }
    }

    // FLASHCARD ACTIONS
    const handleGenerateFlashcards = async () => {
        const note = data.notes.find(n => n.id === parseInt(selectedNoteId))
        if (!note) return

        setGenerating(true)
        try {
            const response = await fetch(`${apiUrl}/api/generate-flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: note.content,
                    subject: note.subject,
                    numberOfCards: 5
                })
            })

            const result = await response.json()
            if (!result.flashcards) throw new Error("Generazione fallita")

            const newFlashcards = result.flashcards.map(c => ({
                id: Date.now() + Math.random(),
                front: c.front,
                back: c.back,
                subject: note.subject,
                level: 0, // SRS level
                nextReview: Date.now()
            }))

            saveData({ ...data, flashcards: [...data.flashcards, ...newFlashcards] })
            alert(`✅ ${newFlashcards.length} flashcard create!`)
            setActiveTab('flashcards')
        } catch (err) {
            alert(`❌ Errore AI: ${err.message}`)
        } finally {
            setGenerating(false)
        }
    }

    const startStudySession = () => {
        const now = Date.now()
        const toStudy = data.flashcards.filter(fc => (fc.nextReview || 0) <= now)
        if (toStudy.length === 0) {
            if (window.confirm("Nessuna card da ripassare ora. Vuoi studiarle tutte comunque?")) {
                setStudyFcs([...data.flashcards])
            } else return
        } else {
            setStudyFcs(toStudy)
        }
        setStudyMode(true)
        setCurrentFcIndex(0)
        setFlippedCards(new Set())
    }

    const handleSrsRate = (fcId, rating) => {
        // rating: 1 (Hard), 2 (Good), 3 (Easy)
        // Triggera animazione in base al voto
        let animationClass = 'swipe-out-up'
        if (rating === 1) animationClass = 'swipe-out-left'
        if (rating === 3) animationClass = 'swipe-out-right'

        setSwipeState(animationClass)

        setTimeout(() => {
            const updatedFcs = data.flashcards.map(fc => {
                if (fc.id === fcId) {
                    const level = Math.max(0, (fc.level || 0) + (rating === 1 ? -1 : rating === 3 ? 1 : 0))
                    const interval = [0, 1, 3, 7, 14, 30, 90][Math.min(level, 6)] // Days
                    return {
                        ...fc,
                        level,
                        nextReview: Date.now() + (interval * 24 * 60 * 60 * 1000)
                    }
                }
                return fc
            })
            saveData({ ...data, flashcards: updatedFcs })

            if (currentFcIndex < studyFcs.length - 1) {
                setCurrentFcIndex(prev => prev + 1)
                setFlippedCards(new Set())
            } else {
                alert("Ottimo lavoro! Sessione completata. 🎉")
                setStudyMode(false)
            }
            // Reset animazione per la successiva
            setSwipeState(null)
        }, 600) // Aspetta che finisca l'animazione CSS (0.6s)
    }

    // FILTERS
    const filteredNotes = useMemo(() => {
        return data.notes
            .filter(n => {
                const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (n.content || '').toLowerCase().includes(searchQuery.toLowerCase());
                const matchesSubject = filterSubject === 'Tutti' || n.subject === filterSubject;
                return matchesSearch && matchesSubject;
            })
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
    }, [data.notes, searchQuery, filterSubject])

    const subjects = useMemo(() => {
        const set = new Set(data.notes.map(n => n.subject))
        return ['Tutti', ...Array.from(set)]
    }, [data.notes])

    if (studyMode && studyFcs.length > 0) {
        const fc = studyFcs[currentFcIndex]
        return createPortal(
            <div className="study-mode-overlay reveal-entrance">
                <div className="study-container" style={{ perspective: '2000px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '500px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2rem' }}>
                        <div className="study-progress" style={{ flex: 1 }}>
                            Card {currentFcIndex + 1} di {studyFcs.length}
                            <div className="progress-bar-container">
                                <div className="progress-bar-fill" style={{ width: `${((currentFcIndex + 1) / studyFcs.length) * 100}%` }}></div>
                            </div>
                        </div>
                        <button className="btn-icon" onClick={() => setStudyMode(false)} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '50%', padding: '0.5rem', alignSelf: 'center', marginLeft: '1rem' }}><X size={20} /></button>
                    </div>

                    <div className="card-stack" style={{ position: 'relative', width: '100%', height: '400px' }}>
                        {/* Carta Imminente (Sotto) - Effetto Stack */}
                        {currentFcIndex < studyFcs.length - 1 && (
                            <div className="study-card" style={{ position: 'absolute', top: 0, left: 0, scale: 0.95, translateY: '20px', zIndex: 0, opacity: 0.5, pointerEvents: 'none' }}>
                                <div className="study-card-inner">
                                    <div className="study-card-front" style={{ background: 'rgba(5,5,5,1)' }}></div>
                                </div>
                            </div>
                        )}

                        {/* Carta Corrente (Sopra) */}
                        <div className={`study-card ${swipeState || ''} ${flippedCards.has(fc.id) ? 'is-flipped' : ''}`} onClick={() => setFlippedCards(prev => new Set(prev).add(fc.id))}>
                            <div className="study-card-inner">
                                <div className="study-card-front">
                                    <span className="fc-subject-badge">{fc.subject}</span>
                                    <h2>{fc.front}</h2>
                                    <p className="hint">Clicca per girare</p>
                                </div>
                                <div className="study-card-back">
                                    <span className="fc-subject-badge">{fc.subject}</span>
                                    <h2>{fc.back}</h2>
                                </div>
                            </div>
                        </div>
                    </div>

                    {flippedCards.has(fc.id) && (
                        <div className="study-actions reveal-up" style={{ opacity: swipeState ? 0 : 1, transition: 'opacity 0.2s', marginTop: '2rem' }}>
                            <button className="btn-srs hard" onClick={() => handleSrsRate(fc.id, 1)}>NON LO SO</button>
                            <button className="btn-srs good" onClick={() => handleSrsRate(fc.id, 2)}>BENE</button>
                            <button className="btn-srs easy" onClick={() => handleSrsRate(fc.id, 3)}>LO SO</button>
                        </div>
                    )}
                </div>
            </div>,
            document.body
        )
    }

    return (
        <section className="section active reveal-entrance">
            <div className="hero">
                <h1><span className="gradient-text">Note & Flashcard</span> <BookOpen size={32} className="inline-icon hero-icon-floating" /></h1>
                <p>Gestisci i tuoi appunti e studia con l'intelligenza artificiale</p>
            </div>

            <div className="tabs">
                <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
                    Note ({data.notes.length})
                </button>
                <button className={`tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`} onClick={() => setActiveTab('flashcards')}>
                    Flashcard ({data.flashcards.length})
                </button>
            </div>

            {activeTab === 'notes' && (
                <div className="tab-content active">
                    <div className="card glass-card hover-glow note-input-card">
                        <h3><Plus size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> {editingNoteId ? 'Modifica Nota' : 'Nuova Nota'}</h3>
                        <div className="form-group">
                            <div className="form-row-ai">
                                <input
                                    type="text"
                                    placeholder="Titolo nota..."
                                    className="title-input"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                                <button className="btn-magic-title" onClick={handleSmartTitle} disabled={enhancing === 'title' || !content.trim()}>
                                    {enhancing === 'title' ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
                                </button>
                            </div>
                            <div className="form-row" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <select style={{ flex: 1 }} value={subject} onChange={e => setSubject(e.target.value)}>
                                    <option value="Generale">Generale</option>
                                    <option value="Matematica">Matematica</option>
                                    <option value="Italiano">Italiano</option>
                                    <option value="Inglese">Inglese</option>
                                    <option value="Scienze">Scienze</option>
                                    <option value="Storia">Storia</option>
                                </select>
                                <input type="date" style={{ flex: 1 }} value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div className="textarea-wrapper">
                                <textarea
                                    placeholder="Scrivi i tuoi appunti..."
                                    style={{ minHeight: 150, marginTop: '1rem' }}
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                />
                                <button className="btn-summarize-ai" onClick={handleSummarize} disabled={enhancing === 'summary' || !content.trim()}>
                                    {enhancing === 'summary' ? <RefreshCw size={14} className="spin" /> : <><Zap size={14} /> Riassumi</>}
                                </button>
                            </div>
                            <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                                <button className="btn-primary" style={{ flex: 2 }} onClick={handleAddOrUpdateNote} disabled={!title.trim()}>
                                    <FileText size={18} /> {editingNoteId ? 'Aggiorna Nota' : 'Salva Nota'}
                                </button>
                                {editingNoteId && (
                                    <button className="btn-secondary" style={{ flex: 1 }} onClick={resetNoteForm}>
                                        Annulla
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="search-filter-bar card glass-card">
                        <div className="search-input-wrapper">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Cerca tra le note..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select className="subject-filter" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {filteredNotes.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                            {searchQuery ? 'Nessun risultato trovato' : 'Nessuna nota ancora.'} <Sparkles size={16} className="text-accent" />
                        </p>
                    ) : (
                        <div className="notes-list">
                            {filteredNotes.map(note => (
                                <div key={note.id} className="card glass-card hover-glow note-item-card">
                                    <div className="note-item-header">
                                        <div className="note-title-info">
                                            <h4>{note.title}</h4>
                                            <div className="note-meta">
                                                <span className="note-tag">{note.subject}</span>
                                                <span className="note-date"><Calendar size={12} /> {note.date}</span>
                                            </div>
                                        </div>
                                        <div className="note-item-actions">
                                            <button className="btn-icon-edit" onClick={() => startEditing(note)}>
                                                <Edit3 size={16} />
                                            </button>
                                            <button className="btn-icon-delete" onClick={() => handleDeleteNote(note.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    {note.content && <p className="note-content-preview">{note.content}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'flashcards' && (
                <div className="tab-content active">
                    <div className="flashcards-top-actions">
                        <div className="card glass-card hover-glow animated-border ai-gen-card" style={{ flex: 1 }}>
                            <h3><Sparkles size={18} color="var(--color-accent)" style={{ verticalAlign: 'middle', marginRight: '8px' }} /> AI Generator</h3>
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <div className="custom-select-wrapper">
                                    <select value={selectedNoteId || ''} onChange={e => setSelectedNoteId(e.target.value)}>
                                        <option value="">-- Seleziona nota --</option>
                                        {data.notes.map(n => (
                                            <option key={n.id} value={n.id}>{n.title}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="select-icon" size={16} />
                                </div>
                                <button className="btn-primary btn-ai" style={{ width: '100%', marginTop: '0.75rem' }} onClick={handleGenerateFlashcards} disabled={generating || !selectedNoteId}>
                                    {generating ? <RefreshCw className="spin" size={18} /> : <><Zap size={18} /> Genera</>}
                                </button>
                            </div>
                        </div>

                        <div className="study-stats-card card glass-card" style={{ flex: 1 }}>
                            <h3><BookOpen size={18} style={{ marginRight: '8px' }} /> Sessione</h3>
                            <div className="stats-row">
                                <div className="stat">
                                    <span className="val">{data.flashcards.filter(f => (f.nextReview || 0) <= Date.now()).length}</span>
                                    <span className="lab">Da ripassare</span>
                                </div>
                                <div className="stat">
                                    <span className="val">{data.flashcards.length}</span>
                                    <span className="lab">Totali</span>
                                </div>
                            </div>
                            <button className="btn-primary pulse" style={{ width: '100%', marginTop: '1rem' }} onClick={startStudySession} disabled={data.flashcards.length === 0}>
                                AVVIA STUDIO
                            </button>
                        </div>
                    </div>

                    {data.flashcards.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                            Nessuna flashcard. Genera con l'AI o dalle tue note!
                        </p>
                    ) : (
                        <div className="flashcards-grid">
                            {data.flashcards.map((fc) => (
                                <div
                                    key={fc.id}
                                    className={`card flashcard-item-card ${flippedCards.has(fc.id) ? 'is-flipped' : ''}`}
                                    onClick={() => setFlippedCards(prev => {
                                        const next = new Set(prev)
                                        if (next.has(fc.id)) next.delete(fc.id)
                                        else next.add(fc.id)
                                        return next
                                    })}
                                >
                                    <div className="flashcard-card-content">
                                        <div className="fc-front">
                                            <div className="fc-q-label">DOMANDA</div>
                                            <div className="fc-text">{fc.front}</div>
                                        </div>
                                        <div className="fc-back">
                                            <div className="fc-a-label">RISPOSTA</div>
                                            <div className="fc-text">{fc.back}</div>
                                        </div>
                                    </div>
                                    <div className="fc-footer">
                                        <span className="fc-subject">{fc.subject}</span>
                                        <button className="btn-icon-delete sm" onClick={(e) => { e.stopPropagation(); saveData({ ...data, flashcards: data.flashcards.filter(f => f.id !== fc.id) }) }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
