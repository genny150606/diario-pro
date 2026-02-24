// ============================================
// AUTH MANAGER - Supabase Integration
// ============================================

const SUPABASE_URL = 'https://rzdpntvojpibbndhsrlz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHBudHZvanBpYmJuZGhzcmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzg1MjEsImV4cCI6MjA4Njk1NDUyMX0.QwnT9Okp8CkN_LxGIeBKWrroo3letL8OhSvaqdQVW7M';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
    // ANTI-BOT FIX: Use our new PRISTINE Vercel Proxy to bypass Cloudflare 520
    global: {
        fetch: async (url, options) => {
            const urlStr = url.toString();
            const isLocalFile = window.location.protocol === 'file:';

            // ANTI-BOT FIX: Use Vercel Proxy to bypass Cloudflare 520.
            // Even on production, we try the proxy FIRST to use a custom User-Agent.
            if (urlStr.includes('/rest/v1/')) {
                const proxyUrl = isLocalFile ? 'https://diario-pro.vercel.app/api/supabase-proxy' : '/api/supabase-proxy';
                const path = urlStr.split('/rest/v1/')[1];
                const rawHeaders = {};
                if (options.headers) {
                    new Headers(options.headers).forEach((v, k) => rawHeaders[k] = v);
                }

                const proxyBody = {
                    path: `/rest/v1/${path}`,
                    method: options.method,
                    headers: rawHeaders,
                    body: options.body
                };

                // CLIENT-SIDE RETRY LOGIC (Exponential Backoff with Jitter)
                let lastRes;
                for (let attempt = 0; attempt < 4; attempt++) {
                    try {
                        console.log(`[PROXY REQ] ${proxyBody.method} ${proxyBody.path} (Attempt ${attempt + 1})`);

                        lastRes = await fetch(proxyUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Client-Info': 'studyjournal-pro-client',
                                'X-Client-Retry-Count': attempt.toString()
                            },
                            body: JSON.stringify(proxyBody)
                        });

                        // Success or client-side error (4xx) - no use retrying generally
                        if (lastRes.ok || (lastRes.status >= 400 && lastRes.status < 500)) {
                            return lastRes;
                        }

                        console.warn(`[AUTH RETRY] Proxy attempt ${attempt + 1} got status ${lastRes.status}`);
                    } catch (err) {
                        console.error(`[AUTH RETRY] Proxy attempt ${attempt + 1} failed:`, err);
                    }
                    if (attempt < 3) {
                        const delay = 1000 * Math.pow(2, attempt) + (Math.random() * 500);
                        await new Promise(r => setTimeout(r, delay));
                    }
                }

                // SMART FALLBACK: If proxy fails on Vercel URL, try direct Supabase
                const isPublicVercel = window.location.hostname === 'diario-pro.vercel.app';
                if (isPublicVercel && (!lastRes || lastRes.status >= 500)) {
                    console.warn("⚠️ Proxy failed on public site. Falling back to DIRECT Supabase connection...");
                    return window.fetch(url, options); // Explicitly use native fetch
                }

                return lastRes;
            }
            return window.fetch(url, options); // Explicitly use native fetch
        }
    }
});

const AuthManager = {
    user: null,

    async init() {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            this.user = session?.user || null;

            const isAppPage = window.location.pathname.includes('app');

            // ── AUTH GATE: Show login overlay if not authenticated ──
            if (isAppPage && !this.user) {
                this.showAuthGate();
            }

            // Listen for auth changes
            supabaseClient.auth.onAuthStateChange((event, session) => {
                console.log('Auth Event:', event);
                this.user = session?.user || null;
                this.updateUI();

                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    // Hide auth overlay, reveal app
                    if (event === 'SIGNED_IN') this.hideAuthGate();

                    // SELF-HEALING: Ensure users_data row exists
                    if (session && session.user) {
                        const uid = session.user.id;
                        supabaseClient
                            .from('users_data')
                            .select('id')
                            .eq('id', uid)
                            .maybeSingle()
                            .then(({ data }) => {
                                if (!data) {
                                    // Row missing? Create it now.
                                    console.log('🚧 Fixing missing users_data row for:', uid);
                                    return supabaseClient.from('users_data').insert([{ id: uid, data: {}, updated_at: new Date() }]);
                                }
                            })
                            .catch(err => console.warn('User row check failed', err));
                    }

                    // Load this user's data from Supabase into user-scoped cache
                    if (typeof CloudStorage !== 'undefined') {
                        CloudStorage._clearLegacy(); // remove shared key
                        CloudStorage.load(session.user.id).then(() => {
                            // Refresh UI after cloud data is loaded
                            if (typeof updateDashboard === 'function') updateDashboard();
                            if (typeof loadNotes === 'function') loadNotes();
                            if (typeof loadTasks === 'function') loadTasks();
                            if (typeof loadGrades === 'function') loadGrades();
                            if (typeof loadFlashcards === 'function') loadFlashcards();
                            if (typeof SocialManager !== 'undefined') SocialManager.init();
                        });
                    }
                }

                if (event === 'INITIAL_SESSION' && session) {
                    // Load this user's data from Supabase on page load
                    if (typeof CloudStorage !== 'undefined') {
                        CloudStorage._clearLegacy();
                        CloudStorage.load(session.user.id);
                    }
                }

                if (event === 'SIGNED_OUT') {
                    sessionStorage.removeItem('cloudSyncDone');
                    // Clear THIS user's local cache so next account starts fresh
                    if (typeof CloudStorage !== 'undefined' && this.user) {
                        CloudStorage.clearCache(this.user.id);
                    }
                    CloudStorage?._clearLegacy?.();
                    if (window.location.pathname.includes('app')) {
                        this.showAuthGate();
                    }
                }
            });

            this.updateUI();
        } catch (err) {
            console.error('Auth Init Error:', err);
        }
    },

    showAuthGate() {
        const overlay = document.getElementById('authModal');
        if (overlay) overlay.style.display = 'flex';

        // Hide app content behind overlay
        document.querySelectorAll('header, .main-content, #geminiChat').forEach(el => {
            el.style.display = 'none';
        });
    },

    hideAuthGate() {
        const overlay = document.getElementById('authModal');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.4s ease';
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.style.opacity = '1';
            }, 400);
        }

        // Show app content
        document.querySelectorAll('header, .main-content, #geminiChat').forEach(el => {
            el.style.display = '';
        });
    },

    async signUp(email, password, userData = {}) {
        let schoolType = 'liceo';
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

        // CRITICAL: Immediately create users_data row so homepage stats update instantly
        if (data && data.user) {
            const { error: insertError } = await supabaseClient.from('users_data').insert([
                {
                    id: data.user.id,
                    data: {},
                    updated_at: new Date().toISOString()
                }
            ]);

            if (insertError) console.error("Error creating user stats row:", insertError);
        }

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

// ═══════════ AUTH OVERLAY FUNCTIONS ═══════════

function switchAuthTab(tab) {
    const loginForm = document.getElementById('authLoginForm');
    const signupForm = document.getElementById('authSignupForm');
    const tabs = document.querySelectorAll('.auth-tab');

    tabs.forEach(t => t.classList.remove('active'));

    if (tab === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';
        tabs[0]?.classList.add('active');
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';
        tabs[1]?.classList.add('active');
    }
}

async function handleAuthSubmit() {
    const email = document.getElementById('authEmail')?.value.trim();
    const password = document.getElementById('authPassword')?.value;
    const errorEl = document.getElementById('authError');
    const successEl = document.getElementById('authSuccess');

    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';

    if (!email || !password) {
        if (errorEl) { errorEl.textContent = '❌ Inserisci email e password.'; errorEl.style.display = 'block'; }
        return;
    }

    try {
        const btn = document.querySelector('#authLoginForm .auth-submit-btn');
        if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.querySelector('span').textContent = 'Caricamento...'; }

        await AuthManager.signIn(email, password);
        if (successEl) { successEl.textContent = '✅ Accesso effettuato!'; successEl.style.display = 'block'; }
    } catch (err) {
        let msg = err.message;
        if (msg.includes('Invalid login')) msg = '❌ Email o password non corretti.';
        else if (msg.includes('Email not confirmed')) msg = '❌ Conferma la tua email prima di accedere.';
        else msg = '❌ ' + msg;
        if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }

        const btn = document.querySelector('#authLoginForm .auth-submit-btn');
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.querySelector('span').textContent = 'Accedi'; }
    }
}

async function handleSignupSubmit() {
    const name = document.getElementById('signupName')?.value.trim();
    const surname = document.getElementById('signupSurname')?.value.trim();
    const age = parseInt(document.getElementById('signupAge')?.value);
    const username = document.getElementById('signupUsername')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const password = document.getElementById('signupPassword')?.value;
    const errorEl = document.getElementById('signupError');
    const successEl = document.getElementById('signupSuccess');

    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';

    if (!name || !surname || !age || !username || !email || !password) {
        if (errorEl) { errorEl.textContent = '❌ Compila tutti i campi.'; errorEl.style.display = 'block'; }
        return;
    }
    if (password.length < 6) {
        if (errorEl) { errorEl.textContent = '❌ La password deve avere almeno 6 caratteri.'; errorEl.style.display = 'block'; }
        return;
    }

    try {
        const btn = document.querySelector('#authSignupForm .auth-submit-btn');
        if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.querySelector('span').textContent = 'Creazione...'; }

        await AuthManager.signUp(email, password, { name, surname, age, username });

        if (successEl) { successEl.textContent = '✅ Account creato! Controlla l\'email per confermare.'; successEl.style.display = 'block'; }
    } catch (err) {
        let msg = err.message;
        if (msg.includes('already registered')) msg = '❌ Questa email è già registrata.';
        else msg = '❌ ' + msg;
        if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }

        const btn = document.querySelector('#authSignupForm .auth-submit-btn');
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.querySelector('span').textContent = 'Crea Account'; }
    }
}

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
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();

    // Explicitly attach click handler to account button as a fallback
    const accountBtn = document.getElementById('accountBtn');
    if (accountBtn) {
        accountBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAccountMenu();
        });
    }
});
