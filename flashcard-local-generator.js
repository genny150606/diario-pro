// GENERATORE FLASHCARD CON GOOGLE GEMINI

// ============================================
// UTILITY FUNCTIONS - Caricamento/Salvataggio
// ============================================

function loadData() {
    try {
        const data = localStorage.getItem('studyjournal_data');
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Errore caricamento dati:', e);
        return {};
    }
}

function saveData(data) {
    try {
        localStorage.setItem('studyjournal_data', JSON.stringify(data));
    } catch (e) {
        console.error('Errore salvataggio dati:', e);
    }
}

function loadFlashcards() {
    const data = loadData();
    return data.flashcards || [];
}

function saveFlashcards(flashcards) {
    const data = loadData();
    data.flashcards = flashcards;
    saveData(data);
}

function loadNotes() {
    const data = loadData();
    return data.notes || [];
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        addFlashcardButtons();
    }, 1000);
});

function addFlashcardButtons() {
    const flashcardsTab = document.getElementById('flashcards');
    if (!flashcardsTab) return;

    const formCard = flashcardsTab.querySelector('.form-card');
    if (!formCard) return;

    if (document.getElementById('generateFlashcardsBtn')) return;

    const generateBtn = document.createElement('button');
    generateBtn.type = 'button';
    generateBtn.className = 'btn btn-secondary';
    generateBtn.style.marginTop = '1rem';
    generateBtn.style.marginBottom = '0.5rem';
    generateBtn.innerHTML = '🤖 Genera Flashcard con Gemini';
    generateBtn.id = 'generateFlashcardsBtn';
    generateBtn.addEventListener('click', generateFlashcardsWithGemini);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-secondary';
    deleteBtn.style.marginTop = '0.5rem';
    deleteBtn.innerHTML = '🗑️ Elimina tutte le Flashcard';
    deleteBtn.id = 'deleteFlashcardsBtn';
    deleteBtn.addEventListener('click', deleteAllFlashcards);

    formCard.appendChild(generateBtn);
    formCard.appendChild(deleteBtn);

    console.log('✅ Pulsanti flashcard aggiunti');
}

// ============================================
// GENERA FLASHCARD
// ============================================

async function generateFlashcardsWithGemini() {
    const notes = loadNotes();

    console.log('Note caricate:', notes.length);

    if (notes.length === 0) {
        alert('❌ Aggiungi prima una nota nella sezione Note!');
        return;
    }

    let options = notes.map((n, i) => `${i + 1}. ${n.title} (${n.subject})`).join('\n');
    const choice = prompt(`Quale nota usare?\n\n${options}`, '1');
    if (!choice) return;

    const idx = parseInt(choice) - 1;
    if (idx < 0 || idx >= notes.length) {
        alert('Numero non valido');
        return;
    }

    const selectedNote = notes[idx];
    const numStr = prompt('Quante flashcard? (1-10)', '5');
    const num = Math.min(10, Math.max(1, parseInt(numStr) || 5));

    const btn = document.getElementById('generateFlashcardsBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Generando...';

    try {
        const response = await fetch('/api/generate-flashcards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notes: selectedNote.content,
                subject: selectedNote.subject,
                numberOfCards: num
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.flashcards || data.flashcards.length === 0) {
            alert('❌ Non riesco a generare flashcard');
            return;
        }

        let flashcards = loadFlashcards();

        let count = 0;
        data.flashcards.forEach(card => {
            if (card.front && card.back) {
                flashcards.push({
                    id: Date.now() + Math.random(),
                    front: card.front,
                    back: card.back,
                    subject: selectedNote.subject,
                    correct: 0,
                    incorrect: 0,
                    difficulty: 'medium'
                });
                count++;
            }
        });

        saveFlashcards(flashcards);
        renderFlashcards(flashcards);
        alert(`✅ ${count} flashcard create!`);

    } catch (error) {
        alert(`❌ Errore: ${error.message}`);
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.textContent = '🤖 Genera Flashcard con Gemini';
    }
}

// ============================================
// ELIMINA FLASHCARD
// ============================================

function deleteAllFlashcards() {
    const flashcards = loadFlashcards();

    console.log('Flashcards trovate:', flashcards.length);

    if (!flashcards || flashcards.length === 0) {
        alert('❌ Non ci sono flashcard da eliminare');
        return;
    }

    if (confirm(`Sei sicuro di voler eliminare TUTTE le ${flashcards.length} flashcard?\n\nQuesta azione non può essere annullata!`)) {
        saveFlashcards([]);
        renderFlashcards([]);
        alert('✅ Tutte le flashcard sono state eliminate.');
    }
}

// ============================================
// RENDER FLASHCARD
// ============================================

function renderFlashcards(cards) {
    const container = document.getElementById('flashcardStudy');
    if (!container) return;

    if (!cards || cards.length === 0) {
        container.innerHTML = '<p class="empty-state">Nessuna flashcard.</p>';
        return;
    }

    container.innerHTML = cards.map((card, idx) => `
        <div class="card" style="margin-bottom: 1rem; cursor: pointer; position: relative;" onclick="flipCard(this)">
            <div style="font-weight: 600; color: var(--primary); margin-bottom: 1rem;">
                ❓ ${card.front}
            </div>
            <div style="
                color: var(--text-secondary);
                opacity: 0;
                transition: opacity 0.3s ease;
                max-height: 0;
                overflow: hidden;
            " class="answer">
                ✅ ${card.back}
            </div>
            <small style="display: block; margin-top: 1rem; color: var(--text-light);">
                Clicca per vedere la risposta
            </small>
            <button style="
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: none;
                border: none;
                color: #ef4444;
                cursor: pointer;
                font-size: 1.2rem;
                padding: 0.5rem;
                transition: transform 0.2s ease;
            " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" onclick="deleteSingleFlashcard(event, ${idx})" title="Elimina questa flashcard">
                🗑️
            </button>
        </div>
    `).join('');
}

function flipCard(el) {
    if (event.target.closest('button')) return;

    const answer = el.querySelector('.answer');
    const small = el.querySelector('small');

    if (answer.style.opacity === '0') {
        answer.style.opacity = '1';
        answer.style.maxHeight = '500px';
        small.textContent = 'Clicca per nascondere la risposta';
    } else {
        answer.style.opacity = '0';
        answer.style.maxHeight = '0';
        small.textContent = 'Clicca per vedere la risposta';
    }
}

function deleteSingleFlashcard(event, index) {
    event.stopPropagation();
    let flashcards = loadFlashcards();

    if (index >= 0 && index < flashcards.length) {
        flashcards.splice(index, 1);
        saveFlashcards(flashcards);
        renderFlashcards(flashcards);
    }
}

// Auto-render flashcards al load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const flashcards = loadFlashcards();
        if (flashcards.length > 0) {
            const container = document.getElementById('flashcardStudy');
            if (container) {
                renderFlashcards(flashcards);
            }
        }
    }, 1500);
});