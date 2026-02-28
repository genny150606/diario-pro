/* ============================================
   ONBOARDING SYSTEM - SCUOLA/UNIVERSITÀ
   ============================================ */

const OnboardingSystem = {
    schoolType: null, // 'high_school' o 'university'
    gradeScale: 10, // Default liceo

    init() {
        const savedType = localStorage.getItem('studyjournal_school_type');

        if (!savedType) {
            // Prima volta: mostra modal onboarding
            this.showOnboardingModal();
        } else {
            // Già configurato: carica le impostazioni
            this.schoolType = savedType;
            this.gradeScale = savedType === 'university' ? 30 : 10;
            this.applySettings();
        }
    },

    showOnboardingModal() {
        const modal = document.createElement('div');
        modal.id = 'onboardingModal';
        modal.className = 'onboarding-overlay';

        const content = document.createElement('div');
        content.className = 'onboarding-card';

        content.innerHTML = `
            <h1 class="onboarding-title">📚 Benvenuto in StudyJournal!</h1>
            
            <p class="onboarding-desc">
                Per personalizzare l'esperienza, dimmi che tipo di studente sei:
            </p>

            <div class="onboarding-options">
                <button id="highSchoolBtn" class="onboarding-btn high-school">
                    <span class="btn-icon">🏫</span>
                    <span class="btn-text">
                        <strong>Liceo/Scuola Superiore</strong>
                        <small>Voti da 1 a 10</small>
                    </span>
                </button>
                
                <button id="universityBtn" class="onboarding-btn university">
                    <span class="btn-icon">🎓</span>
                    <span class="btn-text">
                        <strong>Università</strong>
                        <small>Voti da 18 a 30 + Lode</small>
                    </span>
                </button>
            </div>

            <p class="onboarding-footer-text">
                Puoi cambiare questa impostazione in qualsiasi momento nelle Impostazioni
            </p>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('highSchoolBtn').addEventListener('click', () => {
            this.selectSchoolType('high_school');
            modal.remove();
        });

        document.getElementById('universityBtn').addEventListener('click', () => {
            this.selectSchoolType('university');
            modal.remove();
        });
    },

    selectSchoolType(type) {
        this.schoolType = type;
        this.gradeScale = type === 'university' ? 30 : 10;

        localStorage.setItem('studyjournal_school_type', type);
        localStorage.setItem('studyjournal_grade_scale', this.gradeScale);

        // Applica le impostazioni
        this.applySettings();

        // Ricarica la pagina per applicare le modifiche a tutta l'app (es. GradesAdapter)
        // Piccolo timeout per dare feedback visivo se necessario, ma reload immediato è più sicuro
        setTimeout(() => {
            location.reload();
        }, 100);

        console.log(`✅ Tipo scuola impostato: ${type === 'university' ? 'Università' : 'Liceo'}`);
    },

    applySettings() {
        // Aggiorna l'interfaccia in base al tipo di scuola
        if (this.schoolType === 'university') {
            this.setupUniversityMode();
        } else {
            this.setupHighSchoolMode();
        }
    },

    setupHighSchoolMode() {
        // Liceo: voti 1-10
        document.documentElement.style.setProperty('--grade-scale', '10');
        document.documentElement.style.setProperty('--school-type', '"liceo"');
    },

    setupUniversityMode() {
        // Università: voti 18-30 con lode
        document.documentElement.style.setProperty('--grade-scale', '30');
        document.documentElement.style.setProperty('--school-type', '"università"');
    },

    getGradeScale() {
        return this.gradeScale;
    },

    getSchoolType() {
        return this.schoolType;
    },

    resetSettings() {
        localStorage.removeItem('studyjournal_school_type');
        localStorage.removeItem('studyjournal_grade_scale');
        location.reload();
    }
};

// Inizializza al caricamento
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        OnboardingSystem.init();
    }, 500);
});

// Aggiungi opzione nelle impostazioni per cambiare tipo scuola
document.addEventListener('DOMContentLoaded', () => {
    const settingsSection = document.getElementById('settings');
    if (settingsSection) {
        setTimeout(() => {
            const schoolCard = document.createElement('div');
            schoolCard.className = 'card';
            schoolCard.innerHTML = `
                <h3>📚 Tipo di Scuola</h3>
                <p>Personalizza l'app in base al tuo percorso di studio</p>
                
                <div class="setting-row">
                    <h4>Scuola attuale</h4>
                    <p id="currentSchoolType" style="color: var(--primary); font-weight: 600; margin-bottom: 1rem;">
                        ${OnboardingSystem.schoolType === 'university' ? '🏫 Università' : '🎓 Liceo/Scuola Superiore'}
                    </p>
                    
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button id="changeSchoolBtn" class="btn btn-secondary">
                            ⚙️ Cambia tipo di scuola
                        </button>
                        <button id="resetSchoolBtn" class="btn btn-secondary" style="background: #ef4444; color: white;">
                            🔄 Ripristina
                        </button>
                    </div>
                </div>

                <div class="setting-row">
                    <h4>Scala dei voti</h4>
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                        ${OnboardingSystem.schoolType === 'university'
                    ? '📊 Voti da 18 a 30 (con opzione Lode)'
                    : '📊 Voti da 1 a 10'}
                    </p>
                </div>
            `;

            settingsSection.insertBefore(schoolCard, settingsSection.firstChild);

            // Event listeners
            document.getElementById('changeSchoolBtn').addEventListener('click', () => {
                OnboardingSystem.showOnboardingModal();
            });

            document.getElementById('resetSchoolBtn').addEventListener('click', () => {
                if (confirm('Sei sicuro di voler ripristinare le impostazioni originali?')) {
                    OnboardingSystem.resetSettings();
                }
            });
        }, 1000);
    }
});
