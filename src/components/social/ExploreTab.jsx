import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Flame, Trophy, Search } from 'lucide-react'

export default function ExploreTab() {
    const { user } = useAuth()
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [message, setMessage] = useState('')

    // Real data states
    const [trendingTopics, setTrendingTopics] = useState([])
    const [topStudents, setTopStudents] = useState([])
    const [sidebarLoading, setSidebarLoading] = useState(true)

    // Fetch Leaderboard and Trending on Mount
    useEffect(() => {
        async function fetchSidebarData() {
            setSidebarLoading(true)
            try {
                // 1. Fetch Top Students
                const { data: usersData, error: usersErr } = await supabase
                    .from('users_data')
                    .select('id, username, data')
                    .limit(100)

                if (!usersErr && usersData) {
                    const mappedUsers = usersData.map(u => ({
                        id: u.id,
                        name: u.username || u.data?.username || u.data?.email?.split('@')[0] || 'Utente',
                        xp: u.data?.stats?.xp || 0,
                        level: u.data?.stats?.level || 1
                    }))

                    // Sort by XP descending and take top 5
                    const sortedTop = mappedUsers.sort((a, b) => b.xp - a.xp).slice(0, 5)
                    setTopStudents(sortedTop)
                }

                // 2. Fetch Trending Topics
                const { data: postsData, error: postsErr } = await supabase
                    .from('posts')
                    .select('content')
                    .order('created_at', { ascending: false })
                    .limit(100)

                if (!postsErr && postsData) {
                    const tagCounts = {}
                    postsData.forEach(p => {
                        const tags = p.content.match(/#\w+/g)
                        if (tags) {
                            tags.forEach(tag => {
                                const lowerTag = tag.toLowerCase()
                                tagCounts[lowerTag] = (tagCounts[lowerTag] || 0) + 1
                            })
                        }
                    })

                    // Convert to array and sort
                    const sortedTags = Object.keys(tagCounts)
                        .map(tag => ({ tag, posts: tagCounts[tag] }))
                        .sort((a, b) => b.posts - a.posts)
                        .slice(0, 5)

                    setTrendingTopics(sortedTags)
                }

            } catch (e) {
                console.error("Error fetching sidebar data:", e)
            } finally {
                setSidebarLoading(false)
            }
        }

        fetchSidebarData()
    }, [])

    const handleSearch = async () => {
        if (!searchQuery.trim() || searchQuery.length < 3) return
        setSearching(true)
        setMessage('')

        try {
            const { data, error } = await supabase
                .from('users_data')
                .select('id, data, username')
                .neq('id', user?.id)
                .ilike('username', `%${searchQuery}%`)
                .limit(10)

            if (error) throw error

            const usersData = data || []
            const filtered = usersData.map(u => ({
                id: u.id,
                username: u.username || u.data?.username || u.data?.email?.split('@')[0] || 'Utente',
                level: u.data?.stats?.level || 1
            }))

            const localFiltered = usersData.length === 0 ? [] : filtered.filter(u =>
                u.username.toLowerCase().includes(searchQuery.toLowerCase())
            )

            setSearchResults(localFiltered.length > 0 ? localFiltered : filtered)
            if (filtered.length === 0 && localFiltered.length === 0) setMessage('Nessun utente trovato con questo nome.')
        } catch (err) {
            setMessage(`❌ Errore ricerca: ${err.message}`)
            console.error(err)
        } finally {
            setSearching(false)
        }
    }

    const handleAddFriend = async (userId, username) => {
        try {
            const { error } = await supabase
                .from('friendships')
                .insert([{ sender_id: user.id, receiver_id: userId }])

            if (error) {
                if (error.code === '23505') {
                    setMessage(`Hai già inviato una richiesta a ${username} o siete già amici.`)
                } else {
                    throw error
                }
            } else {
                setMessage(`✅ Richiesta inviata a ${username}!`)
                setSearchResults(prev => prev.filter(u => u.id !== userId))
            }
        } catch (err) {
            setMessage(`❌ Errore durante l'invio della richiesta.`)
            console.error(err)
        }
    }

    const getAvatarGradient = (name) => {
        const colors = [
            'linear-gradient(135deg, #FF6B6B, #FF8E53)',
            'linear-gradient(135deg, #4FACFE, #00F2FE)',
            'linear-gradient(135deg, #43E97B, #38F9D7)',
            'linear-gradient(135deg, #FA709A, #FEE140)'
        ];
        return colors[name.charCodeAt(0) % colors.length];
    }

    return (
        <div className="explore-container" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>

            {/* Main Column: Search */}
            <div className="explore-main">
                <div className="card" style={{ background: 'rgba(25, 25, 35, 0.6)', backdropFilter: 'blur(10px)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Search size={22} className="text-accent" /> Cerca Compagni
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                        Trova altri studenti per condividere appunti o sfidarli in accesi duelli.
                    </p>

                    <div style={{ display: 'flex', gap: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <input
                            type="text"
                            placeholder="Nome utente (min. 3 caratteri)..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            style={{ flex: 1, border: 'none', background: 'transparent', padding: '0.8rem 1rem', fontSize: '1rem', color: 'white', outline: 'none' }}
                        />
                        <button
                            className="btn-primary"
                            onClick={handleSearch}
                            disabled={searching || searchQuery.length < 3}
                            style={{ borderRadius: '12px', padding: '0 1.5rem', fontWeight: 600 }}
                        >
                            {searching ? 'Ricerca...' : 'Cerca'}
                        </button>
                    </div>

                    {message && (
                        <div style={{
                            marginTop: '1.5rem', padding: '1rem', borderRadius: '12px',
                            background: message.startsWith('❌') ? 'rgba(255, 78, 80, 0.1)' : 'rgba(56, 249, 215, 0.1)',
                            color: message.startsWith('❌') ? 'var(--color-danger)' : 'var(--color-primary)',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500
                        }}>
                            {message}
                        </div>
                    )}

                    {searchResults.length > 0 && (
                        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease' }}>
                            <h4 style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Risultati</h4>
                            {searchResults.map(u => (
                                <div key={u.id} className="card user-result-card" style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '1rem 1.2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '16px', transition: 'all 0.2s ease', cursor: 'default'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div className="avatar" style={{
                                            width: 50, height: 50, borderRadius: '50%',
                                            background: getAvatarGradient(u.username),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 'bold', fontSize: '1.4rem',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                        }}>
                                            {u.username[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '1.15rem' }}>{u.username}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                                                <Trophy size={12} /> Livello {u.level}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => handleAddFriend(u.id, u.username)}
                                        style={{ padding: '0.6rem 1.2rem', borderRadius: '25px', fontSize: '0.95rem', fontWeight: 600 }}
                                    >
                                        ➕ Aggiungi
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Columns */}
            <div className="explore-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Trending Tab */}
                <div className="card" style={{ padding: '1.2rem' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                        <Flame size={18} color="var(--color-danger)" /> Tendenze
                    </h4>
                    {sidebarLoading ? (
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Caricamento tendenze...</div>
                    ) : trendingTopics.length === 0 ? (
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Nessun hashtag popolare al momento. Fai il primo post!</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {trendingTopics.map((topic, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i !== trendingTopics.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{topic.tag}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{topic.posts} post</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Leaderboard Tab */}
                <div className="card" style={{ padding: '1.2rem' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                        <Trophy size={18} color="var(--color-accent)" /> Top Studenti
                    </h4>
                    {sidebarLoading ? (
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Caricamento classifica...</div>
                    ) : topStudents.length === 0 ? (
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Nessuno studente trovato.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {topStudents.map((student, i) => (
                                <div key={i} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: 24, height: 24, borderRadius: '50%', background: i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: i < 3 ? 'black' : 'white', fontWeight: 'bold', fontSize: '0.8rem'
                                    }}>
                                        {i + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{student.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Livello {student.level} • {student.xp} XP</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
