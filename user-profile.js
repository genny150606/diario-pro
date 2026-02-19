/* ============================================
   USER PROFILE & PERSONALIZATION MANAGER
   Handles user metadata, school type, profile editing, and UI adaptation.
   ============================================ */

const UserProfile = {
    currentUser: null,

    async init() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
            this.currentUser = session.user;
            this.loadFromMetadata(session.user);
            this.setupSettingsListeners();
            this.populateProfileSection(session.user);
        }
    },

    loadFromMetadata(user) {
        if (!user || !user.user_metadata) return;
        const metadata = user.user_metadata;
        this.updateProfileDisplay(metadata);
        const schoolType = metadata.school_type || 'liceo';
        this.applySchoolMode(schoolType);
        this.syncSettingsUI(schoolType);
    },

    updateProfileDisplay(metadata) {
        const displayEl = document.getElementById('userEmailDisplay');
        if (displayEl) {
            let displayName = metadata.username || metadata.first_name || this.currentUser.email;
            if (displayName.length > 15) displayName = displayName.substring(0, 15) + '...';
            displayEl.textContent = displayName;
        }
    },

    // ── PROFILE SECTION ──
    populateProfileSection(user) {
        if (!user) return;
        const metadata = user.user_metadata || {};

        // Username
        const usernameEl = document.getElementById('profileUsername');
        if (usernameEl) usernameEl.textContent = metadata.username || 'Non impostato';

        // Full Name
        const fullNameEl = document.getElementById('profileFullName');
        if (fullNameEl) {
            const first = metadata.first_name || '';
            const last = metadata.last_name || '';
            fullNameEl.textContent = (first + ' ' + last).trim() || user.email;
        }

        // Age Badge
        const ageEl = document.getElementById('profileAge');
        if (ageEl && metadata.age) {
            ageEl.textContent = metadata.age + ' anni';
            ageEl.style.display = 'inline-block';
        } else if (ageEl) {
            ageEl.style.display = 'none';
        }

        // Photo
        this.loadProfilePhoto(metadata.profile_photo);

        // Populate edit fields
        const editUsername = document.getElementById('editUsername');
        if (editUsername) editUsername.value = metadata.username || '';

        const editEmail = document.getElementById('editEmail');
        if (editEmail) editEmail.value = user.email || '';

        const editPhotoUrl = document.getElementById('editPhotoUrl');
        if (editPhotoUrl) editPhotoUrl.value = metadata.profile_photo || '';

        // Fallback initials
        const fallbackEl = document.getElementById('profilePhotoFallback');
        if (fallbackEl) {
            const initials = this.getInitials(metadata);
            fallbackEl.textContent = initials || '?';
        }
    },

    getInitials(metadata) {
        const first = metadata.first_name || '';
        const last = metadata.last_name || '';
        if (first || last) {
            return (first.charAt(0) + last.charAt(0)).toUpperCase();
        }
        if (metadata.username) return metadata.username.charAt(0).toUpperCase();
        return '?';
    },

    loadProfilePhoto(url) {
        const photoEl = document.getElementById('profilePhoto');
        const fallbackEl = document.getElementById('profilePhotoFallback');
        if (!photoEl) return;

        if (url && url.trim()) {
            photoEl.src = url;
            photoEl.onload = () => {
                photoEl.classList.add('loaded');
                if (fallbackEl) fallbackEl.style.display = 'none';
            };
            photoEl.onerror = () => {
                photoEl.classList.remove('loaded');
                if (fallbackEl) fallbackEl.style.display = 'flex';
            };
        } else {
            photoEl.classList.remove('loaded');
            if (fallbackEl) fallbackEl.style.display = 'flex';
        }
    },

    // ── PROFILE UPDATE METHODS ──
    async updateUsername(newUsername) {
        if (!this.currentUser) throw new Error('Non sei loggato.');
        if (!newUsername || newUsername.trim().length < 2) throw new Error('Username troppo corto (min 2 caratteri).');

        const { error } = await supabaseClient.auth.updateUser({
            data: { username: newUsername.trim() }
        });
        if (error) throw error;

        // Update local state
        this.currentUser.user_metadata.username = newUsername.trim();
        this.populateProfileSection(this.currentUser);
        this.updateProfileDisplay(this.currentUser.user_metadata);
        return true;
    },

    async updateEmail(newEmail) {
        if (!this.currentUser) throw new Error('Non sei loggato.');
        if (!newEmail || !newEmail.includes('@')) throw new Error('Email non valida.');

        const { error } = await supabaseClient.auth.updateUser({
            email: newEmail.trim()
        });
        if (error) throw error;
        return true;
    },

    async updateProfilePhoto(photoUrl) {
        if (!this.currentUser) throw new Error('Non sei loggato.');

        const { error } = await supabaseClient.auth.updateUser({
            data: { profile_photo: photoUrl.trim() }
        });
        if (error) throw error;

        this.currentUser.user_metadata.profile_photo = photoUrl.trim();
        this.loadProfilePhoto(photoUrl.trim());
        return true;
    },

    // ── SCHOOL MODE ──
    applySchoolMode(type) {
        const mode = type.toLowerCase() === 'università' ? 'uni' : 'liceo';

        const navGrades = document.getElementById('navGrades');
        const navPresences = document.getElementById('navPresences');
        const gradesLiceo = document.getElementById('grades-view-liceo');
        const gradesUni = document.getElementById('grades-view-uni');
        const presencesLiceo = document.getElementById('presences-view-liceo');
        const examsUni = document.getElementById('exams-view-uni');

        if (mode === 'uni') {
            if (navGrades) navGrades.innerHTML = 'Libretto';
            if (navPresences) navPresences.innerHTML = 'Esami';
            if (gradesLiceo) gradesLiceo.style.display = 'none';
            if (gradesUni) gradesUni.style.display = 'block';
            if (presencesLiceo) presencesLiceo.style.display = 'none';
            if (examsUni) examsUni.style.display = 'block';
            this.updateDashboardLabels('uni');
            if (typeof renderUniGrades === 'function') renderUniGrades();
            if (typeof renderUniExams === 'function') renderUniExams();
        } else {
            if (navGrades) navGrades.innerHTML = 'Voti';
            if (navPresences) navPresences.innerHTML = 'Presenze';
            if (gradesLiceo) gradesLiceo.style.display = 'block';
            if (gradesUni) gradesUni.style.display = 'none';
            if (presencesLiceo) presencesLiceo.style.display = 'block';
            if (examsUni) examsUni.style.display = 'none';
            this.updateDashboardLabels('liceo');
        }

        console.log(`Applied School Mode: ${mode}`);
    },

    updateDashboardLabels(mode) {
        const avgLabel = document.querySelector('#dashboardAverage')?.parentElement.querySelector('.stat-label');
        if (avgLabel) {
            avgLabel.textContent = mode === 'uni' ? 'Media Ponderata' : 'Media Voti';
        }
    },

    syncSettingsUI(schoolType) {
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
            const { error } = await supabaseClient.auth.updateUser({
                data: { school_type: newType }
            });
            if (error) throw error;
            this.applySchoolMode(newType);
            if (typeof UIManager !== 'undefined') {
                await UIManager.alert(`Modalità aggiornata a: ${newType.charAt(0).toUpperCase() + newType.slice(1)}`, 'Impostazioni Aggiornate');
            }
        } catch (err) {
            console.error('Error updating school type:', err);
            if (typeof UIManager !== 'undefined') {
                await UIManager.alert('Errore nel salvataggio delle impostazioni.', 'Errore');
            }
        }
    }
};

// ── Global Profile Edit Functions ──
async function updateProfileField(field) {
    try {
        if (field === 'username') {
            const val = document.getElementById('editUsername').value;
            await UserProfile.updateUsername(val);
            await UIManager.alert('✅ Username aggiornato con successo!', 'Profilo');
        } else if (field === 'email') {
            const val = document.getElementById('editEmail').value;
            await UserProfile.updateEmail(val);
            await UIManager.alert('📧 Email aggiornata! Controlla la tua casella per confermare.', 'Profilo');
        } else if (field === 'photo') {
            const val = document.getElementById('editPhotoUrl').value;
            await UserProfile.updateProfilePhoto(val);
            await UIManager.alert('📷 Foto profilo aggiornata!', 'Profilo');
        }
    } catch (err) {
        await UIManager.alert('❌ ' + err.message, 'Errore');
    }
}

function openProfilePhotoEdit() {
    // Trigger file picker directly when clicking the photo
    const fileInput = document.getElementById('profilePhotoFile');
    if (fileInput) {
        fileInput.click();
    } else {
        const input = document.getElementById('editPhotoUrl');
        if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

async function handleProfilePhotoFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    // Validate file
    if (!file.type.startsWith('image/')) {
        await UIManager.alert('❌ Il file selezionato non è un\'immagine.', 'Errore');
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        await UIManager.alert('❌ L\'immagine deve essere inferiore a 2MB.', 'Errore');
        return;
    }

    try {
        // Convert to base64 Data URL
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        // Save as profile photo
        await UserProfile.updateProfilePhoto(dataUrl);
        await UIManager.alert('📷 Foto profilo aggiornata con successo!', 'Profilo');
    } catch (err) {
        await UIManager.alert('❌ ' + err.message, 'Errore');
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    UserProfile.init();
});
