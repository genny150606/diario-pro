import { useState } from 'react'
import { useData } from '../../hooks/useData'

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

            {/* Average card */}
            {data.grades.length > 0 && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                    <div className="card" style={{ flex: 1, textAlign: 'center', padding: 16 }}>
                        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Media Ponderata</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: gradeColor(parseFloat(average)), marginTop: 8 }}>{average}</div>
                    </div>
                    <div className="card" style={{ flex: 1, textAlign: 'center', padding: 16 }}>
                        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Voti Totali</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text)', marginTop: 8 }}>{data.grades.length}</div>
                    </div>
                </div>
            )}

            <div className="card">
                <h3>Aggiungi nuovo voto</h3>
                <input type="text" placeholder="Materia..." value={subject} onChange={e => setSubject(e.target.value)} />
                <input type="number" placeholder="Voto..." min="1" max="10" step="0.5" style={{ marginBottom: 12 }} value={value} onChange={e => setValue(e.target.value)} />
                <input type="date" style={{ marginBottom: 12 }} value={date} onChange={e => setDate(e.target.value)} />
                <textarea placeholder="Note..." style={{ minHeight: 80 }} value={notes} onChange={e => setNotes(e.target.value)} />
                <button className="btn-primary" onClick={handleAddGrade} disabled={!subject.trim() || !value}>Salva Voto</button>
            </div>

            {/* Subject averages */}
            {subjects.length > 0 && (
                <div className="card" style={{ marginBottom: '1rem' }}>
                    <h4 style={{ marginBottom: '0.8rem' }}>📊 Medie per Materia</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.8rem' }}>
                        {subjects.map(sub => (
                            <div key={sub} style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '0.6rem 0.8rem',
                                borderRadius: '0.5rem',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '0.2rem' }}>{sub}</div>
                                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: gradeColor(parseFloat(averageBySubject(sub))) }}>{averageBySubject(sub)}</div>
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
                        <div key={grade.id} className="card" style={{ marginBottom: '0.8rem', borderLeft: `3px solid ${gradeColor(grade.value)}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontWeight: 600, margin: '0 0 0.2rem' }}>{grade.subject}</p>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>📅 {grade.date}</span>
                                    </div>
                                    {grade.notes && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.3rem' }}>{grade.notes}</p>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{
                                        fontSize: '1.5rem', fontWeight: 800, color: gradeColor(grade.value),
                                        background: `${gradeColor(grade.value)}15`, padding: '0.3rem 0.8rem',
                                        borderRadius: '0.5rem'
                                    }}>{grade.value}</span>
                                    <button className="btn-secondary" onClick={() => handleDeleteGrade(grade.id)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', minHeight: 'unset' }}>🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
