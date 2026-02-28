import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function FriendsTab() {
    const { user } = useAuth()
    const [friends, setFriends] = useState([])
    const [pendingRequests, setPendingRequests] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchFriendsData = async () => {
        setLoading(true)
        try {
            // 1. Fetch pending requests (where user is receiver and status is pending)
            const { data: reqData, error: reqError } = await supabase
                .from('friendships')
                .select(`
                    id,
                    sender_id,
                    status,
                    sender:users_data!sender_id ( username )
                `)
                .eq('receiver_id', user.id)
                .eq('status', 'pending')

            if (reqError) throw reqError

            const formattedRequests = (reqData || []).map(r => ({
                id: r.id,
                senderId: r.sender_id,
                senderName: r.sender?.username || 'Utente Sconosciuto'
            }))

            setPendingRequests(formattedRequests)

            // 2. Fetch accepted friends (where user is sender OR receiver, and status is accepted)
            const { data: friendsData, error: friendsError } = await supabase
                .from('friendships')
                .select(`
                    id,
                    sender_id,
                    receiver_id,
                    status,
                    sender:users_data!sender_id ( id, username ),
                    receiver:users_data!receiver_id ( id, username )
                `)
                .eq('status', 'accepted')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

            if (friendsError) throw friendsError

            const formattedFriends = (friendsData || []).map(f => {
                const isSender = f.sender_id === user.id
                const friendInfo = isSender ? f.receiver : f.sender
                return {
                    id: f.id, // friendship ID
                    friendId: friendInfo.id,
                    friendName: friendInfo.username || 'Utente'
                }
            })

            setFriends(formattedFriends)

        } catch (error) {
            console.error('Error fetching friends data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFriendsData()
    }, [user])

    const handleAcceptRequest = async (requestId) => {
        try {
            const { error } = await supabase
                .from('friendships')
                .update({ status: 'accepted' })
                .eq('id', requestId)

            if (error) throw error
            fetchFriendsData() // Refresh list
        } catch (error) {
            console.error('Error accepting friend request:', error)
            alert('Errore accettazione amicizia.')
        }
    }

    const handleRejectRequest = async (requestId) => {
        try {
            const { error } = await supabase
                .from('friendships')
                .delete()
                .eq('id', requestId)

            if (error) throw error
            fetchFriendsData() // Refresh list
        } catch (error) {
            console.error('Error rejecting friend request:', error)
        }
    }

    const handleRemoveFriend = async (friendshipId) => {
        if (!window.confirm("Sei sicuro di voler rimuovere questo amico?")) return;

        try {
            const { error } = await supabase
                .from('friendships')
                .delete()
                .eq('id', friendshipId)

            if (error) throw error
            fetchFriendsData() // Refresh list
        } catch (error) {
            console.error('Error removing friend:', error)
        }
    }

    const getAvatarGradient = (name) => {
        const colors = [
            'linear-gradient(135deg, #FF6B6B, #FF8E53)',
            'linear-gradient(135deg, #4FACFE, #00F2FE)',
            'linear-gradient(135deg, #43E97B, #38F9D7)'
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    }

    if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner"></div></div>

    return (
        <div className="friends-container">
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--color-primary)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                        🔔 Richieste in Sospeso ({pendingRequests.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        {pendingRequests.map(req => (
                            <div key={req.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div className="avatar" style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: getAvatarGradient(req.senderName),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 'bold'
                                    }}>
                                        {req.senderName[0].toUpperCase()}
                                    </div>
                                    <span style={{ fontWeight: 600 }}>{req.senderName}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleAcceptRequest(req.id)}
                                        style={{
                                            background: 'var(--color-primary)', color: 'white',
                                            border: 'none', padding: '0.4rem 1rem', borderRadius: '20px', cursor: 'pointer'
                                        }}>
                                        Accetta
                                    </button>
                                    <button
                                        onClick={() => handleRejectRequest(req.id)}
                                        style={{
                                            background: 'rgba(255,255,255,0.1)', color: 'white',
                                            border: 'none', padding: '0.4rem 1rem', borderRadius: '20px', cursor: 'pointer'
                                        }}>
                                        Rifiuta
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Friends List */}
            <div className="card">
                <h3>👥 I miei Amici ({friends.length})</h3>

                {friends.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                        <div style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem' }}>🤝</div>
                        <p style={{ color: 'var(--color-text-secondary)' }}>
                            Non hai ancora amici nella tua rete.<br />Vai su "Esplora" per cercare i tuoi compagni!
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.5rem' }}>
                        {friends.map(f => (
                            <div key={f.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                transition: 'background 0.2s', borderRadius: '8px'
                            }} className="friend-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div className="avatar" style={{
                                        width: 45, height: 45, borderRadius: '50%',
                                        background: getAvatarGradient(f.friendName),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 'bold', fontSize: '1.2rem'
                                    }}>
                                        {f.friendName[0].toUpperCase()}
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{f.friendName}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="btn-primary"
                                        style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem' }}
                                        onClick={() => {
                                            // TODO: Pass to Duel UI
                                            alert(`Sfida ${f.friendName} non ancora implementata nella Bacheca, usa il menu Duello!`)
                                        }}
                                    >
                                        ⚔️ Sfida
                                    </button>
                                    <button
                                        onClick={() => handleRemoveFriend(f.id)}
                                        style={{
                                            background: 'transparent', color: 'var(--color-text-secondary)',
                                            border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem 0.8rem',
                                            borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem'
                                        }}>
                                        ✖
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
