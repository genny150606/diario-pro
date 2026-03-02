import { useState, useMemo, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useData } from '../../hooks/useData'
import { useToast } from '../../contexts/ToastContext'
import {
    Plus, Sparkles, BookOpen, Trash2, Calendar, FileText, Zap, RefreshCw,
    Search, Edit3, X, ChevronDown, Bold, Italic, Heading1, Heading2,
    Code, Quote, List, ListOrdered, Undo2, Redo2, Timer, BarChart3, Tag
} from 'lucide-react'
import Skeleton from '../ui/Skeleton'

// ═══ NOTE COLORS ═══
const NOTE_COLORS = [
    { id: 'default', hex: '#6495FF' },
    { id: 'red', hex: '#FF3B30' },
    { id: 'yellow', hex: '#FFD700' },
    { id: 'green', hex: '#30D158' },
    { id: 'purple', hex: '#9D4EDD' },
    { id: 'pink', hex: '#FF6B9D' },
]

// ═══ TAG SUGGESTIONS ═══
const TAG_SUGGESTIONS = ['importante', 'revisione', 'domanda', 'difficile', 'memorizzare', 'formula', 'esempio', 'pratica', 'quiz']

export default function NotesSection() {
    const { data, loading, addNote, updateNote, deleteNote, saveData } = useData()
    const { addToast } = useToast()
    const [activeTab, setActiveTab] = useState('notes')

    // Note States
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [subject, setSubject] = useState('Generale')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [editingNoteId, setEditingNoteId] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterSubject, setFilterSubject] = useState('Tutti')
    const [noteColor, setNoteColor] = useState('default')
    const [noteTags, setNoteTags] = useState([])
    const [tagInput, setTagInput] = useState('')

    // AI States
    const [generating, setGenerating] = useState(false)
    const [enhancing, setEnhancing] = useState(null)
    const [selectedNoteId, setSelectedNoteId] = useState(null)

    // Flashcard States
    const [studyMode, setStudyMode] = useState(false)
    const [studyType, setStudyType] = useState('classic') // 'classic' | 'speedrun'
    const [currentFcIndex, setCurrentFcIndex] = useState(0)
    const [flippedCards, setFlippedCards] = useState(new Set())
    const [studyFcs, setStudyFcs] = useState([])
    const [swipeState, setSwipeState] = useState(null)
    const [speedTimer, setSpeedTimer] = useState(30)
    const [fcCreateMode, setFcCreateMode] = useState('ai') // 'ai' | 'single' | 'batch'
    const [fcFront, setFcFront] = useState('')
    const [fcBack, setFcBack] = useState('')
    const [fcBatchText, setFcBatchText] = useState('')

    // Undo history for editor
    const [history, setHistory] = useState([''])
    const [historyIdx, setHistoryIdx] = useState(0)

    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://diario-pro.vercel.app')

    // ═══ MARKDOWN TOOLBAR ═══
    const applyFormat = useCallback((format) => {
        const el = document.getElementById('note-editor')
        if (!el) return
        const s = el.selectionStart, e = el.selectionEnd
        const sel = content.substring(s, e)
        let newVal = content, pos = s

        const formatMap = {
            bold: { pre: '**', post: '**' },
            italic: { pre: '*', post: '*' },
            code: { pre: '`', post: '`' },
            h1: { pre: '# ', post: '' },
            h2: { pre: '## ', post: '' },
            quote: { pre: '> ', post: '' },
            list: { pre: '- ', post: '' },
            olist: { pre: '1. ', post: '' },
        }

        const f = formatMap[format]
        if (!f) return
        newVal = content.substring(0, s) + f.pre + sel + f.post + content.substring(e)
        pos = s + f.pre.length

        setContent(newVal)
        pushHistory(newVal)
        setTimeout(() => { el.selectionStart = pos; el.selectionEnd = pos + sel.length; el.focus() }, 0)
    }, [content])

    const pushHistory = (val) => {
        const h = history.slice(0, historyIdx + 1)
        h.push(val)
        setHistory(h)
        setHistoryIdx(h.length - 1)
    }

    const undo = () => { if (historyIdx > 0) { setHistoryIdx(historyIdx - 1); setContent(history[historyIdx - 1]) } }
    const redo = () => { if (historyIdx < history.length - 1) { setHistoryIdx(historyIdx + 1); setContent(history[historyIdx + 1]) } }

    // ═══ TAG MANAGEMENT ═══
    const addTag = (tag) => {
        const t = tag.trim().toLowerCase()
        if (t && !noteTags.includes(t)) setNoteTags([...noteTags, t])
        setTagInput('')
    }

    // ═══ NOTE ACTIONS ═══
    const handleAddOrUpdateNote = () => {
        if (!title.trim()) return
        const noteData = { title, content, subject, date, color: noteColor, tags: noteTags }
        if (editingNoteId) {
            updateNote(editingNoteId, noteData)
            setEditingNoteId(null)
        } else {
            addNote(noteData)
        }
        resetNoteForm()
    }

    const resetNoteForm = () => {
        setTitle(''); setContent(''); setSubject('Generale')
        setDate(new Date().toISOString().split('T')[0])
        setEditingNoteId(null); setNoteColor('default'); setNoteTags([])
    }

    const startEditing = (note) => {
        setEditingNoteId(note.id); setTitle(note.title); setContent(note.content)
        setSubject(note.subject || 'Generale'); setDate(note.date || new Date().toISOString().split('T')[0])
        setNoteColor(note.color || 'default'); setNoteTags(note.tags || [])
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDeleteNote = (id) => { if (window.confirm('Eliminare?')) deleteNote(id) }

    // ═══ AI NOTE ACTIONS ═══
    const handleSmartTitle = async () => {
        if (!content.trim()) return
        setEnhancing('title')
        try {
            const res = await fetch(`${apiUrl}/api/smart-title`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
            const r = await res.json()
            if (r.title) setTitle(r.title)
        } catch (err) { /* silent */ }
        finally { setEnhancing(null) }
    }

    const handleSummarize = async () => {
        if (!content.trim()) return
        setEnhancing('summary')
        try {
            const res = await fetch(`${apiUrl}/api/summarize-note`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
            const r = await res.json()
            if (r.summary) setContent(prev => prev + "\n\n--- RIASSUNTO AI ---\n" + r.summary)
        } catch (err) { /* silent */ }
        finally { setEnhancing(null) }
    }

    // ═══ FLASHCARD CREATION ═══
    const handleGenerateFlashcards = async () => {
        const note = data.notes.find(n => n.id === parseInt(selectedNoteId))
        if (!note) return
        setGenerating(true)
        try {
            const response = await fetch(`${apiUrl}/api/generate-flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: note.content, subject: note.subject, numberOfCards: 5 })
            })
            const result = await response.json()
            if (!result.flashcards) throw new Error("Generazione fallita")
            const newFcs = result.flashcards.map(c => ({
                id: Date.now() + Math.random(), front: c.front, back: c.back,
                subject: note.subject, level: 0, nextReview: Date.now()
            }))
            saveData({ ...data, flashcards: [...data.flashcards, ...newFcs] })
            addToast(`✅ ${newFcs.length} flashcard create!`, 'success')
        } catch (err) { addToast(`❌ Errore: ${err.message}`, 'error') }
        finally { setGenerating(false) }
    }

    const createSingleFlashcard = () => {
        if (!fcFront.trim() || !fcBack.trim()) return
        const fc = { id: Date.now(), front: fcFront, back: fcBack, subject: 'Manuale', level: 0, nextReview: Date.now() }
        saveData({ ...data, flashcards: [...data.flashcards, fc] })
        setFcFront(''); setFcBack('')
        addToast('✅ Flashcard creata!', 'success')
    }

    const createBatchFlashcards = () => {
        const cards = fcBatchText.split('\n').filter(l => l.includes('|')).map(line => {
            const [f, b] = line.split('|').map(s => s.trim())
            return { id: Date.now() + Math.random(), front: f, back: b, subject: 'Batch', level: 0, nextReview: Date.now() }
        })
        if (cards.length === 0) return
        saveData({ ...data, flashcards: [...data.flashcards, ...cards] })
        setFcBatchText('')
        addToast(`✅ ${cards.length} flashcard create!`, 'success')
    }

    // ═══ STUDY SESSION ═══
    const startStudySession = (type = 'classic') => {
        const now = Date.now()
        const toStudy = data.flashcards.filter(fc => (fc.nextReview || 0) <= now)
        if (toStudy.length === 0) {
            if (window.confirm("Nessuna card da ripassare. Studiarle tutte?")) {
                setStudyFcs([...data.flashcards])
            } else return
        } else { setStudyFcs(toStudy) }
        setStudyType(type)
        setStudyMode(true)
        setCurrentFcIndex(0)
        setFlippedCards(new Set())
        setSpeedTimer(30)
    }

    // Speedrun timer
    useEffect(() => {
        if (!studyMode || studyType !== 'speedrun') return
        const t = setInterval(() => {
            setSpeedTimer(prev => {
                if (prev <= 1) { handleSrsRate(studyFcs[currentFcIndex]?.id, 1); return 30 }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(t)
    }, [studyMode, studyType, currentFcIndex])

    const handleSrsRate = (fcId, rating) => {
        let anim = 'swipe-out-up'
        if (rating === 1) anim = 'swipe-out-left'
        if (rating === 3) anim = 'swipe-out-right'
        setSwipeState(anim)

        setTimeout(() => {
            const updatedFcs = data.flashcards.map(fc => {
                if (fc.id === fcId) {
                    const level = Math.max(0, (fc.level || 0) + (rating === 1 ? -1 : rating === 3 ? 1 : 0))
                    const interval = [0, 1, 3, 7, 14, 30, 90][Math.min(level, 6)]
                    return { ...fc, level, nextReview: Date.now() + (interval * 86400000) }
                }
                return fc
            })
            saveData({ ...data, flashcards: updatedFcs })

            if (currentFcIndex < studyFcs.length - 1) {
                setCurrentFcIndex(prev => prev + 1)
                setFlippedCards(new Set())
                setSpeedTimer(30)
            } else {
                addToast("Sessione completata! 🎉", "success")
                setStudyMode(false)
            }
            setSwipeState(null)
        }, 600)
    }

    // ═══ FLASHCARD STATS ═══
    const fcStats = useMemo(() => {
        const fcs = data.flashcards
        const total = fcs.length
        const mastered = fcs.filter(c => (c.level || 0) >= 5).length
        const learning = fcs.filter(c => (c.level || 0) >= 1 && (c.level || 0) < 5).length
        const newCards = fcs.filter(c => (c.level || 0) === 0).length
        const dueNow = fcs.filter(c => (c.nextReview || 0) <= Date.now()).length
        return { total, mastered, learning, newCards, dueNow }
    }, [data.flashcards])

    // ═══ FILTERS ═══
    const filteredNotes = useMemo(() => {
        return data.notes
            .filter(n => {
                const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (n.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (n.tags || []).some(t => t.includes(searchQuery.toLowerCase()))
                const matchesSubject = filterSubject === 'Tutti' || n.subject === filterSubject
                return matchesSearch && matchesSubject
            })
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
    }, [data.notes, searchQuery, filterSubject])

    const subjects = useMemo(() => {
        const set = new Set(data.notes.map(n => n.subject))
        return ['Tutti', ...Array.from(set)]
    }, [data.notes])

    // ═══ STUDY MODE OVERLAY ═══
    if (studyMode && studyFcs.length > 0) {
        const fc = studyFcs[currentFcIndex]
        return createPortal(
            <div className="study-mode-overlay reveal-entrance">
                <div className="study-container" style={{ perspective: '2000px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '500px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2rem', alignItems: 'center' }}>
                        <div className="study-progress" style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span>Card {currentFcIndex + 1} di {studyFcs.length}</span>
                                {studyType === 'speedrun' && (
                                    <span style={{ fontSize: 20, fontWeight: 800, color: speedTimer <= 10 ? '#FF3B30' : '#6495FF' }}>
                                        <Timer size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />{speedTimer}s
                                    </span>
                                )}
                            </div>
                            <div className="progress-bar-container">
                                <div className="progress-bar-fill" style={{ width: `${((currentFcIndex + 1) / studyFcs.length) * 100}%` }}></div>
                            </div>
                        </div>
                        <button className="btn-icon" onClick={() => setStudyMode(false)} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '50%', padding: '0.5rem', marginLeft: '1rem' }}><X size={20} /></button>
                    </div>

                    <div className="card-stack" style={{ position: 'relative', width: '100%', height: '400px' }}>
                        {currentFcIndex < studyFcs.length - 1 && (
                            <div className="study-card" style={{ position: 'absolute', top: 0, left: 0, scale: 0.95, translateY: '20px', zIndex: 0, opacity: 0.5, pointerEvents: 'none' }}>
                                <div className="study-card-inner"><div className="study-card-front" style={{ background: 'rgba(5,5,5,1)' }}></div></div>
                            </div>
                        )}
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

    // ═══ MAIN RENDER ═══
    return (
        <section className="notes-section animate-fade-in">
            <div className="section-header">
                <div className="header-content">
                    <h1>Il tuo Diario Geometra</h1>
                    <p>Organizza, studia e potenzia la tua mente con l'IA.</p>
                </div>
                <div className="tabs">
                    <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
                        <FileText size={18} /> Note
                    </button>
                    <button className={`tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`} onClick={() => setActiveTab('flashcards')}>
                        <Zap size={18} /> Flashcards
                        {fcStats.dueNow > 0 && <span style={{ marginLeft: 6, background: '#FF3B30', color: '#fff', borderRadius: 10, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>{fcStats.dueNow}</span>}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-skeletons" style={{ padding: '0 1.5rem' }}>
                    <div className="card glass-card skeleton-card" style={{ height: '300px', marginBottom: '1.5rem' }}>
                        <Skeleton variant="title" style={{ width: '30%', margin: '1.5rem' }} />
                        <Skeleton variant="text" style={{ width: '90%', margin: '0 1.5rem 0.5rem' }} />
                        <Skeleton variant="text" style={{ width: '85%', margin: '0 1.5rem 0.5rem' }} />
                    </div>
                </div>

            ) : activeTab === 'notes' && (
                <div className="tab-content active">
                    <div className="card glass-card hover-glow note-input-card">
                        <h3><Plus size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> {editingNoteId ? 'Modifica Nota' : 'Nuova Nota'}</h3>
                        <div className="form-group">
                            {/* Title + AI */}
                            <div className="form-row-ai">
                                <input type="text" placeholder="Titolo nota..." className="title-input" value={title} onChange={e => setTitle(e.target.value)} />
                                <button className="btn-magic-title" onClick={handleSmartTitle} disabled={enhancing === 'title' || !content.trim()}>
                                    {enhancing === 'title' ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
                                </button>
                            </div>

                            {/* Subject + Date */}
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

                            {/* ═══ COLOR PICKER ═══ */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: '1rem' }}>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>🎨</span>
                                {NOTE_COLORS.map(c => (
                                    <div key={c.id} onClick={() => setNoteColor(c.id)} style={{
                                        width: 26, height: 26, borderRadius: '50%', background: c.hex, cursor: 'pointer',
                                        border: noteColor === c.id ? '3px solid #fff' : '2px solid transparent',
                                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, color: '#fff', fontWeight: 700
                                    }}>
                                        {noteColor === c.id && '✓'}
                                    </div>
                                ))}
                            </div>

                            {/* ═══ TAGS ═══ */}
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                    {noteTags.map(tag => (
                                        <span key={tag} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '3px 10px', background: 'rgba(100,150,255,0.2)',
                                            border: '1px solid rgba(100,150,255,0.3)', borderRadius: 16,
                                            fontSize: 12, fontWeight: 600, color: '#6495FF'
                                        }}>
                                            {tag}
                                            <X size={12} style={{ cursor: 'pointer' }} onClick={() => setNoteTags(noteTags.filter(t => t !== tag))} />
                                        </span>
                                    ))}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input type="text" placeholder="Aggiungi tag..." value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
                                        style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 13 }}
                                    />
                                    {tagInput && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                            background: 'rgba(15,15,20,0.95)', border: '1px solid rgba(100,150,255,0.2)',
                                            borderRadius: 8, marginTop: 4, maxHeight: 150, overflowY: 'auto'
                                        }}>
                                            {TAG_SUGGESTIONS.filter(s => s.includes(tagInput.toLowerCase()) && !noteTags.includes(s)).map(s => (
                                                <div key={s} onClick={() => addTag(s)} style={{
                                                    padding: '8px 12px', cursor: 'pointer', fontSize: 13, transition: 'background 0.15s'
                                                }}
                                                    onMouseEnter={e => e.target.style.background = 'rgba(100,150,255,0.1)'}
                                                    onMouseLeave={e => e.target.style.background = 'transparent'}
                                                >
                                                    <Tag size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />{s}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ═══ MARKDOWN TOOLBAR ═══ */}
                            <div style={{
                                display: 'flex', gap: 3, padding: '8px 0', marginTop: '1rem',
                                borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap'
                            }}>
                                {[
                                    { icon: Bold, action: 'bold', label: 'Bold' },
                                    { icon: Italic, action: 'italic', label: 'Italic' },
                                    { icon: Heading1, action: 'h1', label: 'H1' },
                                    { icon: Heading2, action: 'h2', label: 'H2' },
                                    { icon: Code, action: 'code', label: 'Code' },
                                    { icon: Quote, action: 'quote', label: 'Quote' },
                                    { icon: List, action: 'list', label: 'Lista' },
                                    { icon: ListOrdered, action: 'olist', label: 'Lista num.' },
                                ].map(btn => (
                                    <button key={btn.action} onClick={() => applyFormat(btn.action)} title={btn.label} style={{
                                        background: 'rgba(100,150,255,0.08)', border: '1px solid rgba(100,150,255,0.15)',
                                        color: '#6495FF', borderRadius: 5, padding: '5px 8px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                                    }}>
                                        <btn.icon size={14} />
                                    </button>
                                ))}
                                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 6px', alignSelf: 'center' }} />
                                <button onClick={undo} title="Undo" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '5px 8px' }}><Undo2 size={14} /></button>
                                <button onClick={redo} title="Redo" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '5px 8px' }}><Redo2 size={14} /></button>
                            </div>

                            {/* Editor */}
                            <div className="textarea-wrapper">
                                <textarea
                                    id="note-editor"
                                    placeholder="Scrivi i tuoi appunti... Supporta **bold**, *italic*, # heading, `code`"
                                    style={{ minHeight: 180, marginTop: 0, fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6 }}
                                    value={content}
                                    onChange={e => { setContent(e.target.value); pushHistory(e.target.value) }}
                                />
                                <button className="btn-summarize-ai" onClick={handleSummarize} disabled={enhancing === 'summary' || !content.trim()}>
                                    {enhancing === 'summary' ? <RefreshCw size={14} className="spin" /> : <><Zap size={14} /> Riassumi</>}
                                </button>
                            </div>

                            {/* Markdown hint */}
                            <div style={{ padding: '6px 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                                💡 **bold** *italic* `code` &gt; quote # heading - lista
                            </div>

                            {/* Actions */}
                            <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                                <button className="btn-primary" style={{ flex: 2 }} onClick={handleAddOrUpdateNote} disabled={!title.trim()}>
                                    <FileText size={18} /> {editingNoteId ? 'Aggiorna Nota' : 'Salva Nota'}
                                </button>
                                {editingNoteId && (
                                    <button className="btn-secondary" style={{ flex: 1 }} onClick={resetNoteForm}>Annulla</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="search-filter-bar card glass-card">
                        <div className="search-input-wrapper">
                            <Search size={18} />
                            <input type="text" placeholder="Cerca note o tag..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <select className="subject-filter" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Notes List */}
                    {filteredNotes.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                            {searchQuery ? 'Nessun risultato' : 'Nessuna nota ancora.'} <Sparkles size={16} className="text-accent" />
                        </p>
                    ) : (
                        <div className="notes-list">
                            {filteredNotes.map(note => {
                                const color = NOTE_COLORS.find(c => c.id === (note.color || 'default'))?.hex || '#6495FF'
                                return (
                                    <div key={note.id} className="card glass-card hover-glow note-item-card" style={{ borderLeft: `4px solid ${color}` }}>
                                        <div className="note-item-header">
                                            <div className="note-title-info">
                                                <h4>{note.title}</h4>
                                                <div className="note-meta">
                                                    <span className="note-tag">{note.subject}</span>
                                                    <span className="note-date"><Calendar size={12} /> {note.date}</span>
                                                </div>
                                                {(note.tags || []).length > 0 && (
                                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                                        {note.tags.map(t => (
                                                            <span key={t} style={{
                                                                padding: '2px 8px', fontSize: 10, fontWeight: 600,
                                                                background: 'rgba(100,150,255,0.1)', color: '#6495FF',
                                                                borderRadius: 12, border: '1px solid rgba(100,150,255,0.2)'
                                                            }}>{t}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="note-item-actions">
                                                <button className="btn-icon-edit" onClick={() => startEditing(note)}><Edit3 size={16} /></button>
                                                <button className="btn-icon-delete" onClick={() => handleDeleteNote(note.id)}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        {note.content && <p className="note-content-preview">{note.content}</p>}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ FLASHCARDS TAB ═══ */}
            {activeTab === 'flashcards' && (
                <div className="tab-content active">

                    {/* ═══ FLASHCARD STATS ═══ */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                        gap: '0.8rem', marginBottom: '1.5rem'
                    }}>
                        {[
                            { icon: '📚', label: 'Totali', value: fcStats.total },
                            { icon: '🔥', label: 'Da ripassare', value: fcStats.dueNow, color: fcStats.dueNow > 0 ? '#FF3B30' : undefined },
                            { icon: '📖', label: 'In studio', value: fcStats.learning },
                            { icon: '✅', label: 'Padroneggiate', value: fcStats.mastered, color: '#30D158' },
                            { icon: '🆕', label: 'Nuove', value: fcStats.newCards },
                        ].map((s, i) => (
                            <div key={i} className="card glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                                <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: s.color || '#6495FF' }}>{s.value}</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* ═══ STUDY MODE SELECTOR ═══ */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="card glass-card hover-glow" onClick={() => startStudySession('classic')} style={{ padding: '1.5rem', cursor: 'pointer', textAlign: 'center' }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>🎴</div>
                            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Studio Classico</h3>
                            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Flashcard con flip e SRS</p>
                            <button className="btn-primary pulse" style={{ width: '100%', marginTop: '1rem' }} disabled={data.flashcards.length === 0}>
                                AVVIA ({fcStats.dueNow || fcStats.total})
                            </button>
                        </div>
                        <div className="card glass-card hover-glow" onClick={() => startStudySession('speedrun')} style={{ padding: '1.5rem', cursor: 'pointer', textAlign: 'center' }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
                            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Speedrun</h3>
                            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>30 secondi per rispondere!</p>
                            <button className="btn-primary" style={{ width: '100%', marginTop: '1rem', background: 'rgba(255,159,10,0.2)', borderColor: '#FF9F0A', color: '#FF9F0A' }} disabled={data.flashcards.length === 0}>
                                SPEEDRUN ⚡
                            </button>
                        </div>
                    </div>

                    {/* ═══ FLASHCARD CREATION ═══ */}
                    <div className="card glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                            {[
                                { id: 'ai', label: '✨ AI Genera' },
                                { id: 'single', label: '✏️ Singola' },
                                { id: 'batch', label: '📋 Batch' },
                            ].map(m => (
                                <button key={m.id} onClick={() => setFcCreateMode(m.id)} style={{
                                    padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s',
                                    background: fcCreateMode === m.id ? 'rgba(100,150,255,0.2)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${fcCreateMode === m.id ? '#6495FF' : 'rgba(255,255,255,0.08)'}`,
                                    color: fcCreateMode === m.id ? '#6495FF' : 'rgba(255,255,255,0.5)',
                                }}>{m.label}</button>
                            ))}
                        </div>

                        {fcCreateMode === 'ai' && (
                            <div>
                                <div className="custom-select-wrapper">
                                    <select value={selectedNoteId || ''} onChange={e => setSelectedNoteId(e.target.value)}>
                                        <option value="">-- Seleziona nota --</option>
                                        {data.notes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                                    </select>
                                    <ChevronDown className="select-icon" size={16} />
                                </div>
                                <button className="btn-primary btn-ai" style={{ width: '100%', marginTop: '0.75rem' }} onClick={handleGenerateFlashcards} disabled={generating || !selectedNoteId}>
                                    {generating ? <RefreshCw className="spin" size={18} /> : <><Zap size={18} /> Genera con AI</>}
                                </button>
                            </div>
                        )}

                        {fcCreateMode === 'single' && (
                            <div>
                                <input type="text" placeholder="Domanda..." value={fcFront} onChange={e => setFcFront(e.target.value)}
                                    style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 14, marginBottom: 8 }} />
                                <input type="text" placeholder="Risposta..." value={fcBack} onChange={e => setFcBack(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') createSingleFlashcard() }}
                                    style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 14, marginBottom: 8 }} />
                                <button className="btn-primary" style={{ width: '100%' }} onClick={createSingleFlashcard} disabled={!fcFront.trim() || !fcBack.trim()}>
                                    <Plus size={16} /> Crea Flashcard
                                </button>
                            </div>
                        )}

                        {fcCreateMode === 'batch' && (
                            <div>
                                <textarea placeholder={'Formato: domanda|risposta (uno per riga)\nEs:\nCapitale d\'Italia|Roma\n2+2|4'} value={fcBatchText} onChange={e => setFcBatchText(e.target.value)}
                                    style={{ width: '100%', minHeight: 150, padding: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'monospace', marginBottom: 8 }} />
                                <button className="btn-primary" style={{ width: '100%' }} onClick={createBatchFlashcards}>
                                    Crea {fcBatchText.split('\n').filter(l => l.includes('|')).length} Flashcard
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ═══ FLASHCARDS GRID ═══ */}
                    {data.flashcards.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                            Nessuna flashcard. Genera con l'AI o creale manualmente!
                        </p>
                    ) : (
                        <div className="flashcards-grid">
                            {data.flashcards.map(fc => (
                                <div key={fc.id}
                                    className={`card flashcard-item-card ${flippedCards.has(fc.id) ? 'is-flipped' : ''}`}
                                    onClick={() => setFlippedCards(prev => {
                                        const next = new Set(prev)
                                        if (next.has(fc.id)) next.delete(fc.id); else next.add(fc.id)
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {(fc.level || 0) > 0 && (
                                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                                                    Lv.{fc.level}
                                                </span>
                                            )}
                                            <button className="btn-icon-delete sm" onClick={(e) => { e.stopPropagation(); saveData({ ...data, flashcards: data.flashcards.filter(f => f.id !== fc.id) }) }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
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
