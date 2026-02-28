import { useState } from 'react'
import Feed from '../social/Feed'
import ExploreTab from '../social/ExploreTab'
import FriendsTab from '../social/FriendsTab'

export default function SocialSection() {
    const [activeTab, setActiveTab] = activeTabState()

    function activeTabState() {
        return useState('feed')
    }

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
                    display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem',
                    background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '30px',
                    width: 'fit-content', margin: '2rem auto 0 auto', border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <button
                        className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('feed')}
                        style={{
                            background: activeTab === 'feed' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'feed' ? 'white' : 'var(--color-text-secondary)',
                            border: 'none', padding: '0.6rem 1.5rem', borderRadius: '25px',
                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        📰 Bacheca
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
                        onClick={() => setActiveTab('explore')}
                        style={{
                            background: activeTab === 'explore' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'explore' ? 'white' : 'var(--color-text-secondary)',
                            border: 'none', padding: '0.6rem 1.5rem', borderRadius: '25px',
                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        🔍 Esplora
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                        onClick={() => setActiveTab('friends')}
                        style={{
                            background: activeTab === 'friends' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'friends' ? 'white' : 'var(--color-text-secondary)',
                            border: 'none', padding: '0.6rem 1.5rem', borderRadius: '25px',
                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        👥 Amici
                    </button>
                </div>
            </div>

            <div className="tab-content" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                {activeTab === 'feed' && <Feed />}
                {activeTab === 'explore' && <ExploreTab />}
                {activeTab === 'friends' && <FriendsTab />}
            </div>
        </section>
    )
}
