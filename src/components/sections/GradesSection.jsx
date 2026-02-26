import { useState } from 'react'
import { useData } from '../../hooks/useData'
import { GraduationCap, Plus, Trash2, Calendar, Layout, Info, Award } from 'lucide-react'

export default function GradesSection() {
    const { data, addGrade, deleteGrade, getWeightedAverage } = useData()
    const [subject, setSubject] = useState('')
    const [value, setValue] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState('')

    const handleAddGrade = () => {
        if (!subject.trim() || !value) return
        addGrade({ subject, value, weight: 2, date, notes })
        setSubject('')
        setValue('')
        setDate(new Date().toISOString().split('T')[0])
        setNotes('')
    }

    const handleDeleteGrade = (id) => {
        if (window.confirm('Eliminare questo voto?')) {
            deleteGrade(id)
        }
    }

    const average = getWeightedAverage()

    // Sort by date descending
    const sortedGrades = [...data.grades].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    )

    // Group grades by subject for the summary
    const subjects = [...new Set(data.grades.map(g => g.subject))]
    const averageBySubject = (sub) => {
        const subGrades = data.grades.filter(g => g.subject === sub)
        if (subGrades.length === 0) return '-'
        const avg = subGrades.reduce((s, g) => s + g.value, 0) / subGrades.length
        return avg.toFixed(1)
    }

    const gradeColor = (val) => {
        if (val >= 8) return '#30D158'
        if (val >= 6) return '#FF9F0A'
        return '#FF453A'
    }

    return (
        <section className="section active">
            <div className="hero">
                <h1><span className="gradient-text">Voti</span> ⭐</h1>
                <p>Traccia i tuoi progressi scolastici</p>
            </div>

            {/* Average summary */}
            {data.grades.length > 0 && (
                <div className="grades-summary-grid">
                    <div className="card summary-item-card">
                        <div className="summary-label">Media Ponderata</div>
                        <div className="summary-value" style={{ color: gradeColor(parseFloat(average)) }}>
                            {average}
                        </div>
                    </div>
                    <div className="card summary-item-card">
                        <div className="summary-label">Voti Totali</div>
                        <div className="summary-value">
                            {data.grades.length}
                        </div>
                    </div>
                    <div className="card summary-item-card">
                        <div className="summary-label">Performance</div>
                        <div className="summary-value" style={{ fontSize: '1.5rem', color: 'var(--color-accent)' }}>
                            {parseFloat(average) >= 8 ? 'Eccellente' : parseFloat(average) >= 6 ? 'Buona' : 'Da revisionare'}
                        </div>
                    </div>
                </div>
            )}

            <div className="card grade-input-card">
                <h3><Plus size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Nuovo Voto</h3>
                <div className="form-group">
                    <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <input type="text" style={{ flex: 2 }} placeholder="Materia..." value={subject} onChange={e => setSubject(e.target.value)} />
                        <input type="number" style={{ flex: 1 }} placeholder="Voto..." min="1" max="10" step="0.5" value={value} onChange={e => setValue(e.target.value)} />
                    </div>
                    <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <input type="date" style={{ flex: 1 }} value={date} onChange={e => setDate(e.target.value)} />
                        <input type="text" style={{ flex: 2 }} placeholder="Note (es. Scritto, Orale...)" value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                    <button className="btn-primary" style={{ width: '100%' }} onClick={handleAddGrade} disabled={!subject.trim() || !value}>
                        Salva Voto
                    </button>
                </div>
            </div>

            {/* Subject averages */}
            {subjects.length > 0 && (
                <div className="card subject-averages-card">
                    <h4><Award size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Medie per Materia</h4>
                    <div className="subject-grid">
                        {subjects.map(sub => (
                            <div key={sub} className="subject-item-box">
                                <div className="subject-name">{sub}</div>
                                <div className="subject-avg" style={{ color: gradeColor(parseFloat(averageBySubject(sub))) }}>
                                    {averageBySubject(sub)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Grades list */}
            {sortedGrades.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                    Nessun voto registrato. Aggiungine uno! ⭐
                </p>
            ) : (
                <div className="grades-list">
                    {sortedGrades.map(grade => (
                        <div key={grade.id} className="card grade-item-card" style={{ borderLeftColor: gradeColor(grade.value) }}>
                            <div className="grade-item-content">
                                <div className="grade-main-info">
                                    <p className="grade-subject-title">{grade.subject}</p>
                                    <div className="grade-meta">
                                        <span className="grade-date"><Calendar size={12} /> {grade.date}</span>
                                        {grade.notes && <span className="grade-note-tag"><Info size={12} /> {grade.notes}</span>}
                                    </div>
                                </div>
                                <div className="grade-value-box">
                                    <div className="grade-pill" style={{ background: `${gradeColor(grade.value)}20`, color: gradeColor(grade.value) }}>
                                        {grade.value}
                                    </div>
                                    <button className="btn-icon-delete" onClick={() => handleDeleteGrade(grade.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
