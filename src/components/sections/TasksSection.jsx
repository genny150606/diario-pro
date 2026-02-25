import { useState } from 'react'
import { useData } from '../../hooks/useData'

export default function TasksSection() {
    const { data, addTask, deleteTask, toggleTask } = useData()
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [subject, setSubject] = useState('Generale')

    const handleAddTask = () => {
        if (!description.trim()) return
        addTask({ description, dueDate, subject })
        setDescription('')
        setDueDate('')
        setSubject('Generale')
    }

    const handleDeleteTask = (id) => {
        if (window.confirm('Eliminare questo compito?')) {
            deleteTask(id)
        }
    }

    // Sort: incomplete first (by due date), then completed
    const sortedTasks = [...data.tasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate)
        return 0
    })

    const isOverdue = (task) => {
        if (!task.dueDate || task.completed) return false
        return new Date(task.dueDate) < new Date(new Date().toISOString().split('T')[0])
    }

    return (
        <section className="section active">
            <div className="hero">
                <h1><span className="gradient-text">Compiti</span> 📝</h1>
                <p>Gestisci i tuoi compiti e scadenze</p>
            </div>

            <div className="card">
                <h3>Nuovo compito</h3>
                <input type="text" placeholder="Descrizione compito..." value={description} onChange={e => setDescription(e.target.value)} />
                <input type="date" style={{ marginBottom: 12 }} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                <select style={{ marginBottom: 12 }} value={subject} onChange={e => setSubject(e.target.value)}>
                    <option value="Generale">Generale</option>
                    <option value="Matematica">Matematica</option>
                    <option value="Italiano">Italiano</option>
                    <option value="Inglese">Inglese</option>
                </select>
                <button className="btn-primary" onClick={handleAddTask} disabled={!description.trim()}>Aggiungi Compito</button>
            </div>

            {sortedTasks.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                    Nessun compito ancora. Aggiungine uno! 📋
                </p>
            ) : (
                <div className="tasks-list">
                    {sortedTasks.map(task => (
                        <div key={task.id} className="card" style={{
                            marginBottom: '0.8rem',
                            opacity: task.completed ? 0.6 : 1,
                            borderLeft: isOverdue(task) ? '3px solid #FF453A' : task.completed ? '3px solid #30D158' : '3px solid var(--color-accent)',
                            transition: 'all 0.3s'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <input
                                    type="checkbox"
                                    checked={task.completed}
                                    onChange={() => toggleTask(task.id)}
                                    style={{ width: 20, height: 20, cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <p style={{
                                        fontWeight: 600,
                                        textDecoration: task.completed ? 'line-through' : 'none',
                                        margin: '0 0 0.2rem'
                                    }}>{task.description}</p>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.5rem', borderRadius: '1rem', color: 'var(--color-text-tertiary)' }}>{task.subject}</span>
                                        {task.dueDate && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                color: isOverdue(task) ? '#FF453A' : 'var(--color-text-tertiary)'
                                            }}>
                                                📅 {task.dueDate}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button className="btn-secondary" onClick={() => handleDeleteTask(task.id)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', minHeight: 'unset' }}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
