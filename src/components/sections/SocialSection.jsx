import { useState, useEffect } from 'react'
import Feed from '../social/Feed'
import ExploreTab from '../social/ExploreTab'
import FriendsTab from '../social/FriendsTab'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

function getRelativeTime(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const secondsAgo = Math.floor((now - date) / 1000)
    if (secondsAgo < 60) return 'Proprio ora'
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m fa`
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h fa`
    return `${Math.floor(secondsAgo / 86400)}g fa`
}

function ActivityCard({ activity }) {
    const { activity_type, activity_data, user: actUser, created_at } = activity
    const username = actUser?.email?.split('@')[0] || 'User'

    const getActivityUI = () => {
        switch (activity_type) {
            case 'duel_won':
                return { emoji: '⚔️', message: `${username} ha vinto una sfida!`, color: '#FF6B9D' }
            case 'level_up':
                return { emoji: '📈', message: `${username} è salito al livello ${activity_data?.new_level}`, color: '#6495FF' }
            case 'achievement_unlocked':
                return { emoji: activity_data?.icon || '🏆', message: `${username} ha sbloccato ${activity_data?.name}`, color: '#FFD700' }
            case 'streak_milestone':
                return { emoji: '🔥', message: `${username} ha un streak di ${activity_data?.days} giorni!`, color: '#FF9F0A' }
            case 'flashcard_created':
                return { emoji: '📇', message: `${username} ha creato flashcard`, color: '#30D158' }
            default:
                return { emoji: '✨', message: `${username} ha fatto qualcosa`, color: '#888' }
        }
    }

    const { emoji, message, color } = getActivityUI()
    const timeAgo = getRelativeTime(created_at)

    return (
        <div className="activity-card" style={{ borderLeftColor: color }}>
            <div className="activity-main">
                <span className="activity-emoji">{emoji}</span>
                <div className="activity-text">
                    <p className="activity-message">{message}</p>
                    <span className="activity-time">{timeAgo}</span>
                </div>
            </div>
            <div className="activity-actions">
                <button className="action-btn">Sfida ⚔️</button>
                <button className="action-btn">👍</button>
            </div>
        </div>
    )
}

function ActivityFeedTab() {
    const { user } = useAuth()
    const [activities, setActivities] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        let subscription = null

        const fetchActivities = async () => {
            setLoading(true)
            try {
                // Get friend IDs
                const { data: friendships } = await supabase
                    .from('friendships')
                    .select('friend_id')
                    .eq('user_id', user.id)
                    .eq('status', 'accepted')

                const friendIds = friendships?.map(f => f.friend_id) || []

                if (friendIds.length > 0) {
                    const { data: acts } = await supabase
                        .from('user_activities')
                        .select(`
                            id,
                            user_id,
                            activity_type,
                            activity_data,
                            created_at,
                            user:users_data(email)
                        `)
                        .in('user_id', friendIds)
                        .order('created_at', { ascending: false })
                        .limit(50)

                    setActivities(acts || [])
                }
            } catch (err) {
                console.error('Error fetching activities:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchActivities()

        // Real-time subscription
        subscription = supabase
            .channel('user_activities_feed')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_activities' }, (payload) => {
                setActivities(prev => [payload.new, ...prev].slice(0, 50))
            })
            .subscribe()

        return () => {
            if (subscription) supabase.removeChannel(subscription)
        }
    }, [user])

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>Caricamento attività...</div>
    }

    if (activities.length === 0) {
        return (
            <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.5)' }}>
                <p style={{ margin: '0.5rem 0' }}>Nessuna attività dai tuoi amici ancora.</p>
                <p style={{ margin: '0.5rem 0' }}>Invita qualcuno per iniziare! 👋</p>
            </div>
        )
    }

    return (
        <div className="activity-feed">
            {activities.map(activity => (
                <ActivityCard key={activity.id} activity={activity} />
            ))}
        </div>
    )
}

export default function SocialSection() {
    const [activeTab, setActiveTab] = activeTabState()

    function activeTabState() {
        return useState('feed')
    }

    const tabs = [
        { key: 'feed', label: '📰 Bacheca' },
        { key: 'activity', label: '📊 Activity' },
        { key: 'explore', label: '🔍 Esplora' },
        { key: 'friends', label: '👥 Amici' },
    ]

    return (
        <section className="section active social-section">
            <div className="hero" style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <span className="gradient-text" style={{ fontSize: '2.5rem' }}>Social</span>
                    <span style={{ fontSize: '2rem' }}>🌐</span>
                </h1>
                <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>
                    La tua rete di studio: condividi, esplora, connettiti.
                </p>

                {/* Custom Tabs Navigation */}
                <div style={{
                    display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem',
                    background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '30px',
                    width: 'fit-content', margin: '2rem auto 0 auto', border: '1px solid rgba(255,255,255,0.05)',
                    flexWrap: 'wrap'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                background: activeTab === tab.key ? 'var(--color-primary)' : 'transparent',
                                color: activeTab === tab.key ? 'white' : 'var(--color-text-secondary)',
                                border: 'none', padding: '0.6rem 1.2rem', borderRadius: '25px',
                                fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s',
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                fontSize: '0.9rem'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="tab-content" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                {activeTab === 'feed' && <Feed />}
                {activeTab === 'activity' && <ActivityFeedTab />}
                {activeTab === 'explore' && <ExploreTab />}
                {activeTab === 'friends' && <FriendsTab />}
            </div>
        </section>
    )
}

