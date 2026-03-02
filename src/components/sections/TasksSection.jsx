import { useState, useMemo } from 'react'
import { useData } from '../../hooks/useData'
import { PlusCircle, Trash2, Calendar, CheckSquare, Square, Zap, CheckCircle2, Circle, Plus } from 'lucide-react'

const PRIORITY_LEVELS = {
    p1: { label: 'Urgente', color: '#FF3B30', emoji: '🔴', xp: 100 },
    p2: { label: 'Alto', color: '#FF9F0A', emoji: '🟠', xp: 75 },
    p3: { label: 'Medio', color: '#FFD60A', emoji: '🟡', xp: 50 },
    p4: { label: 'Basso', color: '#34C759', emoji: '🟢', xp: 25 }
}

const SUBJECTS = [
    'Generale', 'Matematica', 'Italiano', 'Inglese',
    'Scienze', 'Storia', 'Programmazione'
]

export default function TasksSection() {
    const { data, addTask, deleteTask, toggleTask, claimTaskXp } = useData()
    const [title, setTitle] = useState('')
    const [priority, setPriority] = useState('p3')
    const [subject, setSubject] = useState('Generale')
    const [dueDate, setDueDate] = useState('')

    const tasks = data.tasks || []

    const handleAddTask = () => {
        if (!title.trim()) return
        const priorityConfig = PRIORITY_LEVELS[priority]
        addTask({
            description: title,
            priority,
            subject,
            dueDate,
            completed: false,
            xpValue: priorityConfig.xp
        })
        setTitle('')
        setPriority('p3')
        setSubject('Generale')
        setDueDate('')
    }

    const handleDeleteTask = (id) => {
        if (window.confirm('Eliminare questo compito?')) {
            deleteTask(id)
        }
    }

    const stats = useMemo(() => {
        const total = tasks.length
        const completed = tasks.filter(t => t.completed).length
        const xpEarned = tasks.reduce((sum, t) => {
            if (t.completed && t.xpClaimed) return sum + (t.xpValue || 20)
            return sum
        }, 0)

        return {
            completionRate: total ? Math.round((completed / total) * 100) : 0,
            completedCount: completed,
            xpEarned
        }
    }, [tasks])

    const tasksByDueDate = useMemo(() => {
        const today = new Date().toISOString().split('T')[0]
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

        return {
            overdue: tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today),
            today: tasks.filter(t => !t.completed && t.dueDate === today),
            tomorrow: tasks.filter(t => !t.completed && t.dueDate === tomorrow),
            later: tasks.filter(t => !t.completed && (!t.dueDate || t.dueDate > tomorrow)),
            completed: tasks.filter(t => t.completed)
        }
    }, [tasks])

    return (
        <section className="section active reveal-entrance">
            <div className="hero">
                <h1><span className="gradient-text">Study Tasks</span> <CheckSquare size={32} className="inline-icon hero-icon-floating" /></h1>
                <p>Gestisci compiti e guadagna XP</p>
            </div>

            {/* Stats */}
            <div className="task-stats">
                <div className="stat-card">
                    <div className="stat-number">{stats.completionRate}%</div>
                    <div className="stat-label">Completamento</div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${stats.completionRate}%` }}></div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{stats.completedCount}</div>
                    <div className="stat-label">Completati</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{stats.xpEarned}</div>
                    <div className="stat-label">XP Guadagnati</div>
                </div>
            </div>

            {/* Add Task Form */}
            <div className="card glass-card hover-glow animated-border task-input-card">
                <h3><PlusCircle size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Nuovo compito</h3>
                <div className="task-form">
                    <input
                        type="text"
                        placeholder="Titolo del compito..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="form-input"
                        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                    />
                    <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="form-select"
                            style={{ flex: 1, minWidth: '140px' }}
                        >
                            {Object.entries(PRIORITY_LEVELS).map(([key, p]) => (
                                <option key={key} value={key}>
                                    {p.emoji} {p.label} (+{p.xp} XP)
                                </option>
                            ))}
                        </select>
                        <select
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="form-select"
                            style={{ flex: 1, minWidth: '140px' }}
                        >
                            {SUBJECTS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="form-input"
                            style={{ flex: 1, minWidth: '140px' }}
                        />
                    </div>
                    <button className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={handleAddTask} disabled={!title.trim()}>
                        <Plus size={18} /> Aggiungi Compito
                    </button>
                </div>
            </div>

            {/* Tasks by Due Date */}
            {tasksByDueDate.overdue.length > 0 && (
                <TaskGroup title="⚠️ Scaduti" tasks={tasksByDueDate.overdue} onToggle={toggleTask} onDelete={handleDeleteTask} onClaim={claimTaskXp} highlight />
            )}
            {tasksByDueDate.today.length > 0 && (
                <TaskGroup title="🎯 Oggi" tasks={tasksByDueDate.today} onToggle={toggleTask} onDelete={handleDeleteTask} onClaim={claimTaskXp} highlight />
            )}
            {tasksByDueDate.tomorrow.length > 0 && (
                <TaskGroup title="📅 Domani" tasks={tasksByDueDate.tomorrow} onToggle={toggleTask} onDelete={handleDeleteTask} onClaim={claimTaskXp} />
            )}
            {tasksByDueDate.later.length > 0 && (
                <TaskGroup title="📋 Più tardi" tasks={tasksByDueDate.later} onToggle={toggleTask} onDelete={handleDeleteTask} onClaim={claimTaskXp} />
            )}
            {tasksByDueDate.completed.length > 0 && (
                <TaskGroup title="✅ Completati" tasks={tasksByDueDate.completed} onToggle={toggleTask} onDelete={handleDeleteTask} onClaim={claimTaskXp} completed />
            )}

            {tasks.length === 0 && (
                <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                    <p>Nessun compito ancora. Aggiungi uno per iniziare! 🚀</p>
                </div>
            )}
        </section>
    )
}

function TaskGroup({ title, tasks, onToggle, onDelete, onClaim, highlight, completed }) {
    return (
        <div className="task-group">
            <h3 className={`group-title ${highlight ? 'highlight' : ''}`}>
                {title} ({tasks.length})
            </h3>
            <div className="task-list">
                {tasks.map(task => (
                    <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onClaim={onClaim} />
                ))}
            </div>
        </div>
    )
}

function TaskItem({ task, onToggle, onDelete, onClaim }) {
    const priorityConfig = PRIORITY_LEVELS[task.priority] || PRIORITY_LEVELS.p3
    const xpValue = task.xpValue || 20

    return (
        <div className={`task-item ${task.completed ? 'completed' : ''}`}>
            <button className="task-checkbox" onClick={() => onToggle(task.id)}>
                {task.completed ? (
                    <CheckCircle2 size={24} color="#34C759" />
                ) : (
                    <Circle size={24} />
                )}
            </button>

            <div className="task-content">
                <h4>{task.description}</h4>
                <div className="task-meta">
                    <span className="subject-badge">{task.subject || 'Generale'}</span>
                    <span className="priority-badge" style={{ color: priorityConfig.color }}>
                        {priorityConfig.emoji} {priorityConfig.label}
                    </span>
                    {task.dueDate && (
                        <span className="due-date">
                            <Calendar size={12} /> {task.dueDate}
                        </span>
                    )}
                </div>
            </div>

            <div className="task-xp">
                {task.completed && !task.xpClaimed ? (
                    <button
                        className="btn-primary"
                        onClick={(e) => { e.stopPropagation(); onClaim(task.id); }}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '15px', boxShadow: '0 4px 10px rgba(56, 249, 215, 0.3)', whiteSpace: 'nowrap' }}
                    >
                        ✨ +{xpValue} XP
                    </button>
                ) : task.completed && task.xpClaimed ? (
                    <span style={{ color: '#FFD60A', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Zap size={14} /> +{xpValue}
                    </span>
                ) : (
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Zap size={14} /> {xpValue}
                    </span>
                )}
            </div>

            <button className="task-delete" onClick={() => onDelete(task.id)}>
                <Trash2 size={18} />
            </button>
        </div>
    )
}
