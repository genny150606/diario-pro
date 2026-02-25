import { useState } from 'react'
import { useData } from '../../hooks/useData'

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
        <section className="section active">
            <div className="hero">
                <h1><span className="gradient-text">Note & Flashcard</span> 📚</h1>
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
                    <div className="card">
                        <h3>Aggiungi nuova nota</h3>
                        <input type="text" placeholder="Titolo nota..." value={title} onChange={e => setTitle(e.target.value)} />
                        <select style={{ marginBottom: 12 }} value={subject} onChange={e => setSubject(e.target.value)}>
                            <option value="Generale">Generale</option>
                            <option value="Matematica">Matematica</option>
                            <option value="Italiano">Italiano</option>
                            <option value="Inglese">Inglese</option>
                            <option value="Scienze">Scienze</option>
                            <option value="Storia">Storia</option>
                        </select>
                        <textarea placeholder="Scrivi i tuoi appunti..." style={{ minHeight: 120, marginBottom: 12 }} value={content} onChange={e => setContent(e.target.value)} />
                        <input type="date" style={{ marginBottom: 16 }} value={date} onChange={e => setDate(e.target.value)} />
                        <button className="btn-primary" onClick={handleAddNote} disabled={!title.trim()}>📝 Salva Nota</button>
                    </div>

                    {sortedNotes.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                            Nessuna nota ancora. Crea la tua prima! ✨
                        </p>
                    ) : (
                        <div className="notes-list">
                            {sortedNotes.map(note => (
                                <div key={note.id} className="card" style={{ marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 0.3rem' }}>{note.title}</h4>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '0.75rem', background: 'var(--color-accent)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '1rem' }}>{note.subject}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{note.date}</span>
                                            </div>
                                        </div>
                                        <button className="btn-secondary" onClick={() => handleDeleteNote(note.id)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', minHeight: 'unset' }}>🗑️</button>
                                    </div>
                                    {note.content && <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'hidden' }}>{note.content}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'flashcards' && (
                <div className="tab-content active">
                    <div className="card">
                        <h3>⚡ Genera Flashcard con AI</h3>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16, fontSize: '0.9rem' }}>
                            Seleziona una nota e genera flashcard automaticamente con Gemini
                        </p>
                        {data.notes.length > 0 ? (
                            <>
                                <select style={{ marginBottom: 12 }} value={selectedNoteId || ''} onChange={e => setSelectedNoteId(e.target.value)}>
                                    <option value="">-- Seleziona una nota --</option>
                                    {data.notes.map(n => (
                                        <option key={n.id} value={n.id}>{n.title} ({n.subject})</option>
                                    ))}
                                </select>
                                <button
                                    className="btn-primary"
                                    style={{ width: '100%', marginBottom: 8 }}
                                    onClick={handleGenerateFlashcards}
                                    disabled={generating || !selectedNoteId}
                                >
                                    {generating ? '⏳ Generando...' : '🤖 Genera 5 Flashcard'}
                                </button>
                            </>
                        ) : (
                            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
                                ⚠️ Aggiungi prima una nota nella sezione Note per generare flashcard
                            </p>
                        )}
                        {data.flashcards.length > 0 && (
                            <button className="btn-secondary" style={{ width: '100%' }} onClick={handleDeleteAllFlashcards}>
                                🗑️ Elimina tutte le Flashcard ({data.flashcards.length})
                            </button>
                        )}
                    </div>

                    {data.flashcards.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                            Nessuna flashcard ancora. Genera con l'AI! ✨
                        </p>
                    ) : (
                        <div style={{ padding: '1rem 0' }}>
                            {data.flashcards.map((fc) => (
                                <div
                                    key={fc.id}
                                    className="card"
                                    style={{ marginBottom: '0.8rem', cursor: 'pointer', position: 'relative' }}
                                    onClick={() => toggleFlip(fc.id)}
                                >
                                    <div style={{ fontWeight: 600, color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
                                        ❓ {fc.front}
                                    </div>
                                    {flippedCards.has(fc.id) ? (
                                        <div style={{ color: '#30D158', fontSize: '0.95rem', padding: '0.5rem 0' }}>
                                            ✅ {fc.back}
                                        </div>
                                    ) : (
                                        <small style={{ color: 'var(--color-text-tertiary)' }}>Clicca per vedere la risposta</small>
                                    )}
                                    {fc.subject && (
                                        <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.5rem', borderRadius: '1rem', color: 'var(--color-text-tertiary)', position: 'absolute', top: '0.8rem', right: '3rem' }}>{fc.subject}</span>
                                    )}
                                    <button
                                        className="btn-secondary"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteFlashcard(fc.id) }}
                                        style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', padding: '0.2rem 0.4rem', fontSize: '0.75rem', minHeight: 'unset' }}
                                    >🗑️</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
