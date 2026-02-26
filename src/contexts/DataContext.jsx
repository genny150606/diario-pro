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
            if (Array.isArray(incomingValue)) {
                result[key] = JSON.parse(JSON.stringify(incomingValue));
            }
        } else if (defaultValue !== null && typeof defaultValue === 'object') {
            result[key] = deepMergeSafe(defaultValue, incomingValue);
        } else {
            if (typeof incomingValue === typeof defaultValue) {
                result[key] = incomingValue;
            }
        }
    });
    return result;
}

function sanitizeData(inputData) {
    if (!inputData || typeof inputData !== 'object') {
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    try {
        const merged = deepMergeSafe(DEFAULT_DATA, inputData);
        if (inputData.entries && Array.isArray(inputData.entries) && (!merged.diaryEntries || merged.diaryEntries.length === 0)) {
            merged.diaryEntries = JSON.parse(JSON.stringify(inputData.entries));
        }
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
    const cacheKey = user ? `sj_data_${user.id}` : null

    useEffect(() => {
        if (!user) {
            setData(DEFAULT_DATA)
            setLoading(false)
            return
        }

        async function loadData() {
            setLoading(true)
            console.log(`[DataContext] Starting loadData for ${user.id}...`)

            // 1. EMERGENCY SAFETY TIMEOUT (15s)
            const safetyTimeout = setTimeout(() => {
                console.warn('[DataContext] 15s safety timeout - forcing loading: false')
                setLoading(false)
            }, 15000)

            try {
                // 2. IMMEDIATE LOCAL LOAD (UX Priority)
                let localData = null;
                const cachedStr = localStorage.getItem(cacheKey)
                if (cachedStr) {
                    const parsed = safeJsonParse(cachedStr)
                    if (parsed) {
                        localData = sanitizeData(parsed)
                        setData(localData)
                        setLoading(false) // Unlock UI immediately
                        console.log('[DataContext] UI unlocked with local data')
                    }
                }

                // 3. BACKGROUND CLOUD FETCH
                console.log('[DataContext] Fetching cloud data...')
                const { data: row, error } = await supabase
                    .from('users_data')
                    .select('data')
                    .eq('id', user.id)
                    .single()

                if (error && error.code !== 'PGRST116') {
                    console.warn('[DataContext] Cloud download error:', error.message)
                }

                // 4. MIGRATION LOGIC
                const oldHtmlDataStr = localStorage.getItem('studyjournal_data')
                if (oldHtmlDataStr) {
                    try {
                        const oldData = sanitizeData(JSON.parse(oldHtmlDataStr))
                        const totalOldItems = oldData.notes.length + oldData.flashcards.length
                        const totalLocalItems = localData ? localData.notes.length + localData.flashcards.length : 0
                        const totalCloudItems = (row?.data?.notes || []).length + (row?.data?.flashcards || []).length

                        if (totalOldItems > totalLocalItems && totalOldItems > totalCloudItems && totalOldItems > 0) {
                            console.log('[DataContext] MIGRATION: adopting old HTML data')
                            localStorage.setItem(cacheKey, JSON.stringify(oldData))
                            setData(oldData)
                            setLoading(false)
                            supabase.from('users_data').upsert({
                                id: user.id,
                                data: oldData,
                                updated_at: new Date().toISOString()
                            }).then(() => localStorage.removeItem('studyjournal_data'))
                            return
                        } else if (totalOldItems === 0) {
                            localStorage.removeItem('studyjournal_data')
                        }
                    } catch (e) {
                        console.error('[DataContext] Migration error:', e)
                    }
                }

                // 5. MERGE CLOUD DATA
                const cloudRaw = safeJsonParse(row?.data);
                if (cloudRaw && Object.keys(cloudRaw).length > 0) {
                    console.log('[DataContext] Cloud data found, merging...')
                    let cloudData = sanitizeData(cloudRaw)
                    let finalData = cloudData

                    if (localData) {
                        const isLocalNewer = (localData.lastModified || 0) > (cloudData.lastModified || 0)
                        if (isLocalNewer) {
                            console.log('[DataContext] Local is newer, syncing cloud...')
                            finalData = localData
                            supabase.from('users_data').upsert({
                                id: user.id,
                                data: localData,
                                updated_at: new Date().toISOString()
                            })
                        }
                    }

                    localStorage.setItem(cacheKey, JSON.stringify(finalData))
                    setData(finalData)
                } else if (!localData) {
                    setData(DEFAULT_DATA)
                }
            } catch (err) {
                console.error("[DataContext] Global load error:", err)
            } finally {
                clearTimeout(safetyTimeout)
                setLoading(false)
            }
        }

        loadData()
    }, [user, cacheKey])

    const saveData = useCallback((newData) => {
        if (!user) return
        const updated = JSON.parse(JSON.stringify(newData))
        updated.lastModified = Date.now()

        // Counter logic
        if (!updated.counters) updated.counters = {}
        const currentNotes = (updated.notes || []).length
        const currentFC = (updated.flashcards || []).length
        if (updated.counters.totalNotesCreated === undefined) {
            updated.counters.totalNotesCreated = currentNotes
            updated.counters.totalFlashcardsCreated = currentFC
        } else {
            if (currentNotes > (updated.counters.lastNotesCount || 0)) {
                updated.counters.totalNotesCreated += (currentNotes - (updated.counters.lastNotesCount || 0))
            }
            if (currentFC > (updated.counters.lastFlashcardsCount || 0)) {
                updated.counters.totalFlashcardsCreated += (currentFC - (updated.counters.lastFlashcardsCount || 0))
            }
        }
        updated.counters.lastNotesCount = currentNotes
        updated.counters.lastFlashcardsCount = currentFC

        localStorage.setItem(cacheKey, JSON.stringify(updated))
        setData(updated)

        if (saveTimeout.current) clearTimeout(saveTimeout.current)
        saveTimeout.current = setTimeout(() => {
            supabase.from('users_data').upsert({
                id: user.id,
                data: updated,
                updated_at: new Date().toISOString()
            })
        }, 1000)
    }, [user, cacheKey])

    const addNote = useCallback((note) => {
        const newNote = { id: Date.now(), ...note, createdAt: new Date().toISOString() }
        saveData({ ...data, notes: [...data.notes, newNote] })
        return newNote
    }, [data, saveData])

    const deleteNote = useCallback((id) => {
        saveData({ ...data, notes: data.notes.filter(n => n.id !== id) })
    }, [data, saveData])

    const addTask = useCallback((task) => {
        const newTask = { id: Date.now(), completed: false, ...task, createdAt: new Date().toISOString() }
        saveData({ ...data, tasks: [...data.tasks, newTask] })
        return newTask
    }, [data, saveData])

    const deleteTask = useCallback((id) => {
        saveData({ ...data, tasks: data.tasks.filter(t => t.id !== id) })
    }, [data, saveData])

    const toggleTask = useCallback((id) => {
        saveData({ ...data, tasks: data.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) })
    }, [data, saveData])

    const addGrade = useCallback((grade) => {
        const newGrade = { id: Date.now(), ...grade }
        saveData({ ...data, grades: [...data.grades, newGrade] })
        return newGrade
    }, [data, saveData])

    const deleteGrade = useCallback((id) => {
        saveData({ ...data, grades: data.grades.filter(g => g.id !== id) })
    }, [data, saveData])

    const updateFlashcards = useCallback((fcs) => saveData({ ...data, flashcards: fcs }), [data, saveData])
    const updateData = useCallback((partial) => saveData({ ...data, ...partial }), [data, saveData])

    const getWeightedAverage = useCallback(() => {
        const grades = data.grades || []
        if (grades.length === 0) return 0
        const totalW = grades.reduce((sum, g) => sum + (g.weight || 1), 0)
        return totalW === 0 ? 0 : (grades.reduce((sum, g) => sum + (g.value * (g.weight || 1)), 0) / totalW).toFixed(2)
    }, [data.grades])

    const getCompletedTasksCount = useCallback(() => (data.tasks || []).filter(t => t.completed).length, [data.tasks])

    const value = { data, loading, saveData, updateData, addNote, deleteNote, updateFlashcards, addTask, deleteTask, toggleTask, addGrade, deleteGrade, getWeightedAverage, getCompletedTasksCount }
    return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
