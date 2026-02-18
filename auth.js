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

    async signUp(email, password, userData = {}) {
        // Smart School Recommendation Logic
        let schoolType = 'liceo'; // Default
        if (userData.age) {
            schoolType = userData.age <= 18 ? 'liceo' : 'università';
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    ...userData,
                    school_type: schoolType
                }
            }
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
        // Close dropdown if open
        const dropdown = document.getElementById('accountDropdown');
        if (dropdown) dropdown.classList.remove('show');
    },

    async updatePassword(newPassword) {
        if (!newPassword || newPassword.length < 6) {
            throw new Error('La password deve essere di almeno 6 caratteri.');
        }
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return true;
    },

    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const userProfile = document.getElementById('userProfile');

        if (this.user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userProfile) {
                userProfile.style.display = 'flex';
                const emailDisplay = document.getElementById('userEmailDisplay');
                if (emailDisplay) {
                    // Truncate email if too long on mobile
                    const email = this.user.email;
                    emailDisplay.textContent = email.length > 20 ? email.substring(0, 17) + '...' : email;
                }
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (userProfile) userProfile.style.display = 'none';
        }
    }
};

// Global helpers for Account Menu
function toggleAccountMenu() {
    const dropdown = document.getElementById('accountDropdown');
    const chevron = document.querySelector('.account-btn .chevron');
    if (dropdown) {
        dropdown.classList.toggle('show');
        if (chevron) {
            chevron.style.transform = dropdown.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0)';
        }
    }
}

function openChangePasswordModal() {
    document.getElementById('passwordModal').style.display = 'flex';
    document.getElementById('accountDropdown').classList.remove('show');
    document.getElementById('passwordError').style.display = 'none';
    document.getElementById('passwordSuccess').style.display = 'none';
    document.getElementById('newPassword').value = '';
}

async function handleUpdatePassword() {
    const newPassword = document.getElementById('newPassword').value;
    const errorEl = document.getElementById('passwordError');
    const successEl = document.getElementById('passwordSuccess');

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    try {
        await AuthManager.updatePassword(newPassword);
        successEl.textContent = '✅ Password aggiornata con successo!';
        successEl.style.display = 'block';
        setTimeout(() => {
            document.getElementById('passwordModal').style.display = 'none';
        }, 2000);
    } catch (err) {
        errorEl.textContent = '❌ ' + err.message;
        errorEl.style.display = 'block';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const profile = document.getElementById('userProfile');
    const dropdown = document.getElementById('accountDropdown');
    if (profile && !profile.contains(e.target)) {
        if (dropdown) dropdown.classList.remove('show');
        const chevron = document.querySelector('.account-btn .chevron');
        if (chevron) chevron.style.transform = 'rotate(0)';
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => AuthManager.init());
