import { useState } from 'react'
import { useData } from '../../hooks/useData'
import { PlusCircle, Trash2, Calendar, CheckSquare, Square } from 'lucide-react'

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
        <section className="section active reveal-entrance">
            <div className="hero">
                <h1><span className="gradient-text">Compiti</span> <CheckSquare size={32} className="inline-icon hero-icon-floating" /></h1>
                <p>Gestisci i tuoi compiti e scadenze</p>
            </div>

            <div className="card task-input-card">
                <h3><PlusCircle size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Nuovo compito</h3>
                <div className="form-group">
                    <input type="text" placeholder="Descrizione compito..." value={description} onChange={e => setDescription(e.target.value)} />
                    <div className="form-row" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <input type="date" style={{ flex: 1 }} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        <select style={{ flex: 1 }} value={subject} onChange={e => setSubject(e.target.value)}>
                            <option value="Generale">Generale</option>
                            <option value="Matematica">Matematica</option>
                            <option value="Italiano">Italiano</option>
                            <option value="Inglese">Inglese</option>
                        </select>
                    </div>
                    <button className="btn-primary" style={{ width: '100%', marginTop: '1.25rem' }} onClick={handleAddTask} disabled={!description.trim()}>
                        Aggiungi Compito
                    </button>
                </div>
            </div>

            {sortedTasks.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                    Nessun compito ancora. Aggiungine uno! <PlusCircle size={16} className="text-accent" />
                </p>
            ) : (
                <div className="tasks-list">
                    {sortedTasks.map(task => (
                        <div key={task.id} className={`task-item-card ${task.completed ? 'completed' : ''} ${isOverdue(task) ? 'overdue' : ''}`}>
                            <div className="task-content">
                                <div className="task-checkbox" onClick={() => toggleTask(task.id)}>
                                    {task.completed ? <CheckSquare size={22} color="var(--color-success)" /> : <Square size={22} />}
                                </div>
                                <div className="task-details">
                                    <p className="task-desc">{task.description}</p>
                                    <div className="task-meta">
                                        <span className="task-tag">{task.subject}</span>
                                        {task.dueDate && (
                                            <span className={`task-date ${isOverdue(task) ? 'date-overdue' : ''}`}>
                                                <Calendar size={12} /> {task.dueDate}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button className="btn-icon-delete" onClick={() => handleDeleteTask(task.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
