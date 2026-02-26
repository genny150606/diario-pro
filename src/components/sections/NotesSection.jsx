import { useState } from 'react'
import { useData } from '../../hooks/useData'
import { Plus, Sparkles, BookOpen, Trash2, Calendar, FileText, HelpCircle, CheckCircle, ChevronDown, Info } from 'lucide-react'

export default function NotesSection() {
    const { data, addNote, deleteNote, saveData } = useData()
    const [activeTab, setActiveTab] = useState('notes')
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [subject, setSubject] = useState('Generale')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [generating, setGenerating] = useState(false)
    const [selectedNoteId, setSelectedNoteId] = useState(null)
    const [flippedCards, setFlippedCards] = useState(new Set())

    const apiUrl = window.location.protocol === 'file:' ? 'https://diario-pro.vercel.app' : ''

    const handleAddNote = () => {
        if (!title.trim()) return
        addNote({ title, content, subject, date })
        setTitle('')
        setContent('')
        setSubject('Generale')
        setDate(new Date().toISOString().split('T')[0])
    }

    const handleDeleteNote = (id) => {
        if (window.confirm('Sei sicuro di voler eliminare questa nota?')) {
            deleteNote(id)
        }
    }

    // Flashcard generation from note
    const handleGenerateFlashcards = async () => {
        const note = data.notes.find(n => n.id === parseInt(selectedNoteId))
        if (!note) {
            alert('Seleziona una nota!')
            return
        }

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

            if (!response.ok) throw new Error(`Server error: ${response.status}`)

            const result = await response.json()
            if (!result.flashcards || result.flashcards.length === 0) {
                alert('❌ Non riesco a generare flashcard da questa nota')
                return
            }

            const newFlashcards = result.flashcards
                .filter(c => c.front && c.back)
                .map(c => ({
                    id: Date.now() + Math.random(),
                    front: c.front,
                    back: c.back,
                    subject: note.subject,
                    correct: 0,
                    incorrect: 0
                }))

            const updated = {
                ...data,
                flashcards: [...data.flashcards, ...newFlashcards]
            }
            saveData(updated)
            alert(`✅ ${newFlashcards.length} flashcard create!`)
            setActiveTab('flashcards')
        } catch (err) {
            alert(`❌ Errore: ${err.message}`)
        } finally {
            setGenerating(false)
        }
    }

    const handleDeleteAllFlashcards = () => {
        if (data.flashcards.length === 0) {
            alert('Nessuna flashcard da eliminare!')
            return
        }
        if (window.confirm('Eliminare tutte le flashcard?')) {
            saveData({ ...data, flashcards: [] })
        }
    }

    const handleDeleteFlashcard = (id) => {
        saveData({ ...data, flashcards: data.flashcards.filter(f => f.id !== id) })
    }

    const toggleFlip = (id) => {
        setFlippedCards(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const sortedNotes = [...data.notes].sort((a, b) =>
        new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    )

    return (
        <section className="section active reveal-entrance">
            <div className="hero">
                <h1><span className="gradient-text">Note & Flashcard</span> <BookOpen size={32} className="inline-icon hero-icon-floating" /></h1>
                <p>Organizza i tuoi appunti e crea flashcard per memorizzare</p>
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
                    <div className="card note-input-card">
                        <h3><Plus size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Nuova Nota</h3>
                        <div className="form-group">
                            <input type="text" placeholder="Titolo nota..." value={title} onChange={e => setTitle(e.target.value)} />
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
                            <textarea placeholder="Scrivi i tuoi appunti..." style={{ minHeight: 150, marginTop: '1rem' }} value={content} onChange={e => setContent(e.target.value)} />
                            <button className="btn-primary" style={{ width: '100%', marginTop: '1.25rem' }} onClick={handleAddNote} disabled={!title.trim()}>
                                <FileText size={18} /> Salva Nota
                            </button>
                        </div>
                    </div>

                    {sortedNotes.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                            Nessuna nota ancora. Crea la tua prima! <Sparkles size={16} className="text-accent" />
                        </p>
                    ) : (
                        <div className="notes-list">
                            {sortedNotes.map(note => (
                                <div key={note.id} className="card note-item-card">
                                    <div className="note-item-header">
                                        <div className="note-title-info">
                                            <h4>{note.title}</h4>
                                            <div className="note-meta">
                                                <span className="note-tag">{note.subject}</span>
                                                <span className="note-date"><Calendar size={12} /> {note.date}</span>
                                            </div>
                                        </div>
                                        <button className="btn-icon-delete" onClick={() => handleDeleteNote(note.id)}>
                                            <Trash2 size={16} />
                                        </button>
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
                    <div className="card ai-gen-card">
                        <h3><Sparkles size={18} color="var(--color-accent)" style={{ verticalAlign: 'middle', marginRight: '8px' }} /> AI Flashcard Generator</h3>
                        <p className="ai-gen-desc">
                            Seleziona una nota e lascia che Gemini crei per te flashcard intelligenti.
                        </p>
                        {data.notes.length > 0 ? (
                            <div className="form-group">
                                <div className="custom-select-wrapper">
                                    <select value={selectedNoteId || ''} onChange={e => setSelectedNoteId(e.target.value)}>
                                        <option value="">-- Seleziona una nota --</option>
                                        {data.notes.map(n => (
                                            <option key={n.id} value={n.id}>{n.title} ({n.subject})</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="select-icon" size={16} />
                                </div>
                                <button
                                    className="btn-primary btn-ai"
                                    style={{ width: '100%', marginTop: '1rem' }}
                                    onClick={handleGenerateFlashcards}
                                    disabled={generating || !selectedNoteId}
                                >
                                    {generating ? (
                                        <span className="btn-loading"><span className="pulse-dot"></span> Generando...</span>
                                    ) : (
                                        <><Sparkles size={18} /> Genera 5 Flashcard</>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="empty-warning">
                                <Info size={18} /> Aggiungi prima una nota per generare flashcard
                            </div>
                        )}
                        {data.flashcards.length > 0 && (
                            <button className="btn-danger-outline" style={{ width: '100%', marginTop: '1rem' }} onClick={handleDeleteAllFlashcards}>
                                <Trash2 size={16} /> Elimina tutte ({data.flashcards.length})
                            </button>
                        )}
                    </div>

                    {data.flashcards.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                            Nessuna flashcard ancora. Genera con l'AI! <Sparkles size={16} className="text-accent" />
                        </p>
                    ) : (
                        <div className="flashcards-grid">
                            {data.flashcards.map((fc) => (
                                <div
                                    key={fc.id}
                                    className={`card flashcard-item-card ${flippedCards.has(fc.id) ? 'is-flipped' : ''}`}
                                    onClick={() => toggleFlip(fc.id)}
                                >
                                    <div className="flashcard-card-content">
                                        <div className="fc-front">
                                            <div className="fc-q-label"><HelpCircle size={14} /> DOMANDA</div>
                                            <div className="fc-text">{fc.front}</div>
                                            <div className="fc-hint">Clicca per girare</div>
                                        </div>
                                        <div className="fc-back">
                                            <div className="fc-a-label"><CheckCircle size={14} /> RISPOSTA</div>
                                            <div className="fc-text">{fc.back}</div>
                                        </div>
                                    </div>
                                    <div className="fc-footer">
                                        <span className="fc-subject">{fc.subject}</span>
                                        <button
                                            className="btn-icon-delete sm"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteFlashcard(fc.id) }}
                                        >
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
