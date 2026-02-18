/* ============================================
   GEMINI FEATURES - TUTTE LE INTEGRAZIONI
   ============================================ */

const GeminiFeatures = {
    apiUrl: '', // Relative path because backend is on same domain in Vercel

    // ============================================
    // 1️⃣ GENERATORE QUIZ INTELLIGENTE
    // ============================================
    async generateQuiz(subject, topic, difficulty = 'mixed') {
        try {
            const response = await fetch(`${this.apiUrl}/api/generate-flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: `Genera un quiz su: ${topic}\nMateria: ${subject}\nDifficoltà: ${difficulty}`,
                    subject: subject,
                    numberOfCards: 10
                })
            });
            const data = await response.json();
            return data.flashcards;
        } catch (error) {
            console.error('Errore quiz:', error);
            return null;
        }
    },

    // ============================================
    // 2️⃣ AI TUTOR - CHAT INTELLIGENTE
    // ============================================
    async askTutor(question, subject, context = '') {
        try {
            const response = await fetch(`${this.apiUrl}/api/generate-flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: `Domanda: ${question}\nContesto: ${context}`,
                    subject: subject,
                    numberOfCards: 1
                })
            });
            const data = await response.json();
            return data.flashcards?.[0]?.back || 'Errore nella risposta';
        } catch (error) {
            console.error('Errore tutor:', error);
            return null;
        }
    },

    // ============================================
    // 3️⃣ GENERATORE LEZIONI COMPLETE
    // ============================================
    async generateLesson(subject, topic) {
        try {
            const response = await fetch(`${this.apiUrl}/api/generate-flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: `Crea una lezione completa su: ${topic}
                    
                    Struttura richiesta:
                    1. INTRODUZIONE - Cos'è ${topic}?
                    2. CONCETTI CHIAVE - Definizioni importanti
                    3. SPIEGAZIONE DETTAGLIATA - Come funziona
                    4. ESEMPI PRATICI - Casi reali
                    5. RIASSUNTO - Punti essenziali
                    6. QUIZ - 10 domande di verifica`,
                    subject: subject,
                    numberOfCards: 6
                })
            });
            const data = await response.json();
            return data.flashcards;
        } catch (error) {
            console.error('Errore lezione:', error);
            return null;
        }
    },

    // ============================================
    // 4️⃣ PIANO DI STUDIO INTELLIGENTE
    // ============================================
    async generateStudyPlan(subjects, hoursPerDay, deadline, weakPoints = '') {
        try {
            const daysToDeadline = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));

            const response = await fetch(`${this.apiUrl}/api/generate-flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: `Crea un piano di studio settimanale:
                    
                    MATERIE: ${subjects}
                    ORE AL GIORNO: ${hoursPerDay}
                    GIORNI DISPONIBILI: ${daysToDeadline}
                    PUNTI DEBOLI: ${weakPoints}
                    
                    Formato: Per ogni giorno, specifica:
                    - Materia
                    - Argomenti da studiare
                    - Ore dedicate
                    - Tipo di studio (teoria/esercizi/ripasso)`,
                    subject: 'Piano di Studio',
                    numberOfCards: 7
                })
            });
            const data = await response.json();
            return data.flashcards;
        } catch (error) {
            console.error('Errore piano studio:', error);
            return null;
        }
    },

    // ============================================
    // 5️⃣ ANALIZZATORE PROGRESSIONE
    // ============================================
    async analyzeProgress(grades, studyHours, topics) {
        try {
            const response = await fetch(`${this.apiUrl}/api/generate-flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: `Analizza la progressione dello studente:
                    
                    VOTI RECENTI: ${JSON.stringify(grades)}
                    ORE DI STUDIO: ${studyHours}
                    ARGOMENTI STUDIATI: ${topics}
                    
                    Analizza:
                    1. Trend voti (migliorando? peggiorando?)
                    2. Velocità di apprendimento
                    3. Predizione voto finale
                    4. Punti di forza
                    5. Punti deboli
                    6. Suggerimenti di studio personalizzati`,
                    subject: 'Analisi Progressione',
                    numberOfCards: 6
                })
            });
            const data = await response.json();
            return data.flashcards;
        } catch (error) {
            console.error('Errore analisi:', error);
            return null;
        }
    },

    // ============================================
    // 7️⃣ SFIDE DI STUDIO CON AMICI
    // ============================================
    async generateChallenge(subject, topic, difficulty = 'medium') {
        try {
            const response = await fetch(`${this.apiUrl}/api/generate-flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: `Genera una sfida di studio:
                    
                    MATERIA: ${subject}
                    ARGOMENTO: ${topic}
                    DIFFICOLTÀ: ${difficulty}
                    
                    Crea 5 domande per una battaglia di quiz:
                    - Domande specifiche
                    - Risposte uniche
                    - Ordine casuale`,
                    subject: subject,
                    numberOfCards: 5
                })
            });
            const data = await response.json();
            return data.flashcards;
        } catch (error) {
            console.error('Errore sfida:', error);
            return null;
        }
    }
};

// ============================================
// UI COMPONENTS - AGGIUNGI AI BOTTONI
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        addGeminiFeatures();
    }, 2000);
});

function addGeminiFeatures() {
    // 1. Quiz Generator (Sezione Flashcards)
    const flashcardsSection = document.getElementById('flashcards');
    if (flashcardsSection) {
        const quizBtn = document.createElement('button');
        quizBtn.className = 'btn btn-primary';
        quizBtn.style.marginTop = '1rem';
        quizBtn.innerHTML = '🧠 Crea Quiz con Gemini';
        quizBtn.addEventListener('click', openQuizGenerator);
        flashcardsSection.querySelector('.form-card')?.appendChild(quizBtn);
    }

    // 2. AI Tutor (Sezione Risorse)
    const resourcesSection = document.getElementById('resources');
    if (resourcesSection) {
        const tutorBtn = document.createElement('button');
        tutorBtn.className = 'btn btn-primary';
        tutorBtn.style.marginTop = '1rem';
        tutorBtn.innerHTML = '💬 Chiedi all\'AI Tutor';
        tutorBtn.addEventListener('click', openAITutor);
        resourcesSection.querySelector('.form-card')?.appendChild(tutorBtn);
    }

    // 3. Lesson Generator (Sezione Note)
    const notesSection = document.getElementById('notes');
    if (notesSection) {
        const lessonBtn = document.createElement('button');
        lessonBtn.className = 'btn btn-primary';
        lessonBtn.style.marginTop = '1rem';
        lessonBtn.innerHTML = '📖 Genera Lezione Completa';
        lessonBtn.addEventListener('click', openLessonGenerator);
        notesSection.querySelector('.form-card')?.appendChild(lessonBtn);
    }

    // 4. Study Plan (Sezione Obiettivi)
    const goalsSection = document.getElementById('goals');
    if (goalsSection) {
        const planBtn = document.createElement('button');
        planBtn.className = 'btn btn-primary';
        planBtn.style.marginTop = '1rem';
        planBtn.innerHTML = '📅 Piano di Studio Settimanale';
        planBtn.addEventListener('click', openStudyPlanGenerator);
        goalsSection.querySelector('.form-card')?.appendChild(planBtn);
    }

    // 5. Progress Analyzer (Dashboard)
    const dashboardSection = document.getElementById('dashboard');
    if (dashboardSection) {
        const analyzeBtn = document.createElement('button');
        analyzeBtn.className = 'btn btn-primary';
        analyzeBtn.style.marginTop = '1rem';
        analyzeBtn.innerHTML = '🧬 Analizza Progressione';
        analyzeBtn.addEventListener('click', openProgressAnalyzer);
        dashboardSection.querySelector('.form-card')?.appendChild(analyzeBtn);
    }

    // 7. Challenge Generator (Sezione Flashcards)
    const flashcardsSection2 = document.getElementById('flashcards');
    if (flashcardsSection2) {
        const challengeBtn = document.createElement('button');
        challengeBtn.className = 'btn btn-primary';
        challengeBtn.style.marginTop = '0.5rem';
        challengeBtn.innerHTML = '🏆 Sfida di Studio';
        challengeBtn.addEventListener('click', openChallengeGenerator);
        flashcardsSection2.querySelector('.form-card')?.appendChild(challengeBtn);
    }
}

// ============================================
// MODAL HANDLERS
// ============================================

async function openQuizGenerator() {
    const subject = prompt('Materia:', '');
    if (!subject) return;
    const topic = prompt('Argomento:', '');
    if (!topic) return;

    const quizzes = await GeminiFeatures.generateQuiz(subject, topic);
    if (quizzes) showQuizModal(quizzes);
}

async function openAITutor() {
    const subject = prompt('Materia:', '');
    if (!subject) return;
    const question = prompt('Domanda:', '');
    if (!question) return;

    const answer = await GeminiFeatures.askTutor(question, subject);
    if (answer) {
        alert(`🤖 AI Tutor:\n\n${answer}`);
    }
}

async function openLessonGenerator() {
    const subject = prompt('Materia:', '');
    if (!subject) return;
    const topic = prompt('Argomento:', '');
    if (!topic) return;

    const lesson = await GeminiFeatures.generateLesson(subject, topic);
    if (lesson) showLessonModal(lesson);
}

async function openStudyPlanGenerator() {
    const subjects = prompt('Materie (separate da virgola):', '');
    if (!subjects) return;
    const hours = prompt('Ore di studio al giorno:', '2');
    const deadline = prompt('Data esame (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);

    const plan = await GeminiFeatures.generateStudyPlan(subjects, hours, deadline);
    if (plan) showStudyPlanModal(plan);
}

async function openProgressAnalyzer() {
    const gradesStr = prompt('Voti recenti (separate da virgola):', '7,7.5,8');
    const hours = prompt('Ore di studio settimanali:', '10');
    const topics = prompt('Argomenti studiati:', '');

    const grades = gradesStr.split(',').map(Number);
    const analysis = await GeminiFeatures.analyzeProgress(grades, hours, topics);
    if (analysis) showAnalysisModal(analysis);
}

async function openChallengeGenerator() {
    const subject = prompt('Materia:', '');
    if (!subject) return;
    const topic = prompt('Argomento:', '');
    if (!topic) return;

    const challenge = await GeminiFeatures.generateChallenge(subject, topic);
    if (challenge) showChallengeModal(challenge);
}

// ============================================
// MODAL DISPLAYS
// ============================================

function showQuizModal(quizzes) {
    const modal = createModal(`🧠 Quiz - ${quizzes.length} domande`);
    let html = '<div style="max-height: 500px; overflow-y: auto;">';
    quizzes.forEach((q, i) => {
        html += `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px;">
                <strong style="color: var(--primary);">Domanda ${i + 1}:</strong> ${q.front}
                <div style="margin-top: 0.5rem; color: var(--text-secondary);">
                    <strong>Risposta:</strong> ${q.back}
                </div>
            </div>
        `;
    });
    html += '</div>';
    modal.querySelector('.modal-content').innerHTML = html;
    document.body.appendChild(modal);
}

function showLessonModal(lesson) {
    const modal = createModal('📖 Lezione Generata');
    let html = '<div style="max-height: 600px; overflow-y: auto;">';
    lesson.forEach((part, i) => {
        html += `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px;">
                <h3 style="color: var(--primary); margin-top: 0;">${part.front}</h3>
                <p>${part.back}</p>
            </div>
        `;
    });
    html += '</div>';
    modal.querySelector('.modal-content').innerHTML = html;
    document.body.appendChild(modal);
}

function showStudyPlanModal(plan) {
    const modal = createModal('📅 Piano di Studio');
    let html = '<div style="max-height: 600px; overflow-y: auto;">';
    plan.forEach((day, i) => {
        html += `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px; border-left: 4px solid var(--primary);">
                <h3 style="margin: 0 0 0.5rem 0; color: var(--primary);">${day.front}</h3>
                <p style="margin: 0;">${day.back}</p>
            </div>
        `;
    });
    html += '</div>';
    modal.querySelector('.modal-content').innerHTML = html;
    document.body.appendChild(modal);
}

function showAnalysisModal(analysis) {
    const modal = createModal('🧬 Analisi Progressione');
    let html = '<div style="max-height: 600px; overflow-y: auto;">';
    analysis.forEach((item, i) => {
        html += `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px;">
                <h3 style="color: var(--secondary); margin: 0 0 0.5rem 0;">${item.front}</h3>
                <p style="margin: 0; color: var(--text-secondary);">${item.back}</p>
            </div>
        `;
    });
    html += '</div>';
    modal.querySelector('.modal-content').innerHTML = html;
    document.body.appendChild(modal);
}

function showChallengeModal(challenge) {
    const modal = createModal('🏆 Sfida di Studio');
    let html = '<div style="max-height: 500px; overflow-y: auto;">';
    challenge.forEach((q, i) => {
        html += `
            <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--bg-tertiary); border-radius: 6px; border-left: 3px solid var(--primary);">
                <strong>Q${i + 1}:</strong> ${q.front}
            </div>
        `;
    });
    html += '</div>';
    modal.querySelector('.modal-content').innerHTML = html;
    document.body.appendChild(modal);
}

function createModal(title) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--bg-secondary);
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 10001;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        flex-shrink: 0;
    `;

    const titleEl = document.createElement('h2');
    titleEl.style.cssText = 'margin: 0; color: var(--primary); font-size: 1.5rem;';
    titleEl.textContent = title;

    const closeBtnHeader = document.createElement('button');
    closeBtnHeader.innerHTML = '&times;';
    closeBtnHeader.style.cssText = `
        background: none;
        border: none;
        font-size: 1.8rem;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0 0.5rem;
        line-height: 1;
        transition: color 0.2s;
    `;
    closeBtnHeader.onmouseover = () => closeBtnHeader.style.color = 'var(--primary)';
    closeBtnHeader.onmouseout = () => closeBtnHeader.style.color = 'var(--text-secondary)';

    header.appendChild(titleEl);
    header.appendChild(closeBtnHeader);

    // Content Scrollable area
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = `
        overflow-y: auto;
        flex-grow: 1;
        padding-right: 0.5rem;
        margin-bottom: 1rem;
    `;

    // Footer with Close Button
    const footer = document.createElement('div');
    footer.style.flexShrink = '0';
    footer.innerHTML = `
        <button class="close-modal-btn" style="
            width: 100%;
            padding: 0.8rem;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 1rem;
        ">Chiudi</button>
    `;

    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);

    // Handle close
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
    `;

    const close = () => {
        overlay.remove();
        modal.remove();
    };

    footer.querySelector('button').onclick = close;
    closeBtnHeader.onclick = close;
    overlay.onclick = close;

    document.body.appendChild(overlay);
    return modal;
}
