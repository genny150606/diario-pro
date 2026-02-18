// ============================================
// AUTH MANAGER - Supabase Integration
// ============================================

const SUPABASE_URL = 'https://rzdpntvojpibbndhsrlz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_59TUF-ZKXzQ-W7cCx1myVQ_rBFzBkIK';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const AuthManager = {
    user: null,

    async init() {
        try {
            // Check for existing session
            const { data: { session } } = await supabaseClient.auth.getSession();
            this.user = session?.user || null;

            // Listen for auth changes
            supabaseClient.auth.onAuthStateChange((event, session) => {
                console.log('Auth Event:', event);
                const prevUser = this.user;
                this.user = session?.user || null;
                this.updateUI();

                if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
                    // Prevent infinite reload loop using sessionStorage
                    if (sessionStorage.getItem('cloudSyncDone')) return;

                    // Try to load from cloud using either StorageManager or direct Supabase call
                    if (typeof StorageManager !== 'undefined' && StorageManager.loadFromCloud) {
                        sessionStorage.setItem('cloudSyncDone', 'true');
                        StorageManager.loadFromCloud();
                    } else if (typeof supabaseClient !== 'undefined') {
                        // Fallback for index.html standalone
                        supabaseClient
                            .from('users_data')
                            .select('data')
                            .eq('id', session.user.id)
                            .single()
                            .then(({ data, error }) => {
                                if (!error && data && data.data) {
                                    localStorage.setItem('studyjournal_data', JSON.stringify(data.data));
                                    sessionStorage.setItem('cloudSyncDone', 'true');
                                    location.reload();
                                }
                            });
                    }
                }

                if (event === 'SIGNED_OUT') {
                    sessionStorage.removeItem('cloudSyncDone');
                }


            });

            this.updateUI();
        } catch (err) {
            console.error('Auth Init Error:', err);
        }
    },

    async signUp(email, password) {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async signIn(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        this.user = null;
        this.updateUI();
    },

    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const userProfile = document.getElementById('userProfile');

        if (this.user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userProfile) {
                userProfile.style.display = 'flex';
                document.getElementById('userEmailDisplay').textContent = this.user.email;
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (userProfile) userProfile.style.display = 'none';
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => AuthManager.init());
