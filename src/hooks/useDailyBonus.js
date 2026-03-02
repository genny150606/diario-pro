import { useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { useData } from './useData'

export function useDailyBonus() {
    const { user } = useAuth()
    const { data, updateData } = useData()
    const claimedRef = useRef(false)

    const claimBonus = useCallback(() => {
        if (!user || !data || claimedRef.current) return
        claimedRef.current = true

        const today = new Date().toISOString().split('T')[0]
        const lastLogin = data.stats?.lastLoginDate

        if (lastLogin === today) return // Already claimed today

        const daysSince = lastLogin ? Math.floor((new Date(today) - new Date(lastLogin)) / 86400000) : 999
        const currentStreak = data.stats?.currentStreak || 0

        let bonusXp = 25
        let newStreak = 1

        if (daysSince === 1) {
            // Continue streak
            newStreak = currentStreak + 1
            bonusXp = 25

            // Milestone bonuses
            if (newStreak === 5) bonusXp += 75
            if (newStreak === 10) bonusXp += 150
            if (newStreak === 30) bonusXp += 500
            if (newStreak === 100) bonusXp += 1000
        } else if (daysSince > 1) {
            // Streak broken
            newStreak = 1
            bonusXp = 10
        }

        const newXp = (data.stats?.xp || 0) + bonusXp
        const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 5000, 10000]
        let newLevel = 1
        for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
            if (newXp >= LEVEL_THRESHOLDS[i]) { newLevel = i + 1; break }
        }

        updateData({
            stats: {
                ...(data.stats || {}),
                xp: newXp,
                level: newLevel,
                currentStreak: newStreak,
                lastLoginDate: today,
            }
        })

        // Dispatch in-app notification
        window.dispatchEvent(new CustomEvent('showNotification', {
            detail: {
                title: newStreak > 1 ? `🔥 Streak: ${newStreak} giorni!` : '🎁 Bonus Giornaliero',
                message: daysSince > 1 && currentStreak > 1
                    ? `Streak rotto (era ${currentStreak})... +${bonusXp} XP. Si ricomincia!`
                    : `+${bonusXp} XP! ${newStreak > 1 ? `${newStreak} giorni di fila 🔥` : 'Benvenuto!'}`,
                type: 'success'
            }
        }))
    }, [user, data, updateData])

    useEffect(() => {
        if (user && data && !claimedRef.current) {
            // Small delay to let data load
            const timer = setTimeout(claimBonus, 2000)
            return () => clearTimeout(timer)
        }
    }, [user, data, claimBonus])
}
