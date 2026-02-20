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
    opponentData: null,
    pollInterval: null, // Holds the interval ID for HTTP polling

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

            // 1) Cerca stanza attiva
            // Manteniamo la fetch normale che andrà sul proxy
            const { data: rooms, error: roomsError } = await supabaseClient
                .from('quiz_rooms')
                .select('*')
                .eq('id', room.id) // Use room.id here, not roomCode which is undefined
                .eq('status', 'waiting');

            if (roomsError) throw roomsError; // Handle error if any

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
                .select('*')
                .eq('code', code.toUpperCase().trim())
                .maybeSingle();

            if (error) {
                console.error('Database Error:', error);
                throw new Error('Errore connessione: ' + error.message);
            }

            if (!room) {
                // Debugging: check if any room with this code exists regardless of status
                const { count } = await supabaseClient
                    .from('quiz_rooms')
                    .select('*', { count: 'exact', head: true })
                    .eq('code', code.toUpperCase().trim());

                if (count > 0) throw new Error('Stanza trovata ma non accessibile (Status diverso da waiting?)');
                throw new Error(`Codice ${code} non trovato.`);
            }

            if (room.status !== 'waiting') {
                throw new Error(`La partita è già iniziata (Status: ${room.status})`);
            }

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

    // ── REALTIME SYNC VIA HTTP POLLING ──
    // Vercel Proxy does not support WebSockets. We poll the database every 2.5s.
    subscribeToRoom(roomId) {
        if (!roomId) return;

        if (this.pollInterval) clearInterval(this.pollInterval);

        const pollData = async () => {
            try {
                // 1. Fetch Room State
                const { data: roomData, error: roomError } = await supabaseClient
                    .from('quiz_rooms')
                    .select('*')
                    .eq('id', roomId)
                    .single();

                if (roomError) return;
                if (!roomData) return;

                // 2. Fetch Players State
                const { data: playersData, error: playersError } = await supabaseClient
                    .from('quiz_players')
                    .select('*')
                    .eq('room_id', roomId)
                    .order('created_at', { ascending: true });

                if (playersError) return;

                this.players = playersData || [];

                // 3. Handle Status Changes
                const previousStatus = this.currentRoom ? this.currentRoom.status : null;
                this.currentRoom = roomData;

                // Opponent Left or Room Closed
                if (roomData.status === 'abandoned' && previousStatus !== 'abandoned') {
                    this.handleOpponentLeft();
                    return; // Stop polling
                }

                // Check Start Time (Host clicked start)
                if (roomData.status === 'active' && !this.countdownStarted) {
                    console.log('⏰ Room is active! Game starting...');
                    this.scheduleStart();
                }

                // 4. Update UI
                this.renderLobby();
                this.checkReadyStatus();
                this.renderDuelProgress();

                // 5. Host Check: If all are ready, start the game
                if (this.isHost && this.currentRoom.status === 'waiting') {
                    this._checkAndLaunchDuel();
                }

            } catch (err) {
                console.warn("Polling Warning:", err);
            }
        };

        // Initial fetch then loop
        pollData();
        this.pollInterval = setInterval(pollData, 2500);
    },

    async updatePlayersList() {
        // Redundant method, kept for legacy compatibility if called externally.
        // Polling loop handles this now.
    },

    handleRoomUpdate(update) {
        // Redundant method, incorporated directly into the poll loop.
    },

    checkReadyStatus() {
        if (!this.currentRoom || this.currentRoom.status !== 'waiting') return;

        const me = this.players.find(p => p.username === this.playerName);
        const opponent = this.players.find(p => p.username !== this.playerName);

        console.log(`[checkReadyStatus] me ready: ${me?.is_ready}, str: ${JSON.stringify(me)}`);
        console.log(`[checkReadyStatus] opp ready: ${opponent?.is_ready}, str: ${JSON.stringify(opponent)}`);

        // Invitation Logic
        // Se non sono l'host, l'host è "opponent" per me.
        if (opponent && opponent.is_ready && me && !me.is_ready && !this.inviting) {
            this.inviting = true;
            console.log(`[checkReadyStatus] Triggering UIManager.confirm per ${me.username}`);
            UIManager.confirm(`${opponent.username} ti sta sfidando! Sei pronto a iniziare?`, '⚔️ SFIDA')
                .then(yes => {
                    this.inviting = false;
                    console.log(`[checkReadyStatus] Risposta UIManager.confirm: ${yes}`);
                    if (yes) this.setReady();
                })
                .catch(err => {
                    this.inviting = false;
                    console.error(`[checkReadyStatus] Errore UIManager.confirm:`, err);
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

        // Change host to ready first. 
        // Note: The opponent's poll loop will detect this and show the "Opponent is ready! Are you?" popup.
        await this.setReady();
    },

    async _checkAndLaunchDuel() {
        // Find if everyone is ready
        if (!this.isHost || !this.currentRoom || this.currentRoom.status !== 'waiting') return;

        const allReady = this.players.length > 1 && this.players.every(p => p.is_ready);
        console.log(`[_checkAndLaunchDuel] allReady: ${allReady}, countdownStarted: ${this.countdownStarted}, players: ${this.players.length}`);

        if (allReady && !this.countdownStarted) {
            this.countdownStarted = true; // prevent multiple triggers

            await supabaseClient
                .from('quiz_rooms')
                .update({
                    status: 'active'
                })
                .eq('id', this.currentRoom.id);
        }
    },

    scheduleStart() {
        this.countdownStarted = true;

        // Show Countdown Overlay
        document.getElementById('duelWaitingLobby').classList.add('hidden');
        const overlay = document.getElementById('duelCountdownOverlay');
        const value = document.getElementById('countdownValue');
        overlay.classList.remove('hidden');

        let secondsLeft = 4;
        value.textContent = secondsLeft;

        const timer = setInterval(() => {
            secondsLeft--;
            if (secondsLeft > 0) {
                value.textContent = secondsLeft;
            } else {
                clearInterval(timer);
                value.textContent = 'VIA!';
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    this.startQuizSession();
                }, 1000);
            }
        }, 1000);
    },

    handleOpponentLeft() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        alert("L'avversario ha abbandonato la stanza.");
        this.resetDuel();
        const lobbyModal = document.getElementById('duel-lobby-modal');
        if (lobbyModal) lobbyModal.classList.remove('active');
        const searchModal = document.getElementById('duel-search-modal');
        if (searchModal) searchModal.classList.add('active');
    },

    resetDuel() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        // The original `this.currentChannel` is not defined, and we are using polling instead of channels.
        // So, this part of the instruction is not directly applicable.
        // if (this.currentChannel) {
        //     supabase.removeChannel(this.currentChannel);
        //     this.currentChannel = null;
        // }
        // Reset other duel state variables
        this.currentRoom = null;
        this.players = [];
        this.questions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.isHost = false;
        this.playerName = null;
        this.opponentData = null;
        this.countdownStarted = false;
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.timeLeft = 15;
        // Hide game sections and show initial form
        document.getElementById('duelArenaSection').classList.add('hidden');
        document.getElementById('duelWaitingLobby').classList.add('hidden');
        document.getElementById('duelResultsSection').classList.add('hidden');
        document.getElementById('duelCreateForm').classList.remove('hidden');
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
        if (this.timerInterval) clearInterval(this.timerInterval);

        // Disable buttons
        document.querySelectorAll('.duel-opt-btn').forEach(b => b.disabled = true);

        // Scoring: Base 10 + Time Bonus (up to 5)
        if (isCorrect) {
            const timeBonus = Math.floor(this.timeLeft / 3);
            this.score += (10 + timeBonus);
        }

        this.currentIndex++;

        try {
            // Sync Score
            await supabaseClient
                .from('quiz_players')
                .update({
                    score: this.score,
                    current_question_index: this.currentIndex
                })
                .eq('room_id', this.currentRoom.id)
                .eq('username', this.playerName);
        } catch (e) {
            console.error("Failed to sync score:", e);
        }

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
            // Host can click start if there is at least one opponent
            const canStart = this.isHost && this.players.length > 1;
            startBtn.disabled = !canStart;

            // Pulse if everyone is ready (optional visual cue)
            if (allReady && this.isHost) {
                startBtn.classList.add('pulse');
                startBtn.textContent = 'INVIA SFIDA';
            } else if (this.isHost && this.players.length > 1) {
                startBtn.classList.remove('pulse');
                startBtn.textContent = 'SFIDA L\'AVVERSARIO';
            }
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

