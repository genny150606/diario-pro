import { createContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export const DataContext = createContext(null)

const DEFAULT_DATA = {
    notes: [],
    tasks: [],
    grades: [],
    flashcards: [],
    diaryEntries: [],
    pomodoroSessions: [],
    presences: [],
    uniExams: [],
    uniGrades: [],
    counters: {
        totalNotesCreated: 0,
        totalFlashcardsCreated: 0,
        lastNotesCount: 0,
        lastFlashcardsCount: 0
    },
    stats: {
        totalHours: 0,
        totalSessions: 0,
        xp: 0,
        level: 1,
        unlockedFeatures: []
    }
}

export function DataProvider({ children }) {
    const { user } = useAuth()
    const [data, setData] = useState(DEFAULT_DATA)
    const [loading, setLoading] = useState(true)
    const saveTimeout = useRef(null)

    // Cache key for localStorage
    const cacheKey = user ? `sj_data_${user.id}` : null

    // ── LOAD data from Supabase (source of truth) or localStorage cache ──
    useEffect(() => {
        if (!user) {
            console.log('[DataContext] No user, setting DEFAULT_DATA')
            setData(DEFAULT_DATA)
            setLoading(false)
            return
        }

        async function loadData() {
            setLoading(true)
            console.log(`[DataContext] Loading data for user ${user.id}...`)
            try {
                const { data: row, error } = await supabase
                    .from('users_data')
                    .select('data')
                    .eq('id', user.id)
                    .single()

                if (error && error.code !== 'PGRST116') {
                    console.warn('[DataContext] CloudStorage load error:', error)
                }

                // ── MIGRATION LOGIC: Rescue old HTML app data ──
                const oldHtmlDataStr = localStorage.getItem('studyjournal_data')
                const cachedStr = localStorage.getItem(cacheKey)
                let localData = cachedStr ? sanitizeData(JSON.parse(cachedStr)) : null

                if (oldHtmlDataStr) {
                    try {
                        const oldData = sanitizeData(JSON.parse(oldHtmlDataStr))
                        // Prioritize old html total items to see if we should rescue
                        const totalOldItems = oldData.notes.length + oldData.flashcards.length
                        const totalLocalItems = localData ? localData.notes.length + localData.flashcards.length : 0
                        const totalCloudItems = (row?.data?.notes || []).length + (row?.data?.flashcards || []).length

                        if (totalOldItems > totalLocalItems && totalOldItems > totalCloudItems && totalOldItems > 0) {
                            console.log('[DataContext] MIGRATION: Found much richer old HTML data, forcefully adopting it over everything.')

                            // Adopt immediately
                            localData = oldData
                            localStorage.setItem(cacheKey, JSON.stringify(oldData))
                            setData(oldData)
                            setLoading(false)

                            // Force cloud sync immediately
                            supabase.from('users_data').upsert({
                                id: user.id,
                                data: oldData,
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'id' }).then(() => {
                                console.log('[DataContext] MIGRATION: Successfully backed up old HTML data to Cloud.')
                                localStorage.removeItem('studyjournal_data')
                            })

                            // Exit early, migration handled everything
                            return
                        } else if (totalOldItems === 0) {
                            localStorage.removeItem('studyjournal_data')
                        }
                    } catch (e) {
                        console.error('[DataContext] Failed to migrate old HTML data:', e)
                    }
                }

                if (row?.data && Object.keys(row.data).length > 0) {
                    console.log('[DataContext] Loaded data from Supabase:', row.data)

                    let finalData = sanitizeData(row.data)

                    if (localData) {
                        // Compare local vs cloud using lastModified timestamp
                        const cloudModified = finalData.lastModified || 0
                        const localModified = localData.lastModified || 0

                        const cloudNotes = finalData.notes.length
                        const localNotes = localData.notes.length
                        const cloudFlashcards = finalData.flashcards.length
                        const localFlashcards = localData.flashcards.length

                        console.log(`[DataContext] Merge Check - Cloud [Modified: ${cloudModified}, Notes: ${cloudNotes}] vs Local [Modified: ${localModified}, Notes: ${localNotes}]`)

                        // Determine if local is newer (via timestamp) or if missing timestamps, guess by assuming local is newer if lengths are >=
                        const isLocalNewer = localModified > cloudModified ||
                            (localModified === 0 && cloudModified === 0 && localNotes >= cloudNotes && localFlashcards >= cloudFlashcards)

                        if (isLocalNewer) {
                            console.log('[DataContext] Local storage is NEWER! Preferring local storage to prevent data loss.')
                            finalData = localData

                            // Re-sync the rich local data back up to the cloud!
                            supabase.from('users_data').upsert({
                                id: user.id,
                                data: finalData,
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'id' }).then(() => console.log('[DataContext] Cloud forcefully synced with rich local data.'))
                        }
                    }

                    localStorage.setItem(cacheKey, JSON.stringify(finalData))
                    setData(finalData)
                } else {
                    console.log('[DataContext] No data in Supabase (or empty object), trying localStorage...')
                    if (localData) {
                        console.log('[DataContext] Loaded data from localStorage:', localData)
                        setData(localData)
                    } else {
                        console.log('[DataContext] No data anywhere, using DEFAULT_DATA')
                        setData(DEFAULT_DATA)
                    }
                }
            } catch (err) {
                console.error('[DataContext] CloudStorage load exception:', err)
                const cached = localStorage.getItem(cacheKey)
                if (cached) {
                    setData(sanitizeData(JSON.parse(cached)))
                }
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [user, cacheKey])

    // ── SAVE data (debounced: write-through cache + async Supabase) ──
    const saveData = useCallback((newData) => {
        if (!user) {
            console.log('[DataContext] saveData called but no user')
            return
        }

        console.log('[DataContext] saveData called with:', newData)

        // Prevent state mutation bugs! Deep clone before modifying nested counters
        const updated = JSON.parse(JSON.stringify(newData))
        updated.lastModified = Date.now() // Ensure timestamp exists for merge logic

        if (!updated.counters) updated.counters = {}

        const currentNotesCount = (updated.notes || []).length
        const currentFlashcardsCount = (updated.flashcards || []).length

        if (updated.counters.totalNotesCreated === undefined) {
            updated.counters.totalNotesCreated = currentNotesCount
            updated.counters.totalFlashcardsCreated = currentFlashcardsCount
            updated.counters.lastNotesCount = currentNotesCount
            updated.counters.lastFlashcardsCount = currentFlashcardsCount
        } else {
            if (currentNotesCount > (updated.counters.lastNotesCount || 0)) {
                updated.counters.totalNotesCreated += (currentNotesCount - (updated.counters.lastNotesCount || 0))
            }
            if (currentFlashcardsCount > (updated.counters.lastFlashcardsCount || 0)) {
                updated.counters.totalFlashcardsCreated += (currentFlashcardsCount - (updated.counters.lastFlashcardsCount || 0))
            }
            updated.counters.lastNotesCount = currentNotesCount
            updated.counters.lastFlashcardsCount = currentFlashcardsCount
        }

        // 1. Instant cache write
        console.log(`[DataContext] Setting localStorage for ${cacheKey}`)
        localStorage.setItem(cacheKey, JSON.stringify(updated))
        setData(updated)

        // 2. Debounced Supabase write
        if (saveTimeout.current) clearTimeout(saveTimeout.current)
        saveTimeout.current = setTimeout(() => {
            console.log('[DataContext] Executing debounced Supabase upsert...')
            supabase
                .from('users_data')
                .upsert({
                    id: user.id,
                    data: updated,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' })
                .then(({ error }) => {
                    if (error) console.error('[DataContext] CloudStorage save error:', error)
                    else console.log('[DataContext] CloudStorage save success')
                })
        }, 500) // Debounce 500ms to batch rapid changes
    }, [user, cacheKey, data])

    // ── CRUD helpers ──

    // NOTES
    const addNote = useCallback((note) => {
        const newNote = {
            id: Date.now(),
            title: note.title,
            content: note.content,
            subject: note.subject || 'Generale',
            date: note.date || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        }
        const updated = { ...data, notes: [...data.notes, newNote] }
        saveData(updated)
        return newNote
    }, [data, saveData])

    const deleteNote = useCallback((id) => {
        const updated = { ...data, notes: data.notes.filter(n => n.id !== id) }
        saveData(updated)
    }, [data, saveData])

    // TASKS
    const addTask = useCallback((task) => {
        const newTask = {
            id: Date.now(),
            description: task.description,
            subject: task.subject || 'Generale',
            dueDate: task.dueDate,
            priority: task.priority || 'normal',
            completed: false,
            createdAt: new Date().toISOString()
        }
        const updated = { ...data, tasks: [...data.tasks, newTask] }
        saveData(updated)
        return newTask
    }, [data, saveData])

    const deleteTask = useCallback((id) => {
        const updated = { ...data, tasks: data.tasks.filter(t => t.id !== id) }
        saveData(updated)
    }, [data, saveData])

    const toggleTask = useCallback((id) => {
        const updated = {
            ...data,
            tasks: data.tasks.map(t =>
                t.id === id ? { ...t, completed: !t.completed } : t
            )
        }
        saveData(updated)
    }, [data, saveData])

    // GRADES
    const addGrade = useCallback((grade) => {
        const newGrade = {
            id: Date.now(),
            subject: grade.subject,
            value: parseFloat(grade.value),
            weight: parseInt(grade.weight) || 2,
            date: grade.date || new Date().toISOString().split('T')[0],
            notes: grade.notes || ''
        }
        const updated = { ...data, grades: [...data.grades, newGrade] }
        saveData(updated)
        return newGrade
    }, [data, saveData])

    const deleteGrade = useCallback((id) => {
        const updated = { ...data, grades: data.grades.filter(g => g.id !== id) }
        saveData(updated)
    }, [data, saveData])

    // FLASHCARDS & GENERIC UPDATES
    const updateFlashcards = useCallback((newFlashcards) => {
        const updated = { ...data, flashcards: newFlashcards }
        saveData(updated)
    }, [data, saveData])

    // A generic setter for components that used to call raw setData directly
    const updateData = useCallback((newDataPartial) => {
        const updated = { ...data, ...newDataPartial }
        saveData(updated)
    }, [data, saveData])

    // COMPUTED
    const getWeightedAverage = useCallback(() => {
        const grades = data.grades || []
        if (grades.length === 0) return 0
        const totalWeight = grades.reduce((sum, g) => sum + (g.weight || 1), 0)
        if (totalWeight === 0) return 0
        const weightedSum = grades.reduce((sum, g) => sum + (g.value * (g.weight || 1)), 0)
        return (weightedSum / totalWeight).toFixed(2)
    }, [data.grades])

    const getCompletedTasksCount = useCallback(() => {
        return (data.tasks || []).filter(t => t.completed).length
    }, [data.tasks])

    const value = {
        data,
        loading,
        saveData,
        updateData,
        // Notes
        addNote,
        deleteNote,
        // Flashcards
        updateFlashcards,
        // Tasks
        addTask,
        deleteTask,
        toggleTask,
        // Grades
        addGrade,
        deleteGrade,
        // Computed
        getWeightedAverage,
        getCompletedTasksCount
    }

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    )
}
