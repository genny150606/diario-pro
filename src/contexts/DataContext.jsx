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

// ✅ HELPER: Parsing sicuro che gestisce oggetti o stringhe
function safeJsonParse(input) {
    if (!input) return null;
    if (typeof input === 'object') return input;
    try {
        return JSON.parse(input);
    } catch (e) {
        console.error("[safeJsonParse] ERR: JSON malformato", e);
        return null;
    }
}

// ✅ SEZIONE deepMergeSafe - ARCHITETTURA DIFENSIVA
function deepMergeSafe(defaultObj, incomingObj) {
    if (!incomingObj || typeof incomingObj !== 'object' || Array.isArray(incomingObj)) {
        return JSON.parse(JSON.stringify(defaultObj));
    }

    const result = JSON.parse(JSON.stringify(defaultObj));

    Object.keys(defaultObj).forEach(key => {
        const defaultValue = defaultObj[key];
        const incomingValue = incomingObj[key];

        if (incomingValue === undefined) return;

        if (Array.isArray(defaultValue)) {
            // Se è array → sostituisci completamente con array valido
            if (Array.isArray(incomingValue)) {
                result[key] = JSON.parse(JSON.stringify(incomingValue));
            }
        } else if (defaultValue !== null && typeof defaultValue === 'object') {
            // Se è oggetto → ricorsione
            result[key] = deepMergeSafe(defaultValue, incomingValue);
        } else {
            // Se è primitivo → usa valore input solo se tipo corretto
            if (typeof incomingValue === typeof defaultValue) {
                result[key] = incomingValue;
            }
        }
    });

    return result;
}

// ✅ SEZIONE sanitizeData - VALIDAZIONE DEFINITIVA
function sanitizeData(inputData) {
    if (!inputData || typeof inputData !== 'object') {
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }

    try {
        const merged = deepMergeSafe(DEFAULT_DATA, inputData);

        // Mapping dati legacy (Es: entries -> diaryEntries)
        if (inputData.entries && Array.isArray(inputData.entries) && (!merged.diaryEntries || merged.diaryEntries.length === 0)) {
            merged.diaryEntries = JSON.parse(JSON.stringify(inputData.entries));
        }

        // Validazione post-merge per oggetti critici
        if (!merged.counters || typeof merged.counters !== 'object') {
            merged.counters = JSON.parse(JSON.stringify(DEFAULT_DATA.counters));
        }
        if (!merged.stats || typeof merged.stats !== 'object') {
            merged.stats = JSON.parse(JSON.stringify(DEFAULT_DATA.stats));
        }

        return {
            ...merged,
            lastModified: inputData.lastModified || Date.now()
        };
    } catch (err) {
        console.error("[sanitizeData] ERR: Errore durante sanitizzazione:", err);
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
}

export function DataProvider({ children }) {
    const { user } = useAuth()
    const [data, setData] = useState(DEFAULT_DATA)
    const [loading, setLoading] = useState(true)
    const saveTimeout = useRef(null)

    // Cache key for localStorage
    const cacheKey = user ? `sj_data_${user.id}` : null

    // ✅ SEZIONE HYDRATION EFFECT - LOGICAMENTE PROTETTA
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
                // 1. Load Raw Cloud Data
                const { data: row, error } = await supabase
                    .from('users_data')
                    .select('data')
                    .eq('id', user.id)
                    .single()

                if (error && error.code !== 'PGRST116') {
                    console.warn('[DataContext] CloudStorage load error:', error)
                }

                // 2. Load and Parse Local Data
                const cachedStr = localStorage.getItem(cacheKey)
                let localData = null

                if (cachedStr) {
                    const parsed = safeJsonParse(cachedStr);
                    if (parsed) {
                        console.log('[DataContext] Raw Local Data:', parsed)
                        localData = sanitizeData(parsed)
                        console.log('[DataContext] Sanitized Local Data:', localData)
                    }
                }

                // ── MIGRATION LOGIC (NON TOCCARE) ──
                const oldHtmlDataStr = localStorage.getItem('studyjournal_data')
                if (oldHtmlDataStr) {
                    try {
                        const oldData = sanitizeData(JSON.parse(oldHtmlDataStr))
                        const totalOldItems = oldData.notes.length + oldData.flashcards.length
                        const totalLocalItems = localData ? localData.notes.length + localData.flashcards.length : 0
                        const totalCloudItems = (row?.data?.notes || []).length + (row?.data?.flashcards || []).length

                        if (totalOldItems > totalLocalItems && totalOldItems > totalCloudItems && totalOldItems > 0) {
                            console.log('[DataContext] MIGRATION: Found much richer old HTML data, forcefully adopting it over everything.')
                            localData = oldData
                            localStorage.setItem(cacheKey, JSON.stringify(oldData))
                            setData(oldData)
                            setLoading(false)
                            supabase.from('users_data').upsert({
                                id: user.id,
                                data: oldData,
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'id' }).then(() => {
                                console.log('[DataContext] MIGRATION: Successfully backed up old HTML data to Cloud.')
                                localStorage.removeItem('studyjournal_data')
                            })
                            return
                        } else if (totalOldItems === 0) {
                            localStorage.removeItem('studyjournal_data')
                        }
                    } catch (e) {
                        console.error('[DataContext] Failed to migrate old HTML data:', e)
                    }
                }

                // 3. Process Cloud Data & Final Merge
                const cloudRaw = safeJsonParse(row?.data);
                if (cloudRaw && Object.keys(cloudRaw).length > 0) {
                    console.log('[DataContext] Raw Cloud Data:', cloudRaw)

                    let finalData;
                    try {
                        finalData = sanitizeData(cloudRaw)
                        console.log('[DataContext] Sanitized Cloud Data:', finalData)
                    } catch (err) {
                        console.error("HYDRATION FAILED (Cloud Data)", err)
                        finalData = localData || JSON.parse(JSON.stringify(DEFAULT_DATA))
                    }

                    if (localData) {
                        const cloudModified = finalData.lastModified || 0
                        const localModified = localData.lastModified || 0
                        const isLocalNewer = localModified > cloudModified ||
                            (localModified === 0 && cloudModified === 0 && localData.notes.length >= finalData.notes.length && localData.flashcards.length >= finalData.flashcards.length)

                        if (isLocalNewer) {
                            console.log('[DataContext] Local storage is NEWER! Preferring local storage.')
                            finalData = localData
                            supabase.from('users_data').upsert({
                                id: user.id,
                                data: finalData,
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'id' }).then(() => console.log('[DataContext] Cloud forcefully synced with local cache.'))
                        }
                    }

                    localStorage.setItem(cacheKey, JSON.stringify(finalData))
                    setData(finalData)
                } else {
                    console.log('[DataContext] No data in Supabase, using local or default.')
                    if (localData) {
                        setData(localData)
                    } else {
                        setData(JSON.parse(JSON.stringify(DEFAULT_DATA)))
                    }
                }
            } catch (err) {
                console.error("HYDRATION FAILED (Global)", err)
                const cached = localStorage.getItem(cacheKey)
                if (cached) {
                    try {
                        setData(sanitizeData(JSON.parse(cached)))
                    } catch (e) {
                        setData(JSON.parse(JSON.stringify(DEFAULT_DATA)))
                    }
                } else {
                    setData(JSON.parse(JSON.stringify(DEFAULT_DATA)))
                }
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [user, cacheKey])

    // ✅ SEZIONE saveData - PERFORMANCE OTTIMIZZATA
    const saveData = useCallback((newData) => {
        if (!user) {
            console.log('[DataContext] saveData called but no user')
            return
        }

        console.log('[DataContext] saveData called with:', newData)

        const updated = JSON.parse(JSON.stringify(newData))
        updated.lastModified = Date.now()

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
        }, 500)
    }, [user, cacheKey])

    // ── CRUD helpers ──
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

    const updateFlashcards = useCallback((newFlashcards) => {
        const updated = { ...data, flashcards: newFlashcards }
        saveData(updated)
    }, [data, saveData])

    const updateData = useCallback((newDataPartial) => {
        const updated = { ...data, ...newDataPartial }
        saveData(updated)
    }, [data, saveData])

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
        addNote,
        deleteNote,
        updateFlashcards,
        addTask,
        deleteTask,
        toggleTask,
        addGrade,
        deleteGrade,
        getWeightedAverage,
        getCompletedTasksCount
    }

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    )
}

