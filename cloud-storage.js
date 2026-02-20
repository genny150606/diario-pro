// ============================================
// CLOUD STORAGE — Per-user Supabase data sync
// Replaces localStorage for all user data.
// Data is stored in Supabase `users_data` table
// keyed by auth user ID. localStorage is used
// only as a write-through cache for performance.
// ============================================

const CloudStorage = {
    // ── INTERNAL CACHE KEY (user-scoped) ──
    _cacheKey(userId) {
        return `sj_data_${userId}`;
    },

    // ── CLEAR OLD GENERIC KEY (migration) ──
    _clearLegacy() {
        localStorage.removeItem('studyjournal_data');
    },

    // ── CLEAR THIS USER'S CACHE ──
    clearCache(userId) {
        if (userId) localStorage.removeItem(this._cacheKey(userId));
        // Also wipe legacy
        this._clearLegacy();
    },

    // ── LOAD DATA FOR A USER ──
    // First tries Proxy -> Supabase (source of truth), falls back to user-scoped cache
    async load(userId) {
        if (!userId) return {};

        try {
            // Bypass aggressive frontend blockers by routing through Vercel
            const response = await fetch(`/api/sync-user-data?id=${userId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('No cloud data yet for user.');
                } else {
                    console.warn(`CloudStorage load error (${response.status}):`, await response.text());
                }
            } else {
                const data = await response.json();
                if (data && data.data) {
                    // Hydrate cache
                    localStorage.setItem(this._cacheKey(userId), JSON.stringify(data.data));
                    return data.data;
                }
            }

            // No cloud data: check user-scoped local cache
            const cached = localStorage.getItem(this._cacheKey(userId));
            return cached ? JSON.parse(cached) : {};

        } catch (err) {
            console.error('CloudStorage load exception:', err);
            // Fall back to user-scoped cache
            const cached = localStorage.getItem(this._cacheKey(userId));
            return cached ? JSON.parse(cached) : {};
        }
    },

    // ── SAVE DATA FOR A USER ──
    // Writes to user-scoped cache + Supabase Proxy (non-blocking)
    save(userId, data) {
        if (!userId) return;

        // 1. Write-through cache (instant)
        localStorage.setItem(this._cacheKey(userId), JSON.stringify(data));

        // 2. Cloud sync via Proxy (async, non-blocking)
        fetch('/api/sync-user-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, data: data })
        }).catch(error => {
            console.error('CloudStorage Proxy save error:', error);
        });
    },

    // ── LOAD FROM CACHE ONLY (sync, for immediate reads) ──
    loadCached(userId) {
        if (!userId) return {};
        const cached = localStorage.getItem(this._cacheKey(userId));
        return cached ? JSON.parse(cached) : {};
    }
};

// ── GLOBAL HELPERS (drop-in replacements for old loadData/saveData) ──
// These get the user from AuthManager automatically.

function loadData() {
    if (!AuthManager || !AuthManager.user) return {};
    const userId = AuthManager.user.id;
    // Return from user-scoped cache synchronously (already hydrated on login)
    return CloudStorage.loadCached(userId);
}

function saveData(data) {
    if (!AuthManager || !AuthManager.user) {
        // Show auth overlay if not logged in
        const overlay = document.getElementById('authModal');
        if (overlay) overlay.style.display = 'flex';
        return;
    }
    CloudStorage.save(AuthManager.user.id, data);
}

// ── INCREMENT CHATBOT INTERACTIONS COUNTER ──
// Uses a site_stats table: { key: 'chatbot_interactions', value: number }
async function incrementChatbotStat() {
    try {
        if (typeof supabaseClient === 'undefined') return;

        // Read current value
        const { data } = await supabaseClient
            .from('site_stats')
            .select('value')
            .eq('key', 'chatbot_interactions')
            .single();

        const current = (data && data.value) ? Number(data.value) : 0;

        // Upsert incremented value
        await supabaseClient
            .from('site_stats')
            .upsert({
                key: 'chatbot_interactions',
                value: current + 1,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

    } catch (err) {
        // Silently fail - stats are non-critical
        console.warn('Chatbot stat increment failed:', err);
    }
}
