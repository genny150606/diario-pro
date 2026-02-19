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

    async init() {
        console.log('⚔️ Duel Manager initialized');
    },

    // ── ROOM MANAGEMENT ──
    async createRoom(subject = 'Cultura Generale') {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();

        try {
            // 1. Generate Quiz via Gemini
            const response = await fetch('/api/generate-duel-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject })
            });
            const { quiz } = await response.json();

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
            await this.joinPlayer(room.id, AuthManager.user?.email?.split('@')[0] || 'Player 1');

            this.subscribeToRoom(room.id);
            return code;
        } catch (err) {
            console.error('Failed to create room:', err);
            return null;
        }
    },

    async joinRoom(code, username) {
        try {
            const { data: room, error } = await supabaseClient
                .from('quiz_rooms')
                .select()
                .eq('code', code.toUpperCase())
                .eq('status', 'waiting')
                .single();

            if (error || !room) throw new Error('Stanza non trovata o già iniziata.');

            this.currentRoom = room;
            this.isHost = false;
            this.questions = room.ai_data;

            // UI Update
            document.getElementById('duelCreateForm').classList.add('hidden');
            document.getElementById('duelWaitingLobby').classList.remove('hidden');
            document.getElementById('roomCodeDisplay').textContent = room.code;

            await this.joinPlayer(room.id, username);
            this.subscribeToRoom(room.id);
            return room;
        } catch (err) {
            console.error('Join error:', err.message);
            alert(err.message);
            return null;
        }
    },

    async joinPlayer(roomId, username) {
        const { data, error } = await supabaseClient
            .from('quiz_players')
            .insert([{ room_id: roomId, username, score: 0, is_ready: true }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ── REALTIME SYNC ──
    subscribeToRoom(roomId) {
        if (this.subscription) supabaseClient.removeChannel(this.subscription);

        this.subscription = supabaseClient
            .channel(`room:${roomId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'quiz_players',
                filter: `room_id=eq.${roomId}`
            }, payload => {
                this.handlePlayerUpdate(payload);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'quiz_rooms',
                filter: `id=eq.${roomId}`
            }, payload => {
                if (payload.new.status === 'active') this.startQuizUI();
            })
            .subscribe();

        this.updatePlayersList();
    },

    async handlePlayerUpdate(payload) {
        console.log('🔄 Sync Update:', payload);
        await this.updatePlayersList();

        // If in battle, refresh progress bars
        if (this.currentRoom?.status === 'active') {
            this.renderDuelProgress();
        }
    },

    async updatePlayersList() {
        const { data } = await supabaseClient
            .from('quiz_players')
            .select('*')
            .eq('room_id', this.currentRoom.id);

        this.players = data || [];
        this.renderLobby();
    },

    // ── GAME LOGIC ──
    async startBattle() {
        if (!this.isHost) return;

        const { error } = await supabaseClient
            .from('quiz_rooms')
            .update({ status: 'active' })
            .eq('id', this.currentRoom.id);

        if (error) console.error('Start error:', error);
    },

    async submitAnswer(isCorrect) {
        if (isCorrect) this.score += 10;
        this.currentIndex++;

        await supabaseClient
            .from('quiz_players')
            .update({
                score: this.score,
                current_question_index: this.currentIndex,
                updated_at: new Date()
            })
            .eq('room_id', this.currentRoom.id)
            .eq('username', this.getPlayerName());

        if (this.currentIndex >= this.questions.length) {
            this.finishDuel();
        } else {
            this.renderQuestion();
        }
    },

    getPlayerName() {
        // Simple logic to find current user in players list
        // In a real app we'd use user_id, here we use the name we joined with
        return this.isHost ? (AuthManager.user?.email?.split('@')[0] || 'Player 1') : document.getElementById('duelUsername')?.value;
    },

    // ── UI RENDERING (Placeholders) ──
    renderLobby() {
        const container = document.getElementById('duelLobbyList');
        if (!container) return;

        container.innerHTML = this.players.map(p => `
            <div class="player-card">
                <span>👤 ${p.username}</span>
                <span class="status-ready">${p.is_ready ? 'Pronto' : 'In attesa...'}</span>
            </div>
        `).join('');

        const startBtn = document.getElementById('startDuelBtn');
        if (startBtn) {
            startBtn.disabled = this.players.length < 2 || !this.isHost;
        }
    },

    startQuizUI() {
        document.getElementById('duelLobbySection').classList.add('hidden');
        document.getElementById('duelArenaSection').classList.remove('hidden');
        this.renderQuestion();
    },

    renderQuestion() {
        const q = this.questions[this.currentIndex];
        const container = document.getElementById('duelQuestionContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="duel-q-header">
                <h3>Domanda ${this.currentIndex + 1} di ${this.questions.length}</h3>
            </div>
            <p class="duel-q-text">${q.question}</p>
            <div class="duel-options">
                ${q.options.map((opt, i) => `
                    <button class="duel-opt-btn" onclick="DuelManager.submitAnswer(${i === q.answer})">${opt}</button>
                `).join('')}
            </div>
        `;
        this.renderDuelProgress();
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

        const results = document.getElementById('duelResultsSummary');
        const winner = this.players.reduce((prev, current) => (prev.score > current.score) ? prev : current);

        results.innerHTML = `
            <h2>🏆 Vittoria per ${winner.username}!</h2>
            <div class="final-scores">
                ${this.players.map(p => `<p>${p.username}: ${p.score} punti</p>`).join('')}
            </div>
            <button class="primary-btn" onclick="showSection('dashboard')">Torna alla Home</button>
        `;

        // Grant XP for finishing
        if (typeof GamificationManager !== 'undefined') {
            GamificationManager.addXP(50, 'Duello completato');
        }
    }
};
