// src/data/achievements.js

export const ACHIEVEMENT_RARITIES = {
    common: {
        color: '#888',
        borderColor: 'rgba(136, 136, 136, 0.3)',
        backgroundColor: 'rgba(136, 136, 136, 0.05)',
        label: 'Comune'
    },
    rare: {
        color: '#6495FF',
        borderColor: 'rgba(100, 150, 255, 0.3)',
        backgroundColor: 'rgba(100, 150, 255, 0.05)',
        label: 'Raro'
    },
    epic: {
        color: '#9D4EDD',
        borderColor: 'rgba(157, 78, 221, 0.3)',
        backgroundColor: 'rgba(157, 78, 221, 0.05)',
        label: 'Epico'
    },
    legendary: {
        color: '#FFD700',
        borderColor: 'rgba(255, 215, 0, 0.3)',
        backgroundColor: 'rgba(255, 215, 0, 0.05)',
        label: 'Leggendario'
    }
}

export const ACHIEVEMENTS = [
    // ═══ COMMON ═══
    {
        id: 'first_note',
        name: 'Primo Passo',
        description: 'Crea la tua prima nota',
        icon: '📝',
        rarity: 'common',
        points: 50,
        target: 1,
        getCurrent: (data) => (data.notes || []).length,
    },
    {
        id: 'first_flashcard',
        name: 'Memoria Veloce',
        description: 'Crea la tua prima flashcard',
        icon: '⚡',
        rarity: 'common',
        points: 50,
        target: 1,
        getCurrent: (data) => (data.flashcards || []).length,
    },
    {
        id: 'first_task',
        name: 'Organizzato',
        description: 'Completa il tuo primo compito',
        icon: '✅',
        rarity: 'common',
        points: 50,
        target: 1,
        getCurrent: (data) => (data.tasks || []).filter(t => t.completed).length,
    },
    {
        id: 'first_duel',
        name: 'Primo Duello',
        description: 'Vinci il tuo primo duello',
        icon: '⚔️',
        rarity: 'common',
        points: 50,
        target: 1,
        getCurrent: (data) => data.stats?.duelsWon || 0,
    },

    // ═══ RARE ═══
    {
        id: 'flashcard_50',
        name: 'Raccoglitore',
        description: 'Crea 50 flashcard',
        icon: '📇',
        rarity: 'rare',
        points: 150,
        target: 50,
        getCurrent: (data) => (data.flashcards || []).length,
    },
    {
        id: 'note_30',
        name: 'Master Note',
        description: 'Crea 30 note',
        icon: '📚',
        rarity: 'rare',
        points: 150,
        target: 30,
        getCurrent: (data) => (data.notes || []).length,
    },
    {
        id: 'level_5',
        name: 'Livello 5',
        description: 'Raggiungi il livello 5',
        icon: '👑',
        rarity: 'rare',
        points: 150,
        target: 5,
        getCurrent: (data) => data.stats?.level || 1,
    },
    {
        id: 'duel_20',
        name: 'Guerriero',
        description: 'Vinci 20 duelli',
        icon: '🗡️',
        rarity: 'rare',
        points: 150,
        target: 20,
        getCurrent: (data) => data.stats?.duelsWon || 0,
    },
    {
        id: 'streak_7',
        name: 'Settimana di Fuoco',
        description: 'Mantieni uno streak di 7 giorni',
        icon: '🔥',
        rarity: 'rare',
        points: 150,
        target: 7,
        getCurrent: (data) => data.stats?.currentStreak || 0,
    },

    // ═══ EPIC ═══
    {
        id: 'duel_100',
        name: 'Century Club',
        description: 'Vinci 100 duelli',
        icon: '💯',
        rarity: 'epic',
        points: 300,
        target: 100,
        getCurrent: (data) => data.stats?.duelsWon || 0,
    },
    {
        id: 'level_10',
        name: 'Maestro Supremo',
        description: 'Raggiungi il livello 10',
        icon: '🎓',
        rarity: 'epic',
        points: 300,
        target: 10,
        getCurrent: (data) => data.stats?.level || 1,
    },
    {
        id: 'task_100',
        name: 'Task Master',
        description: 'Completa 100 compiti',
        icon: '🏅',
        rarity: 'epic',
        points: 300,
        target: 100,
        getCurrent: (data) => (data.tasks || []).filter(t => t.completed).length,
    },
    {
        id: 'streak_30',
        name: 'Maratoneta',
        description: 'Studia per 30 giorni di fila',
        icon: '💪',
        rarity: 'epic',
        points: 300,
        target: 30,
        getCurrent: (data) => data.stats?.currentStreak || 0,
    },
    {
        id: 'perfect_avg',
        name: 'Studente Perfetto',
        description: 'Raggiungi media 9.0+',
        icon: '🌟',
        rarity: 'epic',
        points: 300,
        target: 90,
        getCurrent: (data) => {
            const grades = data.grades || []
            if (grades.length === 0) return 0
            const sum = grades.reduce((acc, g) => acc + (g.value || g.voto || 0), 0)
            return Math.round((sum / grades.length) * 10)
        },
    },

    // ═══ LEGENDARY ═══
    {
        id: 'streak_365',
        name: 'Leggenda Immortale',
        description: 'Streak di 365 giorni',
        icon: '🔥',
        rarity: 'legendary',
        points: 1000,
        target: 365,
        getCurrent: (data) => data.stats?.currentStreak || 0,
    },
    {
        id: 'duel_1000',
        name: 'Mille Vittorie',
        description: 'Vinci 1000 duelli',
        icon: '⚔️',
        rarity: 'legendary',
        points: 1000,
        target: 1000,
        getCurrent: (data) => data.stats?.duelsWon || 0,
    },
    {
        id: 'flashcard_500',
        name: 'Onnisciente',
        description: 'Crea 500 flashcard',
        icon: '🧠',
        rarity: 'legendary',
        points: 1000,
        target: 500,
        getCurrent: (data) => (data.flashcards || []).length,
    },
]

export default ACHIEVEMENTS
