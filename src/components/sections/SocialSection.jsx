import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export default function SocialSection() {
    const { user } = useAuth()
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [friends, setFriends] = useState([])
    const [message, setMessage] = useState('')

    const handleSearch = async () => {
        if (!searchQuery.trim() || searchQuery.length < 3) return
        setSearching(true)
        setMessage('')

        try {
            const { data, error } = await supabase
                .from('users_data')
                .select('id, data')
                .neq('id', user?.id)

            if (error) throw error

            const filtered = (data || [])
                .filter(u => {
                    const username = u.data?.username || u.data?.email || ''
                    return username.toLowerCase().includes(searchQuery.toLowerCase())
                })
                .slice(0, 10)
                .map(u => ({
                    id: u.id,
                    username: u.data?.username || u.data?.email?.split('@')[0] || 'Utente'
                }))

            setSearchResults(filtered)
            if (filtered.length === 0) setMessage('Nessun utente trovato')
        } catch (err) {
            setMessage(`❌ Errore ricerca: ${err.message}`)
        } finally {
            setSearching(false)
        }
    }

    const handleAddFriend = (userId, username) => {
        setFriends(prev => [...prev, { id: userId, username }])
        setMessage(`✅ Richiesta inviata a ${username}!`)
        setSearchResults(prev => prev.filter(u => u.id !== userId))
    }

    return (
        <section className="section active">
            <div className="hero">
                <h1><span className="gradient-text">Social</span> 👥</h1>
                <p>Connettiti con i tuoi compagni di studio</p>
            </div>

            {/* Search */}
            <div className="card">
                <h3>🔍 Cerca Studenti</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        placeholder="Cerca per username..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        style={{ flex: 1, marginBottom: 0 }}
                    />
                    <button className="btn-primary" onClick={handleSearch} disabled={searching} style={{ minWidth: 80 }}>
                        {searching ? '⏳' : '🔍 Cerca'}
                    </button>
                </div>

                {message && <p style={{ marginTop: '0.8rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{message}</p>}

                {searchResults.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        {searchResults.map(u => (
                            <div key={u.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>👤 {u.username}</span>
                                </div>
                                <button className="btn-secondary" onClick={() => handleAddFriend(u.id, u.username)}
                                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', minHeight: 'unset' }}>
                                    ➕ Aggiungi
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Friends */}
            <div className="card" style={{ marginTop: '1rem' }}>
                <h3>👫 I tuoi Amici ({friends.length})</h3>
                {friends.length === 0 ? (
                    <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
                        Nessun amico ancora. Cerca e aggiungi compagni di studio!
                    </p>
                ) : (
                    friends.map(f => (
                        <div key={f.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <span style={{ fontWeight: 600 }}>👤 {f.username}</span>
                            <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', minHeight: 'unset' }}>
                                ⚔️ Sfida
                            </button>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
