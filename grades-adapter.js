/* ============================================
   GRADES ADAPTER - ADATTA VOTI AL TIPO SCUOLA
   ============================================ */

const GradesAdapter = {
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                this.updateGradesInterface();
            }, 2000);
        });
    },

    getSchoolType() {
        return localStorage.getItem('studyjournal_school_type') || 'high_school';
    },

    updateGradesInterface() {
        const schoolType = this.getSchoolType();
        const gradesSection = document.getElementById('grades');
        
        if (!gradesSection) return;

        if (schoolType === 'university') {
            this.setupUniversityGrades(gradesSection);
        } else {
            this.setupHighSchoolGrades(gradesSection);
        }
    },

    setupHighSchoolGrades(section) {
        const formCard = section.querySelector('.form-card');
        if (!formCard) return;

        // Aggiorna i label degli input
        const labelGrade = formCard.querySelector('label[for*="grade"]');
        if (labelGrade) {
            labelGrade.innerHTML = '📊 Voto (1-10):';
        }

        // Aggiorna max value degli input
        const inputs = formCard.querySelectorAll('input[type="number"][name*="grade"]');
        inputs.forEach(input => {
            input.max = '10';
            input.min = '1';
            input.placeholder = 'Es: 7';
        });

        console.log('✅ Modalità Liceo attivata (voti 1-10)');
    },

    setupUniversityGrades(section) {
        const formCard = section.querySelector('.form-card');
        if (!formCard) return;

        // Aggiorna i label degli input
        const labelGrade = formCard.querySelector('label[for*="grade"]');
        if (labelGrade) {
            labelGrade.innerHTML = '📊 Voto (18-30):';
        }

        // Crea input per lode
        const gradeInput = formCard.querySelector('input[type="number"][name*="grade"]');
        if (gradeInput && !formCard.querySelector('#lodCheckbox')) {
            const lodeLabel = document.createElement('label');
            lodeLabel.style.cssText = `
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-top: 0.75rem;
                cursor: pointer;
            `;

            lodeLabel.innerHTML = `
                <input 
                    type="checkbox" 
                    id="lodCheckbox" 
                    style="cursor: pointer; accent-color: var(--primary);"
                >
                <span style="font-weight: 500;">Con Lode (110 e Lode)</span>
            `;

            gradeInput.parentElement.appendChild(lodeLabel);
        }

        // Aggiorna max value degli input
        const inputs = formCard.querySelectorAll('input[type="number"][name*="grade"]');
        inputs.forEach(input => {
            input.max = '30';
            input.min = '18';
            input.placeholder = 'Es: 25';
        });

        console.log('✅ Modalità Università attivata (voti 18-30 con Lode)');
    },

    getMaxGrade() {
        const schoolType = this.getSchoolType();
        return schoolType === 'university' ? 30 : 10;
    },

    getMinGrade() {
        const schoolType = this.getSchoolType();
        return schoolType === 'university' ? 18 : 1;
    },

    formatGrade(grade) {
        const schoolType = this.getSchoolType();
        const isLode = document.getElementById('lodCheckbox')?.checked || false;

        if (schoolType === 'university') {
            if (isLode) {
                return `${grade}L`; // 30L per lode
            }
            return grade;
        }
        
        return grade; // Liceo: solo numero
    }
};

// Inizializza
GradesAdapter.init();
