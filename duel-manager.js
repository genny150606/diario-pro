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
        if (!username) {
            alert('Inserisci un nome per giocare.');
            return null;
        }

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
            this.questions = room.ai_data;

            // UI Update
            document.getElementById('duelCreateForm').classList.add('hidden');
            document.getElementById('duelWaitingLobby').classList.remove('hidden');
            document.getElementById('roomCodeDisplay').textContent = room.code;

            // PREVENT DUPLICATES: Check if username already in room
            const { data: existing } = await supabaseClient
                .from('quiz_players')
                .select('id')
                .eq('room_id', room.id)
                .eq('username', username)
                .maybeSingle();

            if (!existing) {
                await this.joinPlayer(room.id, username);
            } else {
                console.log('👤 Player already in room, skipping insert');
            }

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
        console.log('📡 Subscribing to Room Realtime:', roomId);
        if (this.subscription) supabaseClient.removeChannel(this.subscription);

        this.subscription = supabaseClient
            .channel(`room_${roomId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'quiz_players',
                filter: `room_id=eq.${roomId}`
            }, payload => {
                console.log('🔄 Player Sync Event:', payload.eventType, payload.new);
                this.updatePlayersList();
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'quiz_rooms',
                filter: `id=eq.${roomId}`
            }, payload => {
                console.log('🏁 Room Status Update:', payload.new.status);
                if (payload.new.status === 'active' && this.currentRoom.status !== 'active') {
                    this.currentRoom.status = 'active';
                    this.startQuizUI();
                }
            })
            .subscribe((status) => {
                console.log('📶 Channel Status:', status);
                if (status === 'SUBSCRIBED') {
                    this.updatePlayersList();
                }
            });
    },

    async updatePlayersList() {
        if (!this.currentRoom) return;

        const { data, error } = await supabaseClient
            .from('quiz_players')
            .select('*')
            .eq('room_id', this.currentRoom.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching players:', error);
            return;
        }

        this.players = data || [];
        console.log('👥 Players Updated:', this.players.length);
        this.renderLobby();

        // If in battle, refresh progress bars
        if (this.currentRoom?.status === 'active') {
            this.renderDuelProgress();
        }
    },

    // ── GAME LOGIC ──
    async startBattle() {
        if (!this.isHost) return;

        console.log('⚔️ Starting Battle...');
        const { error } = await supabaseClient
            .from('quiz_rooms')
            .update({ status: 'active' })
            .eq('id', this.currentRoom.id);

        if (error) {
            console.error('Start error:', error);
        } else {
            this.currentRoom.status = 'active';
            this.startQuizUI();
        }
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
        if (this.isHost) {
            return AuthManager.user?.email?.split('@')[0] || 'Player 1';
        }
        const name = document.getElementById('duelUsername')?.value;
        return name || 'Ospite';
    },

    // ── UI RENDERING ──
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
            <button class="btn-primary" onclick="showSection('dashboard')">Torna alla Home</button>
        `;

        // Grant XP for finishing
        if (typeof GamificationManager !== 'undefined') {
            GamificationManager.addXP(50, 'Duello completato');
        }
    }
};
