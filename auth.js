// ============================================
// AUTH MANAGER - Supabase Integration
// ============================================

const SUPABASE_URL = 'https://rzdpntvojpibbndhsrlz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_59TUF-ZKXzQ-W7cCx1myVQ_rBFzBkIK';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const AuthManager = {
    user: null,

    async init() {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        this.user = session?.user || null;

        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth Event:', event);
            this.user = session?.user || null;
            this.updateUI();

            if (event === 'SIGNED_IN') {
                StorageManager.loadFromCloud();
            }
        });

        this.updateUI();
    },

    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
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
