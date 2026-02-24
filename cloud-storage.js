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
    // First tries Supabase (source of truth), falls back to user-scoped cache
    async load(userId) {
        if (!userId) return {};

        try {
            const { data, error } = await supabaseClient
                .from('users_data')
                .select('data')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 = row not found, that's fine for new users
                console.warn('CloudStorage load error:', error);
            }

            if (data && data.data) {
                // Hydrate cache
                localStorage.setItem(this._cacheKey(userId), JSON.stringify(data.data));
                return data.data;
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
    // Writes to user-scoped cache + Supabase (non-blocking)
    save(userId, data) {
        if (!userId) return;

        // Ensure historical counts exist
        if (!data.counters) data.counters = {};

        const currentNotesCount = (data.notes || []).length;
        const currentFlashcardsCount = (data.flashcards || []).length;

        // Initialize if first time
        if (data.counters.totalNotesCreated === undefined) {
            data.counters.totalNotesCreated = currentNotesCount;
            data.counters.totalFlashcardsCreated = currentFlashcardsCount;
            data.counters.lastNotesCount = currentNotesCount;
            data.counters.lastFlashcardsCount = currentFlashcardsCount;
        } else {
            // Only increment if we added something (don't decrement if deleted)
            if (currentNotesCount > data.counters.lastNotesCount) {
                data.counters.totalNotesCreated += (currentNotesCount - data.counters.lastNotesCount);
            }
            if (currentFlashcardsCount > data.counters.lastFlashcardsCount) {
                data.counters.totalFlashcardsCreated += (currentFlashcardsCount - data.counters.lastFlashcardsCount);
            }
            // Update the baseline for next comparison
            data.counters.lastNotesCount = currentNotesCount;
            data.counters.lastFlashcardsCount = currentFlashcardsCount;
        }

        // 1. Write-through cache (instant)
        localStorage.setItem(this._cacheKey(userId), JSON.stringify(data));

        // 2. Cloud sync (async, non-blocking)
        if (typeof supabaseClient !== 'undefined') {
            supabaseClient
                .from('users_data')
                .upsert({
                    id: userId,
                    data: data,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' })
                .then(({ error }) => {
                    if (error) console.error('CloudStorage save error:', error);
                });
        }
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

// ── INCREMENT GLOBAL SITE-WIDE STATS ──
// Used for historical data that never decreases (e.g. total notes created)
async function incrementGlobalStat(key, amount = 1) {
    try {
        if (typeof supabaseClient === 'undefined') return;

        // 1. Get current value
        const { data } = await supabaseClient
            .from('site_stats')
            .select('value')
            .eq('key', key)
            .single();

        let current = (data && data.value) ? Number(data.value) : 0;

        // 2. Upsert incremented value
        await supabaseClient
            .from('site_stats')
            .upsert({
                key: key,
                value: current + amount,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

    } catch (err) {
        console.warn(`Global stat increment failed for ${key}:`, err);
    }
}

// ── INCREMENT CHATBOT INTERACTIONS COUNTER ──
// Uses a site_stats table: { key: 'chatbot_interactions', value: number }
async function incrementChatbotStat() {
    await incrementGlobalStat('chatbot_interactions', 1);
}
