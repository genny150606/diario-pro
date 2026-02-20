// ============================================
// DUEL MANAGER - Real-time AI Quiz Duel
// ============================================

const DuelManager = {
    currentRoom: null,
    players: [],
    questions: [],
    currentIndex: 0,
    score: 0,
    subscription: null,
    isHost: false,
    playerName: null,

    // New State
    currentSource: 'subject', // subject, notes, pdf
    quizContext: '', // Text content for quiz generation
    timerInterval: null,
    timeLeft: 15,
    maxTime: 15, // Seconds per question

    async init() {
        console.log('⚔️ Duel Manager initialized');
        this.loadNotes();
    },

    // ── SOURCE SELECTION UI ──
    setSource(type, btn) {
        this.currentSource = type;

        // Update Tabs
        document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show Content
        document.querySelectorAll('.duel-source-content').forEach(el => el.style.display = 'none');
        document.getElementById(`duelSource_${type}`).style.display = 'block';
    },

    loadNotes() {
        const select = document.getElementById('duelNoteSelect');
        if (!select || typeof NotesManager === 'undefined') return;

        const notes = NotesManager.getNotes();
        select.innerHTML = '<option value="">-- Seleziona Appunti --</option>';

        if (notes.length === 0) {
            select.innerHTML += '<option disabled>Nessuna nota trovata</option>';
            return;
        }

        notes.forEach(note => {
            const opt = document.createElement('option');
            opt.value = note.id;
            opt.textContent = note.title;
            // Store content in dataset for easy access
            opt.dataset.content = note.content;
            select.appendChild(opt);
        });
    },

    async handleFileUpload(input) {
        const file = input.files[0];
        if (!file) return;

        document.getElementById('duelFileName').textContent = file.name;

        if (file.type === 'application/pdf') {
            // Check if pdf.js is loaded
            if (typeof pdfjsLib === 'undefined') {
                await this.loadPdfJs();
            }
            this.extractPdfText(file);
        } else {
            // Text file
            const text = await file.text();
            document.getElementById('duelManualText').value = text;
        }
    },

    async loadPdfJs() {
        // Dynamic load of PDF.js
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve();
            };
            document.head.appendChild(script);
        });
    },

    async extractPdfText(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            document.getElementById('duelManualText').value = fullText.substring(0, 15000); // Limit size
        } catch (e) {
            console.error('PDF Error:', e);
            alert('Errore lettura PDF. Riprova con un file di testo.');
        }
    },

    // ── ROOM MANAGEMENT ──
    async createRoom() {
        // Collect Data based on source
        let subject = 'Generale';
        let context = '';

        if (this.currentSource === 'subject') {
            subject = document.getElementById('duelSubjectInput').value || 'Cultura Generale';
        } else if (this.currentSource === 'notes') {
            const select = document.getElementById('duelNoteSelect');
            if (!select.value) return alert('Seleziona una nota!');
            subject = select.options[select.selectedIndex].text;
            context = select.options[select.selectedIndex].dataset.content;
        } else if (this.currentSource === 'pdf') {
            context = document.getElementById('duelManualText').value;
            if (!context.trim()) return alert('Nessun testo trovato!');
            subject = 'Documento PDF';
        }

        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        const createBtn = document.getElementById('duelCreateBtn');
        createBtn.disabled = true;
        createBtn.textContent = '🧠 Generazione Quiz...';

        try {
            // 1. Generate Quiz via Gemini
            const response = await fetch('/api/generate-duel-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, context })
            });
            const { quiz } = await response.json();

            if (!quiz || quiz.length === 0) throw new Error("Quiz vuoto");

            // 2. Create Room in Supabase
            const { data: room, error } = await supabaseClient
                .from('quiz_rooms')
                .insert([{ code, subject, ai_data: quiz, status: 'waiting' }])
                .select()
                .single();

            if (error) throw error;

            this.currentRoom = room;
            this.isHost = true;
            this.questions = quiz;

            // UI Update
            document.getElementById('duelCreateForm').classList.add('hidden');
            document.getElementById('duelWaitingLobby').classList.remove('hidden');
            document.getElementById('roomCodeDisplay').textContent = code;

            // 3. Add Host as first player
            this.playerName = (AuthManager.user?.email?.split('@')[0] || 'Host').trim();
            await this.joinPlayer(room.id, this.playerName);

            this.subscribeToRoom(room.id);
            return code;
        } catch (err) {
            console.error('Failed to create room:', err);
            alert('Errore creazione stanza: ' + err.message);
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = 'Crea Stanza';
        }
    },

    async joinRoom(codeRaw) {
        const code = codeRaw || document.getElementById('duelJoinCode').value;
        const autoName = (AuthManager.user?.email?.split('@')[0] || 'Ospite').trim();

        if (!code) return alert('Inserisci il codice!');

        try {
            console.log('🔍 Joining room:', code);
            const { data: room, error } = await supabaseClient
                .from('quiz_rooms')
                .select()
                .eq('code', code.toUpperCase().trim())
                .eq('status', 'waiting')
                .single();

            if (error || !room) throw new Error('Stanza non trovata o già iniziata.');

            this.currentRoom = room;
            this.isHost = false;
            this.playerName = autoName;
            this.questions = room.ai_data;

            // UI Update
            document.getElementById('duelCreateForm').classList.add('hidden');
            document.getElementById('duelWaitingLobby').classList.remove('hidden');
            document.getElementById('roomCodeDisplay').textContent = room.code;

            // Check duplicate
            const { data: existing } = await supabaseClient
                .from('quiz_players')
                .select('id')
                .eq('room_id', room.id)
                .eq('username', this.playerName)
                .maybeSingle();

            if (!existing) {
                await this.joinPlayer(room.id, this.playerName);
            }

            this.subscribeToRoom(room.id);
        } catch (err) {
            console.error('Join error:', err.message);
            alert(err.message);
        }
    },

    async joinPlayer(roomId, username) {
        const { data, error } = await supabaseClient
            .from('quiz_players')
            .insert([{ room_id: roomId, username, score: 0, is_ready: false }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ── REALTIME SYNC ──
    subscribeToRoom(roomId) {
        if (!roomId) return;

        if (this.subscription) supabaseClient.removeChannel(this.subscription);

        this.updatePlayersList();

        this.subscription = supabaseClient
            .channel(`duel_${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_players', filter: `room_id=eq.${roomId}` },
                () => this.updatePlayersList())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_rooms', filter: `id=eq.${roomId}` },
                (payload) => this.handleRoomUpdate(payload.new))
            .subscribe();
    },

    async updatePlayersList() {
        if (!this.currentRoom) return;

        const { data } = await supabaseClient
            .from('quiz_players')
            .select('*')
            .eq('room_id', this.currentRoom.id)
            .order('created_at', { ascending: true });

        this.players = data || [];
        this.renderLobby();
        this.checkReadyStatus();
        this.renderDuelProgress(); // Update progress bars during game
    },

    handleRoomUpdate(update) {
        this.currentRoom = update;

        // SYNC START: Check if start_time is set
        if (update.start_time && !this.countdownStarted) {
            console.log('⏰ Start time received:', update.start_time);
            this.scheduleStart(update.start_time);
        }
    },

    checkReadyStatus() {
        if (this.currentRoom.status !== 'waiting') return;

        const me = this.players.find(p => p.username === this.playerName);
        const opponent = this.players.find(p => p.username !== this.playerName);

        // Invitation Logic
        if (opponent && opponent.is_ready && me && !me.is_ready && !this.inviting) {
            this.inviting = true;
            UIManager.confirm(`${opponent.username} è pronto! Sei pronto?`, '⚔️ SFIDA')
                .then(yes => {
                    this.inviting = false;
                    if (yes) this.setReady();
                });
        }
    },

    async setReady() {
        await supabaseClient
            .from('quiz_players')
            .update({ is_ready: true })
            .eq('room_id', this.currentRoom.id)
            .eq('username', this.playerName);
    },

    // ── GAME LOGIC ──
    async triggerStart() {
        // Only host triggers start
        if (!this.isHost) return;

        // Calculate start time: Now + 5 seconds buffer
        const startTime = new Date(Date.now() + 5000).toISOString();

        await supabaseClient
            .from('quiz_rooms')
            .update({
                status: 'active',
                start_time: startTime
            })
            .eq('id', this.currentRoom.id);
    },

    scheduleStart(isoStartTime) {
        this.countdownStarted = true;
        const targetTime = new Date(isoStartTime).getTime();

        // Show Countdown Overlay
        document.getElementById('duelWaitingLobby').classList.add('hidden');
        const overlay = document.getElementById('duelCountdownOverlay');
        const value = document.getElementById('countdownValue');
        overlay.classList.remove('hidden');

        const timer = setInterval(() => {
            const now = Date.now();
            const diff = Math.ceil((targetTime - now) / 1000);

            if (diff > 0) {
                value.textContent = diff;
            } else {
                clearInterval(timer);
                value.textContent = 'VIA!';
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    this.startQuizSession();
                }, 1000);
            }
        }, 100); // 100ms precision
    },

    startQuizSession() {
        this.currentIndex = 0;
        this.score = 0;
        document.getElementById('duelLobbySection').classList.add('hidden');
        document.getElementById('duelArenaSection').classList.remove('hidden');
        this.renderQuestion();
    },

    renderQuestion() {
        const q = this.questions[this.currentIndex];
        const container = document.getElementById('duelQuestionContainer');
        container.innerHTML = `
            <div class="duel-q-header">
                <div>
                    <h3>Domanda ${this.currentIndex + 1}/${this.questions.length}</h3>
                    <div class="timer-bar"><div id="qTimerFill" style="width: 100%"></div></div>
                </div>
            </div>
            <p class="duel-q-text">${q.question}</p>
            <div class="duel-options">
                ${q.options.map((opt, i) => `
                    <button class="duel-opt-btn" onclick="DuelManager.submitAnswer(${i === q.answer})">${opt}</button>
                `).join('')}
            </div>
        `;

        this.startQuestionTimer();
    },

    startQuestionTimer() {
        this.timeLeft = this.maxTime;
        const fill = document.getElementById('qTimerFill');

        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            this.timeLeft -= 0.1;
            const pct = (this.timeLeft / this.maxTime) * 100;
            if (fill) fill.style.width = `${pct}%`;

            if (this.timeLeft <= 0) {
                this.submitAnswer(false); // Time out = wrong
            }
        }, 100);
    },

    async submitAnswer(isCorrect) {
        clearInterval(this.timerInterval);

        // Disable buttons
        document.querySelectorAll('.duel-opt-btn').forEach(b => b.disabled = true);

        // Scoring: Base 10 + Time Bonus (up to 5)
        if (isCorrect) {
            const timeBonus = Math.floor(this.timeLeft / 3);
            this.score += (10 + timeBonus);
        }

        this.currentIndex++;

        // Sync Score
        await supabaseClient
            .from('quiz_players')
            .update({
                score: this.score,
                current_question_index: this.currentIndex,
                updated_at: new Date()
            })
            .eq('room_id', this.currentRoom.id)
            .eq('username', this.playerName);

        setTimeout(() => {
            if (this.currentIndex >= this.questions.length) {
                this.finishDuel();
            } else {
                this.renderQuestion();
            }
        }, 1000);
    },

    // ── UI RENDERING ──
    renderLobby() {
        const container = document.getElementById('duelLobbyList');
        if (!container) return;

        const allReady = this.players.length > 1 && this.players.every(p => p.is_ready);
        const startBtn = document.getElementById('startDuelBtn');

        container.innerHTML = this.players.map(p => `
            <div class="player-card">
                <span>👤 ${p.username} ${p.username === this.playerName ? '(Tu)' : ''}</span>
                <span class="status-ready ${p.is_ready ? 'ready' : ''}">${p.is_ready ? 'Pronto' : 'In attesa...'}</span>
            </div>
        `).join('');

        if (startBtn) {
            // Enable start if everyone ready AND I am host
            startBtn.disabled = !(allReady && this.isHost);
            if (allReady && this.isHost) startBtn.classList.add('pulse');
        }
    },

    renderDuelProgress() {
        const progressContainer = document.getElementById('duelProgressBars');
        if (!progressContainer) return;

        progressContainer.innerHTML = this.players.map(p => {
            const pct = (p.current_question_index / this.questions.length) * 100;
            return `
                <div class="opponent-progress">
                    <div class="opp-info">
                        <span>${p.username}</span>
                        <span>${p.score} pt</span>
                    </div>
                    <div class="opp-bar-bg">
                        <div class="opp-bar-fill" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    async finishDuel() {
        document.getElementById('duelArenaSection').classList.add('hidden');
        document.getElementById('duelResultsSection').classList.remove('hidden');

        // Sort by score
        const ranked = [...this.players].sort((a, b) => b.score - a.score);
        const winner = ranked[0];

        const results = document.getElementById('duelResultsSummary');
        results.innerHTML = `
            <h2>🏆 Vittoria per ${winner.username}!</h2>
            <div class="final-scores">
                ${ranked.map((p, i) => `<div class="result-row"><span>#${i + 1} ${p.username}</span> <span>${p.score} pt</span></div>`).join('')}
            </div>
            <br>
            <button class="btn-primary" onclick="location.reload()">Torna alla Home</button>
        `;

        // Grant XP for finishing
        if (typeof GamificationManager !== 'undefined') {
            GamificationManager.addXP(50 + (this.score || 0), 'Duello Completato');
        }
    }
};

