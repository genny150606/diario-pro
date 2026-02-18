/* ============================================
   USER PROFILE & PERSONALIZATION MANAGER
   Handles user metadata, school type logic, and UI adaptation.
   ============================================ */

const UserProfile = {
    currentUser: null,

    async init() {
        // Wait for AuthManager to be ready (it sets user)
        // We can access AuthManager.user directly or wait for onAuthStateChange in auth.js
        // Ideally, this is called from auth.js or script.js after login

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
            this.currentUser = session.user;
            this.loadFromMetadata(session.user);
            this.setupSettingsListeners();
        }
    },

    loadFromMetadata(user) {
        if (!user || !user.user_metadata) return;

        const metadata = user.user_metadata;

        // 1. Update Profile Display (Header)
        this.updateProfileDisplay(metadata);

        // 2. Apply School Mode
        // Default to 'liceo' if not set
        const schoolType = metadata.school_type || 'liceo';
        this.applySchoolMode(schoolType);

        // 3. Sync Settings UI
        this.syncSettingsUI(schoolType);
    },

    updateProfileDisplay(metadata) {
        const displayEl = document.getElementById('userEmailDisplay');
        if (displayEl) {
            // Prefer username, then First Name, then Email (handled by auth.js default)
            let displayName = metadata.username || metadata.first_name || this.currentUser.email;

            // Truncate if too long
            if (displayName.length > 15) displayName = displayName.substring(0, 15) + '...';

            displayEl.textContent = displayName;
        }
    },

    applySchoolMode(type) {
        // Normalize type
        const mode = type.toLowerCase() === 'università' ? 'uni' : 'liceo';

        // Sidebar Elements
        const navGrades = document.getElementById('navGrades');
        const navPresences = document.getElementById('navPresences');

        if (mode === 'uni') {
            // UNIVERSITY MODE
            if (navGrades) navGrades.innerHTML = 'Libretto'; // Was 'Voti'
            if (navPresences) navPresences.innerHTML = 'Esami'; // Was 'Presenze'

            // Dashboard Cards
            this.updateDashboardLabels('uni');
        } else {
            // HIGH SCHOOL MODE
            if (navGrades) navGrades.innerHTML = 'Voti';
            if (navPresences) navPresences.innerHTML = 'Presenze';

            // Dashboard Cards
            this.updateDashboardLabels('liceo');
        }

        console.log(`Applied School Mode: ${mode}`);
    },

    updateDashboardLabels(mode) {
        // Example: Update "Media Voti" label to "Media Ponderata" for Uni
        const avgLabel = document.querySelector('#dashboardAverage')?.parentElement.querySelector('.stat-label');
        if (avgLabel) {
            avgLabel.textContent = mode === 'uni' ? 'Media Ponderata' : 'Media Voti';
        }

        // Update "Compiti" to "Scadenze/Progetti" maybe? Keeping simple for now.
    },

    syncSettingsUI(schoolType) {
        // Check the correct radio button
        // Value in HTML might be 'liceo' or 'università'
        const radios = document.getElementsByName('school');
        for (const radio of radios) {
            if (radio.value.toLowerCase() === schoolType.toLowerCase()) {
                radio.checked = true;
                break;
            }
        }
    },

    setupSettingsListeners() {
        const radios = document.getElementsByName('school');
        for (const radio of radios) {
            radio.addEventListener('change', (e) => {
                this.handleSchoolTypeChange(e.target.value);
            });
        }
    },

    async handleSchoolTypeChange(newType) {
        if (!this.currentUser) return;

        try {
            // 1. Update Supabase
            const { error } = await supabaseClient.auth.updateUser({
                data: { school_type: newType }
            });

            if (error) throw error;

            // 2. Update Local UI immediately
            this.applySchoolMode(newType);

            // 3. Optional: Show Toast
            alert(`Modalità aggiornata a: ${newType.charAt(0).toUpperCase() + newType.slice(1)}`);

        } catch (err) {
            console.error('Error updating school type:', err);
            alert('Errore nel salvataggio delle impostazioni.');
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure Supabase is ready if needed, 
    // or rely on auth.js to trigger it. 
    // For now, let's call init explicitly.
    UserProfile.init();
});

// Also listen for auth state changes from auth.js if possible,
// or just re-run init when AuthManager updates.
// We can expose a strict update method.
