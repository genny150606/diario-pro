// ============================================
// STUDYJOURNAL PRO - JAVASCRIPT
// Architettura Modulare con ES6
// ============================================

/* ============================================
   STORAGE MANAGER - Gestione LocalStorage
   ============================================ */

const StorageManager = {
    defaultData: {
        diaryEntries: [],
        tasks: [],
        grades: [],
        pomodoroSessions: [],
        stats: {
            totalHours: 0,
            totalSessions: 0,
            currentLevel: 1,
        }
    },

    load() {
        try {
            const data = localStorage.getItem('studyjournal_data');
            return data ? JSON.parse(data) : this.defaultData;
        } catch {
            return this.defaultData;
        }
    },

    save(data) {
        try {
            localStorage.setItem('studyjournal_data', JSON.stringify(data));
        } catch {
            console.error('Errore salvataggio dati');
        }
    },

    reset() {
        if (confirm('Sei sicuro? Perderai tutti i dati.')) {
            localStorage.removeItem('studyjournal_data');
            location.reload();
        }
    }
};

/* ============================================
   DIARY MANAGER
   ============================================ */

const DiaryManager = {
    data: [],

    init(appData) {
        this.data = appData.diaryEntries;
    },

    addEntry(entry) {
        const newEntry = {
            id: Date.now(),
            date: entry.date,
            subject: entry.subject,
            hours: parseFloat(entry.hours),
            comprehension: parseInt(entry.comprehension),
            stress: parseInt(entry.stress),
            notes: entry.notes
        };
        this.data.push(newEntry);
        this.sortByDate();
        return newEntry;
    },

    deleteEntry(id) {
        this.data = this.data.filter(e => e.id !== id);
    },

    sortByDate() {
        this.data.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    getEntriesBySubject(subject) {
        return this.data.filter(e => e.subject.toLowerCase() === subject.toLowerCase());
    },

    getTotalHours() {
        return this.data.reduce((sum, e) => sum + e.hours, 0);
    },

    getThisWeekHours() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return this.data
            .filter(e => new Date(e.date) >= weekAgo)
            .reduce((sum, e) => sum + e.hours, 0);
    },

    getAverageComprehension() {
        if (this.data.length === 0) return 0;
        return (this.data.reduce((sum, e) => sum + e.comprehension, 0) / this.data.length).toFixed(1);
    },

    getAverageStress() {
        if (this.data.length === 0) return 0;
        return (this.data.reduce((sum, e) => sum + e.stress, 0) / this.data.length).toFixed(1);
    }
};

/* ============================================
   TASK MANAGER
   ============================================ */

const TaskManager = {
    data: [],

    init(appData) {
        this.data = appData.tasks;
    },

    addTask(task) {
        const newTask = {
            id: Date.now(),
            subject: task.subject,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
            completed: false
        };
        this.data.push(newTask);
        this.sortByDueDate();
        return newTask;
    },

    deleteTask(id) {
        this.data = this.data.filter(t => t.id !== id);
    },

    toggleTask(id) {
        const task = this.data.find(t => t.id === id);
        if (task) task.completed = !task.completed;
    },

    sortByDueDate() {
        this.data.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    },

    getUrgentTasks() {
        const today = new Date();
        const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
        return this.data.filter(t => {
            const due = new Date(t.dueDate);
            return !t.completed && due <= threeDaysLater && due >= today;
        });
    },

    getActiveTasks() {
        return this.data.filter(t => !t.completed);
    },

    getCompletedTasks() {
        return this.data.filter(t => t.completed);
    }
};

/* ============================================
   GRADE MANAGER
   ============================================ */

const GradeManager = {
    data: [],

    init(appData) {
        this.data = appData.grades;
    },

    addGrade(grade) {
        const newGrade = {
            id: Date.now(),
            subject: grade.subject,
            value: parseFloat(grade.value),
            weight: parseInt(grade.weight),
            date: grade.date
        };
        this.data.push(newGrade);
        this.sortByDate();
        return newGrade;
    },

    deleteGrade(id) {
        this.data = this.data.filter(g => g.id !== id);
    },

    sortByDate() {
        this.data.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    // FEATURE WOW: Calcolo Media Ponderata
    getWeightedAverage() {
        if (this.data.length === 0) return 0;
        const totalWeight = this.data.reduce((sum, g) => sum + g.weight, 0);
        if (totalWeight === 0) return 0;
        const weightedSum = this.data.reduce((sum, g) => sum + (g.value * g.weight), 0);
        return (weightedSum / totalWeight).toFixed(2);
    },

    getAverageBySubject(subject) {
        const grades = this.data.filter(g => g.subject.toLowerCase() === subject.toLowerCase());
        if (grades.length === 0) return 0;
        return (grades.reduce((sum, g) => sum + g.value, 0) / grades.length).toFixed(2);
    },

    getSubjects() {
        return [...new Set(this.data.map(g => g.subject))];
    },

    getGradeTrend() {
        if (this.data.length < 2) return 0;
        const recent = this.data.slice(0, Math.ceil(this.data.length / 2));
        const older = this.data.slice(Math.ceil(this.data.length / 2));
        const recentAvg = recent.reduce((sum, g) => sum + g.value, 0) / recent.length;
        const olderAvg = older.reduce((sum, g) => sum + g.value, 0) / older.length;
        return (recentAvg - olderAvg).toFixed(2);
    },

    // FEATURE WOW: Simulatore Futuro Media
    simulateGrade(newGrade, weight = 2) {
        const currentWeighted = this.getWeightedAverage();
        const currentTotalWeight = this.data.reduce((sum, g) => sum + g.weight, 0);
        const newTotal = (parseFloat(currentWeighted) * currentTotalWeight + parseFloat(newGrade) * weight) / (currentTotalWeight + weight);
        return newTotal.toFixed(2);
    }
};

/* ============================================
   POMODORO MANAGER
   ============================================ */

const PomodoroManager = {
    data: [],
    timerInterval: null,
    timeLeft: 25 * 60,
    isRunning: false,
    mode: 'study', // 'study', 'shortBreak', 'longBreak'
    sessionsCompleted: 0,

    init(appData) {
        this.data = appData.pomodoroSessions;
        this.sessionsCompleted = this.data.length;
        this.loadSettings();
    },

    loadSettings() {
        this.studyDuration = parseInt(localStorage.getItem('studyDuration') || 25);
        this.shortBreakDuration = parseInt(localStorage.getItem('shortBreakDuration') || 5);
        this.longBreakDuration = parseInt(localStorage.getItem('longBreakDuration') || 15);
        this.timeLeft = this.studyDuration * 60;
    },

    saveSettings(study, short, long) {
        this.studyDuration = study;
        this.shortBreakDuration = short;
        this.longBreakDuration = long;
        localStorage.setItem('studyDuration', study);
        localStorage.setItem('shortBreakDuration', short);
        localStorage.setItem('longBreakDuration', long);
    },

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.timerInterval = setInterval(() => this.tick(), 1000);
    },

    pause() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
    },

    reset() {
        this.pause();
        this.mode = 'study';
        this.timeLeft = this.studyDuration * 60;
        UIManager.updateTimer();
    },

    tick() {
        this.timeLeft--;
        UIManager.updateTimer();

        if (this.timeLeft <= 0) {
            this.completePhase();
        }
    },

    completePhase() {
        if (this.mode === 'study') {
            this.sessionsCompleted++;
            const hours = this.studyDuration / 60;
            const session = {
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                hours: hours,
                timestamp: new Date()
            };
            this.data.push(session);

            // Aggiorna ore studio totali
            const appData = StorageManager.load();
            appData.stats.totalHours = DiaryManager.getTotalHours();
            StorageManager.save(appData);

            // Decidi pausa
            const isLongBreak = this.sessionsCompleted % 4 === 0;
            this.mode = isLongBreak ? 'longBreak' : 'shortBreak';
            this.timeLeft = (isLongBreak ? this.longBreakDuration : this.shortBreakDuration) * 60;
        } else {
            this.mode = 'study';
            this.timeLeft = this.studyDuration * 60;
        }

        this.isRunning = false;
        UIManager.updateTimer();
        this.notifyCompletion();
    },

    notifyCompletion() {
        if (this.mode === 'study') {
            alert(`Pausa completata! Pronti per un'altra sessione?`);
        } else {
            alert(`Sessione di studio completata! Hai completato ${this.sessionsCompleted} sessioni.`);
        }
    },

    getTotalHours() {
        return this.data.reduce((sum, s) => sum + s.hours, 0);
    },

    getThisWeekHours() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return this.data
            .filter(s => new Date(s.date) >= weekAgo)
            .reduce((sum, s) => sum + s.hours, 0);
    }
};

/* ============================================
   GAMIFICATION MANAGER - FEATURE WOW 3
   ============================================ */

const GamificationManager = {
    levelThresholds: [0, 5, 20, 50, 100, 200],

    getCurrentLevel() {
        const totalHours = DiaryManager.getTotalHours() + PomodoroManager.getTotalHours();
        for (let i = this.levelThresholds.length - 1; i >= 0; i--) {
            if (totalHours >= this.levelThresholds[i]) {
                return i;
            }
        }
        return 1;
    },

    getProgressToNextLevel() {
        const totalHours = DiaryManager.getTotalHours() + PomodoroManager.getTotalHours();
        const currentLevel = this.getCurrentLevel();
        const currentThreshold = this.levelThresholds[currentLevel];
        const nextThreshold = this.levelThresholds[currentLevel + 1];
        const progress = ((totalHours - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
        return Math.min(Math.max(progress, 0), 100);
    },

    getLevelNames() {
        return ['Principiante', 'Studioso', 'Impegnato', 'Dedito', 'Maestro', 'Leggenda'];
    }
};

/* ============================================
   INSIGHTS MANAGER - FEATURE WOW 1
   ============================================ */

const InsightsManager = {
    generateInsights() {
        const insights = [];

        // Insight 1: Correlazione Stress e Comprensione
        if (DiaryManager.data.length >= 3) {
            const avgStress = parseFloat(DiaryManager.getAverageStress());
            const avgComprehension = parseFloat(DiaryManager.getAverageComprehension());

            if (avgStress < 6 && avgComprehension > 6) {
                insights.push({
                    emoji: '✨',
                    text: 'Studi meglio quando il tuo stress è sotto 6. Mantieni la calma!'
                });
            } else if (avgStress > 7) {
                insights.push({
                    emoji: '🧘',
                    text: 'Il tuo stress è alto. Prova a fare pause più frequenti e respira profondamente.'
                });
            }
        }

        // Insight 2: Ore e Voti
        if (GradeManager.data.length >= 2 && DiaryManager.data.length >= 2) {
            const avgHours = DiaryManager.getTotalHours() / DiaryManager.data.length;
            const avgGrade = parseFloat(GradeManager.getWeightedAverage());

            if (avgHours >= 2 && avgGrade >= 7) {
                insights.push({
                    emoji: '🚀',
                    text: `Studia più di ${avgHours.toFixed(1)} ore per materia per mantenere una media di ${avgGrade}.`
                });
            } else if (avgGrade < 7 && avgHours < 1.5) {
                insights.push({
                    emoji: '⏱️',
                    text: 'Aumenta le ore di studio per migliorare i tuoi voti. Mira a 2+ ore per materia.'
                });
            }
        }

        // Insight 3: Momentum
        if (DiaryManager.data.length >= 1) {
            const recentEntries = DiaryManager.data.slice(0, 5);
            const recentHours = recentEntries.reduce((sum, e) => sum + e.hours, 0);
            if (recentHours > 10) {
                insights.push({
                    emoji: '🔥',
                    text: 'Stai mantenendo uno slancio incredibile! Continua così!'
                });
            }
        }

        // Insight 4: Equilibrio Materie
        const subjects = new Set(DiaryManager.data.map(e => e.subject));
        if (subjects.size >= 3) {
            insights.push({
                emoji: '⚖️',
                text: `Studi ${subjects.size} materie diverse. Assicurati di bilanciare il tempo tra loro.`
            });
        }

        // Insight 5: Progresso settimanale
        const weekHours = DiaryManager.getThisWeekHours();
        if (weekHours > 0) {
            insights.push({
                emoji: '📈',
                text: `Questa settimana hai studiato ${weekHours.toFixed(1)} ore. Continua il progresso!`
            });
        }

        return insights;
    }
};

/* ============================================
   EXAM PLANNER - FEATURE WOW 2
   ============================================ */

const ExamPlanner = {
    generatePlan(examName, daysAvailable, topics) {
        const topicsList = topics.split(',').map(t => t.trim()).filter(t => t);
        const daysPerTopic = Math.floor(daysAvailable / topicsList.length);
        const plan = [];

        topicsList.forEach((topic, index) => {
            const startDay = index * daysPerTopic + 1;
            const endDay = (index + 1) * daysPerTopic;
            const recommendedHours = daysPerTopic * 2;

            plan.push({
                topic,
                startDay,
                endDay,
                recommendedHours,
                description: `Dedica ${recommendedHours} ore a ${topic} da giorno ${startDay} a giorno ${endDay}`
            });
        });

        return {
            examName,
            totalDays: daysAvailable,
            generatedAt: new Date().toLocaleDateString('it-IT'),
            plan
        };
    }
};

/* ============================================
   UI MANAGER
   ============================================ */

const UIManager = {
    currentSection: 'dashboard',
    gradeChart: null,
    correlationChart: null,

    init() {
        this.setupEventListeners();
        this.showSection('dashboard');
        this.renderDashboard();
    },

    initCustomDatePickers() {
        const dateInputs = document.querySelectorAll('input[type="date"]');

        dateInputs.forEach(input => {
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-date-wrapper';
            input.parentNode.insertBefore(wrapper, input);

            // Crea display della data
            const displayDate = document.createElement('div');
            displayDate.className = 'date-display';
            displayDate.textContent = input.value ? new Date(input.value + 'T00:00:00').toLocaleDateString('it-IT') : 'Seleziona data';
            wrapper.appendChild(displayDate);

            // Crea bottone calendario
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'date-picker-btn';
            btn.innerHTML = '📅';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openDatePicker(input, displayDate);
            });

            wrapper.appendChild(btn);

            // Nascondi input originale
            input.style.display = 'none';
        });
    },

    openDatePicker(input, displayDate) {
        // Chiudi altri picker aperti
        document.querySelectorAll('.date-picker-modal').forEach(m => m.remove());

        const currentDate = input.value ? new Date(input.value + 'T00:00:00') : new Date();
        const modal = document.createElement('div');
        modal.className = 'date-picker-modal';

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        modal.innerHTML = this.generateCalendar(year, month, input.value);
        document.body.appendChild(modal);

        // Event delegation per i bottoni
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('date-day') && !e.target.classList.contains('other-month')) {
                const dateStr = e.target.dataset.date;
                input.value = dateStr;
                displayDate.textContent = new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT');
                input.dispatchEvent(new Event('change', { bubbles: true }));
                modal.remove();
            }

            if (e.target.classList.contains('date-nav-btn')) {
                const offset = parseInt(e.target.dataset.month);
                const newMonth = month + offset;
                const newYear = year + Math.floor(newMonth / 12);
                const actualMonth = ((newMonth % 12) + 12) % 12;

                modal.innerHTML = this.generateCalendar(newYear, actualMonth, input.value);
            }

            if (e.target === modal) {
                modal.remove();
            }
        });
    },

    generateCalendar(year, month, selectedDate) {
        const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const today = new Date();

        let html = `
            <div class="date-picker-content">
                <div class="date-picker-header">
                    <button type="button" class="date-nav-btn" data-month="-1">◀</button>
                    <h4>${monthNames[month]} ${year}</h4>
                    <button type="button" class="date-nav-btn" data-month="+1">▶</button>
                </div>
                
                <div class="date-picker-weekdays">
                    <div>Do</div><div>Lu</div><div>Ma</div><div>Me</div><div>Gi</div><div>Ve</div><div>Sa</div>
                </div>
                
                <div class="date-picker-days">
        `;

        // Giorni mese precedente (grigi)
        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<button type="button" class="date-day other-month" disabled>${daysInPrevMonth - i}</button>`;
        }

        // Giorni mese corrente
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

            let className = 'date-day';
            if (isToday) className += ' today';
            if (isSelected) className += ' selected';

            html += `<button type="button" class="${className}" data-date="${dateStr}">${day}</button>`;
        }

        // Giorni mese successivo (grigi)
        const totalCells = firstDay + daysInMonth;
        const remainingDays = 42 - totalCells;
        for (let day = 1; day <= remainingDays; day++) {
            html += `<button type="button" class="date-day other-month" disabled>${day}</button>`;
        }

        html += `</div></div>`;

        return html;
    },

    setupEventListeners() {
        // Hamburger Menu è gestito da hamburger-menu.js

        // Custom Date Picker
        this.initCustomDatePickers();

        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });

        // Sidebar toggle mobile
        document.querySelector('.sidebar-toggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });

        // Dark mode
        document.querySelector('.theme-toggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        });

        // Reset data
        document.querySelector('.reset-data').addEventListener('click', () => {
            StorageManager.reset();
        });

        // Diary form
        document.getElementById('diaryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleDiarySubmit();
        });

        // Range inputs
        document.getElementById('diaryComprehension').addEventListener('input', (e) => {
            document.getElementById('comprehensionValue').textContent = e.target.value;
        });

        document.getElementById('diaryStress').addEventListener('input', (e) => {
            document.getElementById('stressValue').textContent = e.target.value;
        });

        // Task form
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTaskSubmit();
        });

        // Task filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderTasks(e.target.dataset.filter);
            });
        });

        // Grade form
        document.getElementById('gradeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleGradeSubmit();
        });

        // Pomodoro
        document.getElementById('startBtn').addEventListener('click', () => this.handlePomodoroStart());
        document.getElementById('pauseBtn').addEventListener('click', () => this.handlePomodoroPause());
        document.getElementById('resetBtn').addEventListener('click', () => this.handlePomodoroReset());

        // Pomodoro settings
        ['studyDuration', 'shortBreakDuration', 'longBreakDuration'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const study = parseInt(document.getElementById('studyDuration').value);
                const short = parseInt(document.getElementById('shortBreakDuration').value);
                const long = parseInt(document.getElementById('longBreakDuration').value);
                PomodoroManager.saveSettings(study, short, long);
            });
        });

        // Exam modal
        document.getElementById('examModeBtn').addEventListener('click', () => {
            document.getElementById('examModal').classList.remove('hidden');
        });

        document.querySelector('.modal-close').addEventListener('click', () => {
            document.getElementById('examModal').classList.add('hidden');
        });

        document.getElementById('examForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleExamPlan();
        });

        // Date input default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('diaryDate').valueAsDate = new Date();
        document.getElementById('taskDueDate').valueAsDate = new Date();
        document.getElementById('gradeDate').valueAsDate = new Date();
    },

    handleDiarySubmit() {
        const entry = {
            date: document.getElementById('diaryDate').value,
            subject: document.getElementById('diarySubject').value,
            hours: document.getElementById('diaryHours').value,
            comprehension: document.getElementById('diaryComprehension').value,
            stress: document.getElementById('diaryStress').value,
            notes: document.getElementById('diaryNotes').value
        };

        DiaryManager.addEntry(entry);
        this.savData();
        document.getElementById('diaryForm').reset();
        this.renderDiary();
        this.renderDashboard();
    },

    handleTaskSubmit() {
        const task = {
            subject: document.getElementById('taskSubject').value,
            description: document.getElementById('taskDescription').value,
            dueDate: document.getElementById('taskDueDate').value,
            priority: document.getElementById('taskPriority').value
        };

        TaskManager.addTask(task);
        this.savData();
        document.getElementById('taskForm').reset();
        this.renderTasks('all');
        this.renderDashboard();
    },

    handleTaskDelete(id) {
        TaskManager.deleteTask(id);
        this.savData();
        this.renderTasks();
    },

    handleTaskToggle(id) {
        TaskManager.toggleTask(id);
        this.savData();
        this.renderTasks();
        this.renderDashboard();
    },

    handleGradeSubmit() {
        const grade = {
            subject: document.getElementById('gradeSubject').value,
            value: document.getElementById('gradeValue').value,
            weight: document.getElementById('gradeWeight').value,
            date: document.getElementById('gradeDate').value
        };

        GradeManager.addGrade(grade);
        this.savData();
        document.getElementById('gradeForm').reset();
        this.renderGrades();
        this.renderDashboard();
    },

    handleGradeDelete(id) {
        GradeManager.deleteGrade(id);
        this.savData();
        this.renderGrades();
    },

    handlePomodoroStart() {
        PomodoroManager.start();
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
    },

    handlePomodoroPause() {
        PomodoroManager.pause();
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    },

    handlePomodoroReset() {
        PomodoroManager.reset();
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    },

    handleExamPlan() {
        const examName = document.getElementById('examName').value;
        const examDays = document.getElementById('examDays').value;
        const examTopics = document.getElementById('examTopics').value;

        const plan = ExamPlanner.generatePlan(examName, examDays, examTopics);
        this.displayExamPlan(plan);
    },

    displayExamPlan(plan) {
        const planContent = document.getElementById('planContent');
        planContent.innerHTML = `
            <div class="exam-plan-details">
                <h4>${plan.examName}</h4>
                <p>Generato il ${plan.generatedAt}</p>
                <div style="margin-top: 1rem;">
        `;

        plan.plan.forEach(item => {
            planContent.innerHTML += `
                <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(244, 114, 182, 0.05)); padding: 1rem; border-radius: 8px; margin-bottom: 0.8rem; border-left: 4px solid #6366f1;">
                    <h5 style="margin-bottom: 0.5rem;">${item.topic}</h5>
                    <p style="font-size: 0.9rem; color: #666; margin-bottom: 0.5rem;">Giorni ${item.startDay}-${item.endDay}</p>
                    <p style="font-weight: 600; color: #6366f1;">📚 ${item.recommendedHours} ore consigliate</p>
                </div>
            `;
        });

        planContent.innerHTML += `</div></div>`;
        document.getElementById('examPlan').classList.remove('hidden');
    },

    savData() {
        const appData = StorageManager.load();
        appData.diaryEntries = DiaryManager.data;
        appData.tasks = TaskManager.data;
        appData.grades = GradeManager.data;
        appData.pomodoroSessions = PomodoroManager.data;
        appData.stats.totalHours = DiaryManager.getTotalHours() + PomodoroManager.getTotalHours();
        appData.stats.currentLevel = GamificationManager.getCurrentLevel();
        StorageManager.save(appData);
    },

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        // Show selected section
        document.getElementById(sectionName).classList.remove('hidden');

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        this.currentSection = sectionName;

        // Render section
        switch (sectionName) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'diary':
                this.renderDiary();
                break;
            case 'tasks':
                this.renderTasks('all');
                break;
            case 'grades':
                this.renderGrades();
                break;
            case 'pomodoro':
                this.renderPomodoro();
                break;
        }

        // Close sidebar on mobile
        document.querySelector('.sidebar').classList.remove('open');
    },

    renderDashboard() {
        // Update metrics
        document.getElementById('userLevel').textContent = GamificationManager.getCurrentLevel();
        document.getElementById('currentHours').textContent = (DiaryManager.getTotalHours() + PomodoroManager.getTotalHours()).toFixed(1);
        const currentLevel = GamificationManager.getCurrentLevel();
        const nextThreshold = GamificationManager.levelThresholds[currentLevel + 1] || GamificationManager.levelThresholds[currentLevel] + 100;
        document.getElementById('nextLevelHours').textContent = nextThreshold;
        document.getElementById('levelProgress').style.width = GamificationManager.getProgressToNextLevel() + '%';

        document.getElementById('averageGrade').textContent = GradeManager.getWeightedAverage() || '-';
        document.getElementById('weekHours').textContent = DiaryManager.getThisWeekHours().toFixed(1);
        document.getElementById('urgentTasks').textContent = TaskManager.getUrgentTasks().length;

        // Upcoming tasks
        const tasksPreview = document.getElementById('tasksPreview');
        const upcomingTasks = TaskManager.getActiveTasks().slice(0, 3);
        if (upcomingTasks.length === 0) {
            tasksPreview.innerHTML = '<p class="empty-state">Nessun compito urgente!</p>';
        } else {
            tasksPreview.innerHTML = upcomingTasks.map(task => `
                <div class="task-item" style="margin-bottom: 1rem;">
                    <div class="task-content">
                        <div class="task-title">${task.subject}</div>
                        <span class="task-subject">${task.subject}</span>
                        <div class="task-due">📅 ${new Date(task.dueDate).toLocaleDateString('it-IT')}</div>
                    </div>
                </div>
            `).join('');
        }

        // Insights
        const insightsContainer = document.getElementById('insights-container');
        const insights = InsightsManager.generateInsights();
        if (insights.length === 0) {
            insightsContainer.innerHTML = '<p class="empty-state">Aggiungi dati nel diario per ricevere insight!</p>';
        } else {
            insightsContainer.innerHTML = insights.map(insight => `
                <div class="insight-item">
                    <span style="font-size: 1.25rem; margin-right: 0.5rem;">${insight.emoji}</span>
                    <span>${insight.text}</span>
                </div>
            `).join('');
        }
    },

    renderDiary() {
        const container = document.getElementById('diaryEntries');
        if (DiaryManager.data.length === 0) {
            container.innerHTML = '<p class="empty-state">Nessuna entry ancora.</p>';
            return;
        }

        container.innerHTML = DiaryManager.data.map(entry => `
            <div class="entry-item">
                <div class="entry-content">
                    <div class="entry-title">${entry.subject}</div>
                    <span class="entry-subject">${entry.subject}</span>
                    <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #999;">
                        ⏱️ ${entry.hours}h | 🧠 Comprensione: ${entry.comprehension}/10 | 😰 Stress: ${entry.stress}/10
                    </div>
                    <div class="entry-date">${new Date(entry.date).toLocaleDateString('it-IT')}</div>
                    ${entry.notes ? `<p style="margin-top: 0.5rem; font-style: italic;">"${entry.notes}"</p>` : ''}
                </div>
                <button class="btn btn-delete btn-small" onclick="UIManager.handleDiaryDelete(${entry.id})">🗑️</button>
            </div>
        `).join('');
    },

    handleDiaryDelete(id) {
        DiaryManager.deleteEntry(id);
        this.savData();
        this.renderDiary();
        this.renderDashboard();
    },

    renderTasks(filter = 'all') {
        let tasks = TaskManager.data;
        if (filter === 'active') tasks = TaskManager.getActiveTasks();
        if (filter === 'completed') tasks = TaskManager.getCompletedTasks();

        const container = document.getElementById('tasksList');
        if (tasks.length === 0) {
            container.innerHTML = '<p class="empty-state">Nessun compito in questa categoria.</p>';
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}">
                <div style="display: flex; gap: 1rem; flex: 1;">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="UIManager.handleTaskToggle(${task.id})">
                    <div class="task-content">
                        <div class="task-title">${task.subject}${task.description ? ': ' + task.description : ''}</div>
                        <span class="task-subject">${task.subject}</span>
                        <span class="task-priority ${task.priority}">${task.priority}</span>
                        <div class="task-due">📅 ${new Date(task.dueDate).toLocaleDateString('it-IT')}</div>
                    </div>
                </div>
                <button class="btn btn-delete btn-small" onclick="UIManager.handleTaskDelete(${task.id})">🗑️</button>
            </div>
        `).join('');
    },

    renderGrades() {
        // Update stats
        document.getElementById('weightedAverage').textContent = GradeManager.getWeightedAverage() || '-';
        const trend = GradeManager.getGradeTrend();
        document.getElementById('gradeTrend').textContent = (trend > 0 ? '+' : '') + trend;

        // Chart andamento voti
        this.updateGradeChart();

        // Chart correlazione
        this.updateCorrelationChart();

        // Voti per materia
        const container = document.getElementById('gradesBySubject');
        const subjects = GradeManager.getSubjects();
        if (subjects.length === 0) {
            container.innerHTML = '<p class="empty-state">Nessun voto ancora.</p>';
            return;
        }

        container.innerHTML = subjects.map(subject => {
            const subjectGrades = GradeManager.data.filter(g => g.subject === subject);
            const avg = GradeManager.getAverageBySubject(subject);
            return `
                <div class="subject-card">
                    <div class="subject-name">${subject}</div>
                    <div class="subject-grades">${subjectGrades.length} voto${subjectGrades.length > 1 ? 'i' : ''}</div>
                    <div class="subject-average">${avg}</div>
                </div>
            `;
        }).join('');
    },

    updateGradeChart() {
        const ctx = document.getElementById('gradeChart');
        if (!ctx) return;

        const grades = GradeManager.data.slice().reverse();
        const labels = grades.map((g, i) => `${g.subject.substring(0, 3)} ${i + 1}`);
        const data = grades.map(g => g.value);

        if (this.gradeChart) {
            this.gradeChart.destroy();
        }

        this.gradeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Voti',
                    data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { min: 0, max: 10 }
                }
            }
        });
    },

    updateCorrelationChart() {
        const ctx = document.getElementById('correlationChart');
        if (!ctx) return;

        const entries = DiaryManager.data;
        if (entries.length === 0) return;

        // Prepare data
        const hours = entries.map(e => e.hours);
        const comprehension = entries.map(e => e.comprehension);

        if (this.correlationChart) {
            this.correlationChart.destroy();
        }

        this.correlationChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Ore vs Comprensione',
                    data: entries.map((e, i) => ({
                        x: e.hours,
                        y: e.comprehension
                    })),
                    backgroundColor: 'rgba(244, 114, 182, 0.6)',
                    borderColor: '#f472b6',
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    x: { title: { display: true, text: 'Ore di Studio' } },
                    y: { title: { display: true, text: 'Comprensione (1-10)' }, min: 0, max: 10 }
                }
            }
        });
    },

    renderPomodoro() {
        // Set values
        document.getElementById('studyDuration').value = PomodoroManager.studyDuration;
        document.getElementById('shortBreakDuration').value = PomodoroManager.shortBreakDuration;
        document.getElementById('longBreakDuration').value = PomodoroManager.longBreakDuration;

        document.getElementById('completedSessions').textContent = PomodoroManager.sessionsCompleted;
        document.getElementById('totalPomodoro').textContent = PomodoroManager.getTotalHours().toFixed(1);
        document.getElementById('weekPomodoro').textContent = PomodoroManager.getThisWeekHours().toFixed(1);

        // History
        const history = document.getElementById('pomodoroHistory');
        if (PomodoroManager.data.length === 0) {
            history.innerHTML = '<p class="empty-state">Nessuna sessione completata.</p>';
        } else {
            history.innerHTML = PomodoroManager.data.slice().reverse().slice(0, 10).map(session => `
                <div class="task-item" style="margin-bottom: 0.8rem;">
                    <div class="task-content">
                        <div class="task-title">Sessione Completata</div>
                        <div style="font-size: 0.9rem; color: #666;">
                            📅 ${new Date(session.date).toLocaleDateString('it-IT')} · ⏱️ ${session.hours}h
                        </div>
                    </div>
                </div>
            `).join('');
        }

        this.updateTimer();
    },

    updateTimer() {
        const minutes = Math.floor(PomodoroManager.timeLeft / 60);
        const seconds = PomodoroManager.timeLeft % 60;
        document.getElementById('timerDisplay').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const modeLabels = { study: 'Studio', shortBreak: 'Pausa Breve', longBreak: 'Pausa Lunga' };
        document.getElementById('timerMode').textContent = modeLabels[PomodoroManager.mode];

        // Aggiorna barra SVG
        const totalTime = PomodoroManager.mode === 'study'
            ? PomodoroManager.studyDuration * 60
            : PomodoroManager.mode === 'shortBreak'
                ? PomodoroManager.shortBreakDuration * 60
                : PomodoroManager.longBreakDuration * 60;

        const progress = ((totalTime - PomodoroManager.timeLeft) / totalTime) * 565;
        const circle = document.querySelector('.timer-progress');
        if (circle) {
            circle.style.strokeDashoffset = 565 - progress;
        }
    }
};

/* ============================================
   INIZIALIZZAZIONE
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    // Load data
    const appData = StorageManager.load();

    // Initialize managers
    DiaryManager.init(appData);
    TaskManager.init(appData);
    GradeManager.init(appData);
    PomodoroManager.init(appData);

    // Initialize UI
    UIManager.init();
});

// Auto-save every 5 seconds
setInterval(() => {
    UIManager.savData();
}, 5000);

// Inizializza nuovi managers quando carica la pagina
document.addEventListener('DOMContentLoaded', () => {
    const appData = StorageManager.load();
    NotesManager.init(appData);
    FlashcardManager.init(appData);
    GoalsManager.init(appData);
    ResourcesManager.init(appData);
    WellnessManager.init(appData);
});