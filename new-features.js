/* ============================================
   MANAGERS PER NUOVE FUNZIONALITÀ
   ============================================ */

// NOTES MANAGER
const NotesManager = {
    data: [],

    init(appData) {
        this.data = appData.notes || [];
    },

    addNote(note) {
        const newNote = {
            id: Date.now(),
            title: note.title,
            subject: note.subject,
            content: note.content,
            date: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        this.data.push(newNote);
        return newNote;
    },

    deleteNote(id) {
        this.data = this.data.filter(n => n.id !== id);
    },

    updateNote(id, updates) {
        const note = this.data.find(n => n.id === id);
        if (note) {
            Object.assign(note, updates);
            note.lastModified = new Date().toISOString();
        }
    }
};

// FLASHCARD MANAGER
const FlashcardManager = {
    data: [],

    init(appData) {
        this.data = appData.flashcards || [];
    },

    addCard(card) {
        const newCard = {
            id: Date.now(),
            front: card.front,
            back: card.back,
            subject: card.subject,
            correct: 0,
            incorrect: 0,
            difficulty: 'medium'
        };
        this.data.push(newCard);
        return newCard;
    },

    deleteCard(id) {
        this.data = this.data.filter(c => c.id !== id);
    },

    recordAnswer(id, correct) {
        const card = this.data.find(c => c.id === id);
        if (card) {
            if (correct) {
                card.correct++;
            } else {
                card.incorrect++;
            }
        }
    },

    getAccuracy(id) {
        const card = this.data.find(c => c.id === id);
        if (!card || (card.correct + card.incorrect) === 0) return 0;
        return ((card.correct / (card.correct + card.incorrect)) * 100).toFixed(0);
    }
};

// GOALS MANAGER
const GoalsManager = {
    data: [],

    init(appData) {
        this.data = appData.goals || [];
    },

    addGoal(goal) {
        const newGoal = {
            id: Date.now(),
            title: goal.title,
            category: goal.category,
            deadline: goal.deadline,
            progress: 0,
            completed: false,
            createdAt: new Date().toISOString()
        };
        this.data.push(newGoal);
        return newGoal;
    },

    deleteGoal(id) {
        this.data = this.data.filter(g => g.id !== id);
    },

    updateProgress(id, progress) {
        const goal = this.data.find(g => g.id === id);
        if (goal) {
            goal.progress = Math.min(progress, 100);
            if (goal.progress === 100) {
                goal.completed = true;
            }
        }
    },

    toggleGoal(id) {
        const goal = this.data.find(g => g.id === id);
        if (goal) {
            goal.completed = !goal.completed;
        }
    },

    getActiveGoals() {
        return this.data.filter(g => !g.completed);
    },

    getGoalsDueToday() {
        const today = new Date().toISOString().split('T')[0];
        return this.data.filter(g => g.deadline === today && !g.completed);
    }
};

// RESOURCES MANAGER
const ResourcesManager = {
    data: [],

    init(appData) {
        this.data = appData.resources || [];
    },

    addResource(resource) {
        const newResource = {
            id: Date.now(),
            title: resource.title,
            type: resource.type,
            subject: resource.subject,
            url: resource.url,
            dateAdded: new Date().toISOString(),
            rating: 0
        };
        this.data.push(newResource);
        return newResource;
    },

    deleteResource(id) {
        this.data = this.data.filter(r => r.id !== id);
    },

    getResourcesBySubject(subject) {
        return this.data.filter(r => r.subject.toLowerCase() === subject.toLowerCase());
    },

    getResourcesByType(type) {
        return this.data.filter(r => r.type === type);
    },

    rateResource(id, rating) {
        const resource = this.data.find(r => r.id === id);
        if (resource) {
            resource.rating = Math.min(rating, 5);
        }
    }
};

// WELLNESS MANAGER
const WellnessManager = {
    data: [],

    init(appData) {
        this.data = appData.wellness || [];
    },

    addCheckIn(checkin) {
        const newCheckIn = {
            id: Date.now(),
            date: new Date().toISOString(),
            energy: parseInt(checkin.energy),
            mood: parseInt(checkin.mood),
            focus: parseInt(checkin.focus),
            sleep: parseFloat(checkin.sleep)
        };
        this.data.push(newCheckIn);
        return newCheckIn;
    },

    getThisWeekData() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return this.data.filter(c => new Date(c.date) >= weekAgo);
    },

    getAverageMetrics() {
        if (this.data.length === 0) return { energy: 0, mood: 0, focus: 0, sleep: 0 };
        const sum = this.data.reduce((acc, c) => ({
            energy: acc.energy + c.energy,
            mood: acc.mood + c.mood,
            focus: acc.focus + c.focus,
            sleep: acc.sleep + c.sleep
        }), { energy: 0, mood: 0, focus: 0, sleep: 0 });

        return {
            energy: (sum.energy / this.data.length).toFixed(1),
            mood: (sum.mood / this.data.length).toFixed(1),
            focus: (sum.focus / this.data.length).toFixed(1),
            sleep: (sum.sleep / this.data.length).toFixed(1)
        };
    }
};

// STATS ADVANCED MANAGER
const AdvancedStatsManager = {
    calculateStreak() {
        if (DiaryManager.data.length === 0) return 0;
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        const sortedDates = [...new Set(DiaryManager.data.map(e => e.date))].sort().reverse();

        for (let i = 0; i < sortedDates.length; i++) {
            const entryDate = new Date(sortedDates[i]);
            entryDate.setHours(0, 0, 0, 0);

            if (i === 0 && entryDate.getTime() !== currentDate.getTime()) {
                break;
            }

            const expectedDate = new Date(currentDate);
            expectedDate.setDate(expectedDate.getDate() - i);
            expectedDate.setHours(0, 0, 0, 0);

            if (entryDate.getTime() === expectedDate.getTime()) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    },

    getDailyAverage() {
        if (DiaryManager.data.length === 0) return 0;
        const firstDate = new Date(DiaryManager.data[DiaryManager.data.length - 1].date);
        const lastDate = new Date(DiaryManager.data[0].date);
        const daysDiff = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) || 1;
        return (DiaryManager.getTotalHours() / (daysDiff + 1)).toFixed(1);
    },

    getRecordDay() {
        if (DiaryManager.data.length === 0) return 0;
        const grouped = {};
        DiaryManager.data.forEach(e => {
            grouped[e.date] = (grouped[e.date] || 0) + e.hours;
        });
        return Math.max(...Object.values(grouped), 0).toFixed(1);
    },

    getTotalWeeks() {
        if (DiaryManager.data.length === 0) return 0;
        const dates = new Set(DiaryManager.data.map(e => {
            const d = new Date(e.date);
            const week = Math.floor(d.getDate() / 7);
            return `${d.getFullYear()}-${d.getMonth()}-${week}`;
        }));
        return dates.size;
    },

    getWeeklyHeatmap() {
        const heatmap = Array(7).fill(0);
        DiaryManager.data.forEach(e => {
            const day = new Date(e.date).getDay();
            heatmap[day] += e.hours;
        });
        return heatmap;
    }
};

/* ============================================
   UI EXTENSIONS PER NUOVE SEZIONI
   ============================================ */

// Estensione UIManager per le nuove sezioni
const UIManagerExtensions = {
    renderFocusTimer() {
        document.querySelectorAll('.preset-btn').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                // Implementa logica cambio timer
            });
        });
    },

    renderNotes() {
        const container = document.getElementById('notesList');
        if (NotesManager.data.length === 0) {
            container.innerHTML = '<p class="empty-state">Nessuna nota ancora.</p>';
            return;
        }

        container.innerHTML = NotesManager.data.map(note => `
            <div class="note-item card">
                <div>
                    <h4>${note.title}</h4>
                    <span class="task-subject">${note.subject}</span>
                    <p style="margin-top: 0.5rem;">${note.content.substring(0, 100)}...</p>
                    <small style="color: var(--text-secondary);">${new Date(note.date).toLocaleDateString('it-IT')}</small>
                </div>
                <button class="btn btn-delete btn-small" onclick="NotesManager.deleteNote(${note.id}); UIManagerExtensions.renderNotes();">🗑️</button>
            </div>
        `).join('');
    },

    renderGoals() {
        const container = document.getElementById('goalsList');
        if (GoalsManager.data.length === 0) {
            container.innerHTML = '<p class="empty-state">Nessun obiettivo ancora. Inizia subito!</p>';
            return;
        }

        container.innerHTML = GoalsManager.data.map(goal => `
            <div class="goal-item card">
                <div>
                    <h4>${goal.title}</h4>
                    <span class="task-subject">${goal.category}</span>
                    <div class="progress-bar" style="margin: 0.5rem 0;">
                        <div class="progress-fill" style="width: ${goal.progress}%"></div>
                    </div>
                    <small>${goal.progress}% completato</small>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-direction: column;">
                    <button class="btn btn-delete btn-small" onclick="GoalsManager.deleteGoal(${goal.id}); UIManagerExtensions.renderGoals();">🗑️</button>
                </div>
            </div>
        `).join('');
    },

    renderStats() {
        document.getElementById('currentStreak').textContent = AdvancedStatsManager.calculateStreak();
        document.getElementById('dailyAverage').textContent = AdvancedStatsManager.getDailyAverage() + 'h';
        document.getElementById('recordDay').textContent = AdvancedStatsManager.getRecordDay() + 'h';
        document.getElementById('totalWeeks').textContent = AdvancedStatsManager.getTotalWeeks();

        this.renderWeeklyHeatmap();
    },

    renderWeeklyHeatmap() {
        const heatmap = AdvancedStatsManager.getWeeklyHeatmap();
        const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        const maxHours = Math.max(...heatmap, 1);

        const container = document.getElementById('weeklyHeatmap');
        container.innerHTML = heatmap.map((hours, index) => `
            <div class="heatmap-day" title="${days[index]}: ${hours}h" style="
                background-color: rgba(99, 102, 241, ${hours / maxHours});
                padding: 1rem;
                border-radius: 8px;
                text-align: center;
                font-weight: 600;
            ">
                ${hours.toFixed(1)}h<br><small>${days[index]}</small>
            </div>
        `).join('');
    },

    renderResources() {
        const container = document.getElementById('resourcesList');
        if (ResourcesManager.data.length === 0) {
            container.innerHTML = '<p class="empty-state">Nessuna risorsa ancora.</p>';
            return;
        }

        container.innerHTML = ResourcesManager.data.map(res => `
            <div class="resource-item card">
                <div>
                    <a href="${res.url}" target="_blank" style="color: var(--primary); text-decoration: none;">
                        <h4>${res.title}</h4>
                    </a>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                        <span class="task-subject">${res.type}</span>
                        <span class="task-subject">${res.subject}</span>
                    </div>
                </div>
                <button class="btn btn-delete btn-small" onclick="ResourcesManager.deleteResource(${res.id}); UIManagerExtensions.renderResources();">🗑️</button>
            </div>
        `).join('');
    }
};

// Aggiungi event listeners per le nuove funzionalità
document.addEventListener('DOMContentLoaded', () => {
    // Note Form
    const noteForm = document.getElementById('noteForm');
    if (noteForm) {
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            NotesManager.addNote({
                title: document.getElementById('noteTitle').value,
                subject: document.getElementById('noteSubject').value,
                content: document.getElementById('noteContent').value
            });
            noteForm.reset();
            UIManagerExtensions.renderNotes();
        });
    }

    // Flashcard Form
    const flashcardForm = document.getElementById('flashcardForm');
    if (flashcardForm) {
        flashcardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            FlashcardManager.addCard({
                front: document.getElementById('cardFront').value,
                back: document.getElementById('cardBack').value,
                subject: document.getElementById('cardSubject').value
            });
            flashcardForm.reset();
        });
    }

    // Goal Form
    const goalForm = document.getElementById('goalForm');
    if (goalForm) {
        goalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            GoalsManager.addGoal({
                title: document.getElementById('goalTitle').value,
                deadline: document.getElementById('goalDeadline').value,
                category: document.getElementById('goalCategory').value
            });
            goalForm.reset();
            UIManagerExtensions.renderGoals();
        });
    }

    // Resource Form
    const resourceForm = document.getElementById('resourceForm');
    if (resourceForm) {
        resourceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            ResourcesManager.addResource({
                title: document.getElementById('resourceTitle').value,
                type: document.getElementById('resourceType').value,
                subject: document.getElementById('resourceSubject').value,
                url: document.getElementById('resourceUrl').value
            });
            resourceForm.reset();
            UIManagerExtensions.renderResources();
        });
    }

    // Wellness Form
    const wellnessForm = document.getElementById('wellnessForm');
    if (wellnessForm) {
        document.getElementById('energyLevel').addEventListener('input', (e) => {
            document.getElementById('energyValue').textContent = e.target.value;
        });
        document.getElementById('moodLevel').addEventListener('input', (e) => {
            document.getElementById('moodValue').textContent = e.target.value;
        });
        document.getElementById('focusLevel').addEventListener('input', (e) => {
            document.getElementById('focusValue').textContent = e.target.value;
        });

        wellnessForm.addEventListener('submit', (e) => {
            e.preventDefault();
            WellnessManager.addCheckIn({
                energy: document.getElementById('energyLevel').value,
                mood: document.getElementById('moodLevel').value,
                focus: document.getElementById('focusLevel').value,
                sleep: document.getElementById('sleepHours').value
            });
            wellnessForm.reset();
        });
    }

    // Tab system
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

            e.target.classList.add('active');
            const tabName = e.target.dataset.tab;
            document.getElementById(tabName).classList.remove('hidden');
        });
    });

    // Share/Export Data
    const shareDataBtn = document.getElementById('shareDataBtn');
    if (shareDataBtn) {
        shareDataBtn.addEventListener('click', () => {
            const appData = StorageManager.load();
            const dataStr = JSON.stringify(appData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `studyjournal-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        });
    }

    // Import Data
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    StorageManager.save(data);
                    alert('✅ Dati importati con successo!');
                    location.reload();
                } catch (error) {
                    alert('❌ Errore nell\'importazione del file');
                }
            };
            reader.readAsText(file);
        });
    }
});

// Aggiorna storage quando vengono aggiunti dati nuovi
function saveAllData() {
    const appData = StorageManager.load();
    appData.notes = NotesManager.data;
    appData.flashcards = FlashcardManager.data;
    appData.goals = GoalsManager.data;
    appData.resources = ResourcesManager.data;
    appData.wellness = WellnessManager.data;
    StorageManager.save(appData);
}

// Auto-save ogni 10 secondi
setInterval(saveAllData, 10000);