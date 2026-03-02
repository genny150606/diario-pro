import { useMemo } from 'react'
import { useData } from './useData'

export function useAnalytics() {
    const { data } = useData()

    // Subject performance from grades
    const subjectPerformance = useMemo(() => {
        const subjects = {}
            ; (data.grades || []).forEach(grade => {
                const subj = grade.subject || grade.materia || 'Altro'
                if (!subjects[subj]) subjects[subj] = { subject: subj, grades: [] }
                subjects[subj].grades.push(grade.value || grade.voto || 0)
            })
        return Object.values(subjects).map(s => ({
            ...s,
            avg: (s.grades.reduce((a, b) => a + b, 0) / s.grades.length).toFixed(1),
            count: s.grades.length
        })).sort((a, b) => b.avg - a.avg)
    }, [data.grades])

    // Duel statistics
    const duelStats = useMemo(() => {
        const won = data.stats?.duelsWon || 0
        const lost = data.stats?.duelsLost || 0
        const total = won + lost
        return {
            totalDuels: total,
            duelsWon: won,
            duelsLost: lost,
            winRate: total > 0 ? Math.round((won / total) * 100) : 0,
            bestStreak: data.stats?.bestDuelStreak || 0,
        }
    }, [data.stats])

    // Consistency — last 7 days
    const consistencyAnalysis = useMemo(() => {
        const days = []
        const now = new Date()
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now)
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]

            const studied = (data.notes || []).some(n => n.createdAt?.startsWith(dateStr)) ||
                (data.tasks || []).some(t => t.completedAt?.startsWith(dateStr) || (t.completed && t.createdAt?.startsWith(dateStr)))

            days.push({ day: dayNames[date.getDay()], studied })
        }

        const studyDays = days.filter(d => d.studied).length
        return { days, studyDays, consistency: Math.round((studyDays / 7) * 100) }
    }, [data.notes, data.tasks])

    // Smart insights
    const insights = useMemo(() => {
        const list = []

        // Strongest subject
        if (subjectPerformance.length > 0) {
            const best = subjectPerformance[0]
            list.push({
                title: '🌟 Punto forte',
                message: `${best.subject} è il tuo punto forte con media ${best.avg}`,
                priority: 'high'
            })
        }

        // Weakest subject (if more than 1)
        if (subjectPerformance.length > 1) {
            const worst = subjectPerformance[subjectPerformance.length - 1]
            if (parseFloat(worst.avg) < 6) {
                list.push({
                    title: '⚠️ Da migliorare',
                    message: `${worst.subject} ha media ${worst.avg} — concentrati qui!`,
                    priority: 'high'
                })
            }
        }

        // Consistency
        if (consistencyAnalysis.consistency >= 70) {
            list.push({
                title: '💪 Sei consistente!',
                message: `Hai studiato ${consistencyAnalysis.studyDays}/7 giorni. Ottimo ritmo!`,
                priority: 'medium'
            })
        } else if (consistencyAnalysis.consistency < 30) {
            list.push({
                title: '📅 Studia di più',
                message: `Solo ${consistencyAnalysis.studyDays}/7 giorni attivi. Prova a essere più costante!`,
                priority: 'high'
            })
        }

        // Duel performance
        if (duelStats.totalDuels > 0) {
            list.push({
                title: duelStats.winRate >= 60 ? '⚔️ Top Duelist' : '⚔️ Allenati di più',
                message: `Win rate ${duelStats.winRate}% su ${duelStats.totalDuels} duelli`,
                priority: duelStats.winRate >= 60 ? 'low' : 'medium'
            })
        }

        // Streak
        const streak = data.stats?.currentStreak || 0
        if (streak >= 3) {
            list.push({
                title: '🔥 Streak attivo!',
                message: `${streak} giorni di fila — non rompere la catena!`,
                priority: 'medium'
            })
        }

        return list
    }, [subjectPerformance, consistencyAnalysis, duelStats, data.stats])

    return { subjectPerformance, duelStats, consistencyAnalysis, insights }
}
