import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function Feed() {
    const { user } = useAuth()
    const [posts, setPosts] = useState([])
    const [newPostContent, setNewPostContent] = useState('')
    const [loading, setLoading] = useState(true)
    const [publishing, setPublishing] = useState(false)
    const [error, setError] = useState('')
    const [newPostsCount, setNewPostsCount] = useState(0)

    // Comments State
    const [expandedComments, setExpandedComments] = useState({}) // { postId: boolean }
    const [newCommentContent, setNewCommentContent] = useState({}) // { postId: string }
    const [publishingComment, setPublishingComment] = useState({}) // { postId: boolean }

    const fetchPosts = useCallback(async (isPolling = false) => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select(`
                    id, 
                    content, 
                    created_at, 
                    user_id,
                    users_data ( username ),
                    post_likes ( user_id ),
                    post_comments ( id, content, created_at, user_id, users_data(username) )
                `)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error

            const formattedPosts = data.map(post => ({
                id: post.id,
                content: post.content,
                createdAt: new Date(post.created_at),
                authorId: post.user_id,
                authorName: post.users_data?.username || 'Utente',
                likes: post.post_likes?.map(l => l.user_id) || [],
                hasLiked: post.post_likes?.some(l => l.user_id === user?.id) || false,
                comments: (post.post_comments || []).map(c => ({
                    id: c.id,
                    content: c.content,
                    createdAt: new Date(c.created_at),
                    authorId: c.user_id,
                    authorName: c.users_data?.username || 'Utente'
                })).sort((a, b) => a.createdAt - b.createdAt)
            }))

            if (isPolling) {
                setPosts(prev => {
                    if (prev.length === 0) return formattedPosts;
                    const latestPrevDate = prev[0].createdAt;
                    const newItems = formattedPosts.filter(p => p.createdAt > latestPrevDate);

                    if (newItems.length > 0) {
                        setNewPostsCount(prevCount => prevCount + newItems.length);
                        return prev;
                    }

                    // Update likes and comments silently
                    return prev.map(oldPost => {
                        const newPostData = formattedPosts.find(p => p.id === oldPost.id);
                        return newPostData ? {
                            ...oldPost,
                            likes: newPostData.likes,
                            hasLiked: newPostData.hasLiked,
                            comments: newPostData.comments
                        } : oldPost;
                    });
                })
            } else {
                setPosts(formattedPosts)
                setNewPostsCount(0)
            }
        } catch (err) {
            console.error('Error fetching posts:', err)
            if (!isPolling) setError('Impossibile caricare i post.')
        } finally {
            if (!isPolling) setLoading(false)
        }
    }, [user])

    useEffect(() => {
        fetchPosts()
        const intervalId = setInterval(() => fetchPosts(true), 15000)
        return () => clearInterval(intervalId)
    }, [fetchPosts])

    const loadNewPosts = () => fetchPosts()

    const handlePublish = async () => {
        if (!newPostContent.trim()) return

        setPublishing(true)
        setError('')

        try {
            const { data, error } = await supabase
                .from('posts')
                .insert([{ user_id: user.id, content: newPostContent.trim() }])
                .select(`id, content, created_at, user_id, users_data ( username )`)
                .single()

            if (error) throw error

            const newPost = {
                id: data.id,
                content: data.content,
                createdAt: new Date(data.created_at),
                authorId: data.user_id,
                authorName: data.users_data?.username || 'Utente',
                likes: [], hasLiked: false, comments: []
            }

            setPosts(prev => [newPost, ...prev])
            setNewPostContent('')
        } catch (err) {
            console.error('Publish error:', err)
            setError('Errore durante la pubblicazione.')
        } finally {
            setPublishing(false)
        }
    }

    const toggleLike = async (postId, currentlyLiked) => {
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const newLikes = currentlyLiked ? p.likes.filter(id => id !== user.id) : [...p.likes, user.id];
                return { ...p, hasLiked: !currentlyLiked, likes: newLikes }
            }
            return p
        }))

        try {
            if (currentlyLiked) {
                await supabase.from('post_likes').delete().match({ post_id: postId, user_id: user.id })
            } else {
                await supabase.from('post_likes').insert([{ post_id: postId, user_id: user.id }])
            }
        } catch (error) {
            console.error('Error toggling like:', error)
            fetchPosts()
        }
    }

    const handleAddComment = async (postId) => {
        const content = newCommentContent[postId]
        if (!content || !content.trim()) return

        setPublishingComment(prev => ({ ...prev, [postId]: true }))
        try {
            const { data, error } = await supabase
                .from('post_comments')
                .insert([{ post_id: postId, user_id: user.id, content: content.trim() }])
                .select(`id, content, created_at, user_id, users_data ( username )`)
                .single()

            if (error) throw error

            const newComment = {
                id: data.id,
                content: data.content,
                createdAt: new Date(data.created_at),
                authorId: data.user_id,
                authorName: data.users_data?.username || 'Utente'
            }

            setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p))
            setNewCommentContent(prev => ({ ...prev, [postId]: '' }))
        } catch (err) {
            console.error("Errore commento:", err)
        } finally {
            setPublishingComment(prev => ({ ...prev, [postId]: false }))
        }
    }

    const toggleComments = (postId) => setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }))

    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " anni fa";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " mesi fa";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " gg fa";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " ore fa";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " min fa";
        return Math.floor(seconds) + " sec fa";
    }

    const getAvatarGradient = (name) => {
        const colors = [
            'linear-gradient(135deg, #FF6B6B, #FF8E53)',
            'linear-gradient(135deg, #4FACFE, #00F2FE)',
            'linear-gradient(135deg, #43E97B, #38F9D7)',
            'linear-gradient(135deg, #FA709A, #FEE140)',
            'linear-gradient(135deg, #667EEA, #764BA2)'
        ];
        return colors[name.charCodeAt(0) % colors.length];
    }

    // Function to parse hashtags and mentions
    const parseContent = (text) => {
        const parts = text.split(/(#\w+|@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('#')) return <span key={i} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{part}</span>
            if (part.startsWith('@')) return <span key={i} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{part}</span>
            return part
        });
    }

    return (
        <div className="feed-container">
            {/* Create Post Area */}
            <div className="card create-post-card" style={{ marginBottom: '1.5rem', background: 'rgba(25, 25, 35, 0.6)', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div className="avatar" style={{
                        width: 45, height: 45, borderRadius: '50%',
                        background: getAvatarGradient(user?.email || 'A'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 'bold', flexShrink: 0, fontSize: '1.2rem'
                    }}>
                        {(user?.email || 'U')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <textarea
                            placeholder="Cosa stai studiando oggi? Usa #hashtag o tagga @amici"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            style={{
                                width: '100%', minHeight: newPostContent.length > 50 ? '120px' : '80px',
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '16px', padding: '1rem', color: 'var(--color-text)',
                                resize: 'none', marginBottom: '0.8rem', transition: 'min-height 0.3s ease',
                                fontSize: '1.05rem'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn-icon" style={{ padding: '0.5rem', opacity: 0.7 }} title="Aggiungi Foto">📷</button>
                                <button className="btn-icon" style={{ padding: '0.5rem', opacity: 0.7 }} title="Emoctions">😊</button>
                            </div>
                            <button
                                className="btn-primary"
                                onClick={handlePublish}
                                disabled={publishing || !newPostContent.trim()}
                                style={{ borderRadius: '25px', padding: '0.6rem 2rem', fontWeight: 600 }}
                            >
                                {publishing ? 'Pubblicazione...' : 'Pubblica 🚀'}
                            </button>
                        </div>
                    </div>
                </div>
                {error && <div style={{ color: 'var(--color-danger)', marginTop: '1rem', fontSize: '0.9rem' }}>{error}</div>}
            </div>

            {/* New Posts Indicator */}
            {newPostsCount > 0 && (
                <div
                    onClick={loadNewPosts}
                    style={{
                        background: 'var(--color-primary)', color: 'white',
                        textAlign: 'center', padding: '0.8rem', borderRadius: '25px',
                        cursor: 'pointer', marginBottom: '1.5rem', fontWeight: 600,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)', transition: 'all 0.2s ease',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                        animation: 'bounce 2s infinite'
                    }}
                >
                    ⬆️ {newPostsCount} {newPostsCount === 1 ? 'Nuovo Post' : 'Nuovi Post'}
                </div>
            )}

            {/* Posts Feed */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card skeleton" style={{ height: '150px', opacity: 0.5, animation: 'pulse 1.5s infinite' }}></div>
                    ))}
                </div>
            ) : posts.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div style={{ fontSize: '4rem', opacity: 0.8, marginBottom: '1rem' }}>📭</div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Nessun post nella bacheca</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Non ci sono ancora post. Sii il primo a condividere qualcosa rompendo il ghiaccio!
                    </p>
                </div>
            ) : (
                <div className="posts-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {posts.map(post => (
                        <div key={post.id} className="card post-card" style={{ padding: '1.2rem', paddingBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div className="avatar" style={{
                                    width: 45, height: 45, borderRadius: '50%', ...{ background: getAvatarGradient(post.authorName) },
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem'
                                }}>
                                    {post.authorName[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{post.authorName}</div>
                                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
                                        {timeAgo(post.createdAt)}
                                    </div>
                                </div>
                            </div>

                            <div style={{ fontSize: '1.05rem', lineHeight: 1.5, marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
                                {parseContent(post.content)}
                            </div>

                            <div style={{
                                display: 'flex', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem', paddingBottom: '0.8rem'
                            }}>
                                <button
                                    onClick={() => toggleLike(post.id, post.hasLiked)}
                                    className="reaction-btn"
                                    style={{
                                        background: post.hasLiked ? 'rgba(255, 78, 80, 0.15)' : 'rgba(255,255,255,0.03)',
                                        border: 'none', color: post.hasLiked ? 'var(--color-danger)' : 'var(--color-text)',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        fontSize: '0.95rem', padding: '0.5rem 1rem', borderRadius: '20px', transition: 'all 0.2s', fontWeight: 600
                                    }}
                                >
                                    <span style={{ transform: post.hasLiked ? 'scale(1.2)' : 'scale(1)', display: 'inline-block', transition: 'transform 0.2s' }}>
                                        {post.hasLiked ? '❤️' : '🤍'}
                                    </span>
                                    {post.likes.length}
                                </button>

                                <button
                                    onClick={() => toggleComments(post.id)}
                                    className="reaction-btn"
                                    style={{
                                        background: expandedComments[post.id] ? 'rgba(56, 249, 215, 0.15)' : 'rgba(255,255,255,0.03)',
                                        border: 'none', color: expandedComments[post.id] ? 'var(--color-primary)' : 'var(--color-text)',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        fontSize: '0.95rem', padding: '0.5rem 1rem', borderRadius: '20px', transition: 'all 0.2s', fontWeight: 600
                                    }}>
                                    💬 {post.comments.length > 0 ? post.comments.length : 'Rispondi'}
                                </button>
                            </div>

                            {/* Comments Section */}
                            {expandedComments[post.id] && (
                                <div style={{
                                    marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)',
                                    animation: 'fadeIn 0.3s ease'
                                }}>
                                    {post.comments.map(comment => (
                                        <div key={comment.id} style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem' }}>
                                            <div className="avatar" style={{
                                                width: 32, height: 32, borderRadius: '50%', ...{ background: getAvatarGradient(comment.authorName) },
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0
                                            }}>
                                                {comment.authorName[0].toUpperCase()}
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1rem', borderRadius: '0 16px 16px 16px', flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{comment.authorName}</span>
                                                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>{timeAgo(comment.createdAt)}</span>
                                                </div>
                                                <span style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>{parseContent(comment.content)}</span>
                                            </div>
                                        </div>
                                    ))}

                                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem', alignItems: 'center' }}>
                                        <div className="avatar" style={{
                                            width: 32, height: 32, borderRadius: '50%', background: getAvatarGradient(user?.email || 'A'),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0
                                        }}>
                                            {(user?.email || 'U')[0].toUpperCase()}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Scrivi un commento..."
                                            value={newCommentContent[post.id] || ''}
                                            onChange={e => setNewCommentContent(prev => ({ ...prev, [post.id]: e.target.value }))}
                                            onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                                            style={{
                                                flex: 1, padding: '0.8rem 1.2rem', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.95rem'
                                            }}
                                        />
                                        <button
                                            className="btn-primary"
                                            disabled={publishingComment[post.id] || !(newCommentContent[post.id] || '').trim()}
                                            onClick={() => handleAddComment(post.id)}
                                            style={{ borderRadius: '50%', width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            ➔
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
