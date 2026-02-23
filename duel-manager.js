// ============================================
// DUEL MANAGER - Spectacular AI Quiz Duel
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
    pollInterval: null,

    // ── SPECTACULAR STATE ──
    currentSource: 'subject',
    quizContext: '',
    timerInterval: null,
    timeLeft: 15,
    maxTime: 15,
    streak: 0,
    activePowerUps: [],
    powerUpEffects: { doubleXP: false, shield: false },
    frozenLocally: false,

    async init() {
        console.log('⚔️ Duel Manager initialized');
        this.loadNotes();
    },

    // ── SOURCE SELECTION UI ──
    setSource(type, btn) {
        this.currentSource = type;
        document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.duel-source-content').forEach(el => el.style.display = 'none');
        document.getElementById(`duelSource_${type}`).style.display = 'block';
    },

    loadNotes() {
        const select = document.getElementById('duelNoteSelect');
        if (!select || typeof NotesManager === 'undefined') return;
        const notes = NotesManager.getNotes();
        select.innerHTML = '<option value="">-- Seleziona Appunti --</option>';
        if (notes.length === 0) return;
        notes.forEach(note => {
            const opt = document.createElement('option');
            opt.value = note.id;
            opt.textContent = note.title;
            opt.dataset.content = note.content;
            select.appendChild(opt);
        });
    },

    async handleFileUpload(input) {
        const file = input.files[0];
        if (!file) return;
        document.getElementById('duelFileName').textContent = file.name;
        if (file.type === 'application/pdf') {
            if (typeof pdfjsLib === 'undefined') await this.loadPdfJs();
            this.extractPdfText(file);
        } else {
            const text = await file.text();
            document.getElementById('duelManualText').value = text;
        }
    },

    async loadPdfJs() {
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
                fullText += textContent.items.map(item => item.str).join(' ') + '\n';
            }
            document.getElementById('duelManualText').value = fullText.substring(0, 15000);
        } catch (e) {
            console.error('PDF Error:', e);
            alert('Errore lettura PDF.');
        }
    },

    // ── ROOM MANAGEMENT ──
    async createRoom() {
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
            const response = await fetch('/api/generate-duel-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, context })
            });
            const { quiz } = await response.json();
            if (!quiz || quiz.length === 0) throw new Error("Quiz vuoto");

            const { data: room, error } = await supabaseClient.from('quiz_rooms').insert([{ code, subject, ai_data: quiz, status: 'waiting' }]).select().single();
            if (error) throw error;

            this.currentRoom = room;
            this.isHost = true;
            this.questions = quiz;
            if (typeof AppManager !== 'undefined') AppManager.showSection('duel');

            document.getElementById('duelCreateForm').classList.add('hidden');
            document.getElementById('duelWaitingLobby').classList.remove('hidden');
            document.getElementById('roomCodeDisplay').textContent = code;

            this.playerName = (AuthManager.user?.email?.split('@')[0] || 'Host').trim();
            await this.joinPlayer(room.id, this.playerName);
            this.subscribeToRoom(room.id);
            return code;
        } catch (err) {
            console.error('Create error:', err);
            alert('Errore: ' + err.message);
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = 'GENERA ARENA ⚡';
        }
    },

    async joinRoom(code) {
        if (!code) return alert('Inserisci il codice!');
        try {
            const { data: room, error } = await supabaseClient.from('quiz_rooms').select('*').eq('code', code.toUpperCase().trim()).maybeSingle();
            if (error) throw error;
            if (!room) throw new Error(`Codice ${code} non trovato.`);
            if (room.status !== 'waiting') throw new Error(`Partita già iniziata.`);

            this.currentRoom = room;
            this.isHost = false;
            this.playerName = (AuthManager.user?.email?.split('@')[0] || 'Ospite').trim();
            this.questions = room.ai_data;
            if (typeof AppManager !== 'undefined') AppManager.showSection('duel');

            document.getElementById('duelCreateForm').classList.add('hidden');
            document.getElementById('duelWaitingLobby').classList.remove('hidden');
            document.getElementById('roomCodeDisplay').textContent = room.code;

            await this.joinPlayer(room.id, this.playerName);
            this.subscribeToRoom(room.id);
        } catch (err) {
            alert(err.message);
        }
    },

    async joinPlayer(roomId, username) {
        await supabaseClient.from('quiz_players').insert([{ room_id: roomId, username, score: 0, is_ready: false }]);
    },

    subscribeToRoom(roomId) {
        if (this.pollInterval) clearInterval(this.pollInterval);
        const pollData = async () => {
            const { data: roomData } = await supabaseClient.from('quiz_rooms').select('*').eq('id', roomId).single();
            const { data: playersData } = await supabaseClient.from('quiz_players').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
            if (!roomData || !playersData) return;

            this.players = playersData;
            this.currentRoom = roomData;

            if (roomData.status === 'abandoned') return this.handleOpponentLeft();
            if (roomData.status === 'active' && !this.countdownStarted) this.scheduleStart();

            this.renderLobby();
            this.checkReadyStatus();
            this.renderDuelProgress();

            if (this.isHost && this.currentRoom.status === 'waiting') this._checkAndLaunchDuel();
        };
        pollData();
        this.pollInterval = setInterval(pollData, 2000);
    },

    checkReadyStatus() {
        const opponent = this.players.find(p => p.username !== this.playerName);
        const me = this.players.find(p => p.username === this.playerName);
        if (opponent?.is_ready && me && !me.is_ready && !this.inviting) {
            this.inviting = true;
            UIManager.confirm(`${opponent.username} ti sta sfidando! Sei pronto?`, '⚔️ SFIDA').then(yes => {
                this.inviting = false;
                if (yes) this.setReady();
            });
        }
    },

    async setReady() {
        await supabaseClient.from('quiz_players').update({ is_ready: true }).eq('room_id', this.currentRoom.id).eq('username', this.playerName);
    },

    async triggerStart() {
        if (this.isHost) await this.setReady();
    },

    async _checkAndLaunchDuel() {
        if (this.players.length > 1 && this.players.every(p => p.is_ready) && !this.countdownStarted) {
            this.countdownStarted = true;
            await supabaseClient.from('quiz_rooms').update({ status: 'active' }).eq('id', this.currentRoom.id);
        }
    },

    scheduleStart() {
        this.countdownStarted = true;
        document.getElementById('duelWaitingLobby').classList.add('hidden');
        const overlay = document.getElementById('duelCountdownOverlay');
        overlay.classList.remove('hidden');
        let sl = 4;
        const timer = setInterval(() => {
            sl--;
            if (sl > 0) document.getElementById('countdownValue').textContent = sl;
            else {
                clearInterval(timer);
                document.getElementById('countdownValue').textContent = 'VIA!';
                setTimeout(() => { overlay.classList.add('hidden'); this.startQuizSession(); }, 800);
            }
        }, 1000);
    },

    handleOpponentLeft() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        alert("Opponent left.");
        location.reload();
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
        const options = q.options || [];
        container.innerHTML = `
            <p class="duel-q-text">${q.question}</p>
            <div class="duel-options">
                ${options.map((opt, i) => `<button class="duel-opt-btn" onclick="DuelManager.submitAnswer(${i === q.answer}, ${i})"><span class="opt-index">${String.fromCharCode(65 + i)}</span> ${opt}</button>`).join('')}
            </div>
        `;
        this.startQuestionTimer();
    },

    startQuestionTimer() {
        this.timeLeft = this.maxTime;
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.frozenLocally) this.timeLeft -= 0.1;
            const pct = (this.timeLeft / this.maxTime) * 100;
            document.getElementById('hudTimerFill').style.height = `${pct}%`;
            document.getElementById('hudTimerText').textContent = Math.ceil(this.timeLeft);
            if (this.timeLeft <= 0) this.submitAnswer(false);
        }, 100);
    },

    async submitAnswer(isCorrect, btnIndex = -1) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (!isCorrect && this.powerUpEffects.shield) { isCorrect = true; this.powerUpEffects.shield = false; UIManager.toast('SCUDO! 🛡️', 'success'); }

        document.querySelectorAll('.duel-opt-btn').forEach((b, i) => {
            b.disabled = true;
            if (i === btnIndex) b.classList.add(isCorrect ? 'correct' : 'wrong');
        });

        if (isCorrect) {
            let pts = 10 + Math.floor(this.timeLeft / 3);
            if (this.powerUpEffects.doubleXP) { pts *= 2; this.powerUpEffects.doubleXP = false; }
            this.score += pts;
            this.streak++;
            if (this.streak % 3 === 0) this.unlockPowerUp();
            this.createParticles(btnIndex);
        } else {
            this.streak = 0;
            document.getElementById('duelArenaSection').classList.add('shake');
            setTimeout(() => document.getElementById('duelArenaSection').classList.remove('shake'), 400);
        }

        this.currentIndex++;
        this.renderDuelProgress();
        await supabaseClient.from('quiz_players').update({ score: this.score, current_question_index: this.currentIndex }).eq('room_id', this.currentRoom.id).eq('username', this.playerName);
        setTimeout(() => this.currentIndex >= this.questions.length ? this.finishDuel() : this.renderQuestion(), 1000);
    },

    renderLobby() {
        const me = this.players.find(p => p.username === this.playerName);
        const opponent = this.players.find(p => p.username !== this.playerName);
        if (me) document.getElementById('myLobbyCard').innerHTML = `<div class="player-card is-me"><span>👑</span><b>${me.username} (Tu)</b><span class="status-ready ${me.is_ready ? 'ready' : ''}">${me.is_ready ? 'Pronto' : 'In attesa'}</span></div>`;
        if (opponent) document.getElementById('oppLobbyCard').innerHTML = `<div class="player-card"><span>⚔️</span><b>${opponent.username}</b><span class="status-ready ${opponent.is_ready ? 'ready' : ''}">${opponent.is_ready ? 'Pronto' : 'In attesa'}</span></div>`;
        document.getElementById('lobbyPlayerStatus').innerHTML = opponent ? 'Sfidante trovato!' : 'In attesa di sfidanti...';
        const startBtn = document.getElementById('startDuelBtn');
        if (startBtn) startBtn.disabled = !this.isHost || !opponent;
    },

    renderDuelProgress() {
        const me = this.players.find(p => p.username === this.playerName);
        const opponent = this.players.find(p => p.username !== this.playerName);
        if (me) { document.getElementById('hudMeScore').textContent = `${me.score} pt`; document.getElementById('hudMeStreak').textContent = '🔥'.repeat(Math.min(5, this.streak)); }
        if (opponent) {
            document.getElementById('hudOppName').textContent = opponent.username;
            document.getElementById('hudOppScore').textContent = `${opponent.score} pt`;
            if (opponent.active_powerup === 'freeze' && !this.frozenLocally) this.applyFreezeEffect();
        }
        document.getElementById('duelProgressBars').innerHTML = this.players.map(p => {
            const pct = (p.current_question_index / this.questions.length) * 100;
            return `<div class="opponent-progress"><span>${p.username} ${Math.round(pct)}%</span><div class="opp-bar-bg"><div class="opp-bar-fill" style="width: ${pct}%"></div></div></div>`;
        }).join('');
    },

    async finishDuel() {
        document.getElementById('duelArenaSection').classList.add('hidden');
        document.getElementById('duelResultsSection').classList.remove('hidden');
        const ranked = [...this.players].sort((a, b) => b.score - a.score);
        const podium = document.getElementById('duelPodium');
        if (podium) {
            const steps = [ranked[1] || { username: '-', score: 0 }, ranked[0], ranked[2] || { username: '-', score: 0 }];
            podium.innerHTML = steps.map((p, i) => `<div class="podium-step ${['second', 'first', 'third'][i]}"><span class="podium-rank">#${[2, 1, 3][i]}</span><span>${p.username}</span><span>${p.score} PT</span></div>`).join('');
        }
        document.getElementById('duelResultsStats').innerHTML = ranked.map((p, i) => `<div class="result-row">#${i + 1} ${p.username} <b>${p.score} PT</b></div>`).join('');
        if (typeof GamificationManager !== 'undefined') GamificationManager.addXP(50 + this.score, 'Duello Completato');
    },

    unlockPowerUp() {
        const t = ['freeze', 'shield', 'double'][Math.floor(Math.random() * 3)];
        document.getElementById(`powerup_${t}`)?.classList.add('active');
        this.activePowerUps.push(t);
        UIManager.toast(`SBLOCCATO: ${t.toUpperCase()}! ⚡`, 'success');
    },

    async usePowerUp(type) {
        if (!this.activePowerUps.includes(type)) return;
        document.getElementById(`powerup_${type}`)?.classList.remove('active');
        if (type === 'double') this.powerUpEffects.doubleXP = true;
        else if (type === 'shield') this.powerUpEffects.shield = true;
        else if (type === 'freeze') await this.syncPowerUp('freeze');
        this.activePowerUps = this.activePowerUps.filter(p => p !== type);
    },

    async syncPowerUp(type) {
        await supabaseClient.from('quiz_players').update({ active_powerup: type }).eq('room_id', this.currentRoom.id).eq('username', this.playerName);
        if (type === 'freeze') setTimeout(() => supabaseClient.from('quiz_players').update({ active_powerup: null }).eq('room_id', this.currentRoom.id).eq('username', this.playerName), 5000);
    },

    applyFreezeEffect() {
        this.frozenLocally = true;
        UIManager.toast('CONGELATO! ❄️', 'error');
        document.querySelector('.duel-timer-orb').style.borderColor = '#60a5fa';
        setTimeout(() => { this.frozenLocally = false; document.querySelector('.duel-timer-orb').style.borderColor = '#fbbf24'; }, 5000);
    },

    createParticles(btnIndex) {
        const btn = document.querySelectorAll('.duel-opt-btn')[btnIndex];
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        for (let i = 0; i < 10; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = (rect.left + rect.width / 2) + 'px';
            p.style.top = (rect.top + rect.height / 2) + 'px';
            p.style.setProperty('--x', (Math.random() * 200 - 100) + 'px');
            p.style.setProperty('--y', (Math.random() * 200 - 100) + 'px');
            p.style.animation = 'particleFly 0.6s ease-out forwards';
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 600);
        }
    }
};
