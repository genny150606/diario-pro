const DuelManager = {
    currentRoom: null,
    players: [],
    questions: [],
    currentIndex: 0,
    score: 0,
    isHost: false,
    playerName: null,
    pollInterval: null,
    countdownRunning: false, // Prevents dual countdowns
    gameStarted: false,      // High-level lock

    // ── SPATIAL STATE ──
    currentSource: 'subject',
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

    async createRoom() {
        const createBtn = document.getElementById('duelCreateBtn');
        createBtn.disabled = true;
        createBtn.innerHTML = '🧠 <span class="loading-dots">Generazione Arena...</span>';

        try {
            let subject = 'Generale';
            let context = '';
            if (this.currentSource === 'subject') {
                subject = document.getElementById('duelSubjectInput').value || 'Cultura Generale';
            } else if (this.currentSource === 'notes') {
                const select = document.getElementById('duelNoteSelect');
                if (!select.value) throw new Error('Seleziona una nota!');
                subject = select.options[select.selectedIndex].text;
                context = select.options[select.selectedIndex].dataset.content;
            } else if (this.currentSource === 'pdf') {
                context = document.getElementById('duelManualText').value;
                if (!context.trim()) throw new Error('Carica un documento o incolla il testo!');
                subject = 'Dall\'ultimo PDF';
            }

            const code = Math.random().toString(36).substring(2, 6).toUpperCase();
            const apiBase = window.location.protocol === 'file:' ? 'https://diario-pro.vercel.app' : '';
            const response = await fetch(`${apiBase}/api/generate-duel-quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, context })
            });

            const { quiz } = await response.json();
            if (!quiz || quiz.length === 0) throw new Error("L'AI non ha generato domande. Riprova.");

            const { data: room, error } = await supabaseClient.from('quiz_rooms').insert([{ code, subject, ai_data: quiz, status: 'waiting' }]).select().single();
            if (error) throw error;

            this.currentRoom = room;
            this.isHost = true;
            this.questions = quiz;

            document.getElementById('duelCreateForm').classList.add('hidden');
            document.getElementById('duelWaitingLobby').classList.remove('hidden');
            document.getElementById('roomCodeDisplay').textContent = code;

            this.playerName = (AuthManager.user?.email?.split('@')[0] || 'Guerriero').trim();
            await this.joinPlayer(room.id, this.playerName);
            this.subscribeToRoom(room.id);
        } catch (err) {
            console.error('Create error:', err);
            UIManager.alert(err.message, 'Errore Arena');
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = 'GENERA ARENA ⚡';
        }
    },

    async joinRoom(code) {
        if (!code) return UIManager.alert('Inserisci il codice!', 'Attenzione');
        try {
            const { data: room, error } = await supabaseClient.from('quiz_rooms').select('*').eq('code', code.toUpperCase().trim()).maybeSingle();
            if (error) throw error;
            if (!room) throw new Error(`Codice ${code} non trovato.`);
            if (room.status !== 'waiting') throw new Error(`L'Arena è già attiva!`);

            this.currentRoom = room;
            this.isHost = false;
            this.playerName = (AuthManager.user?.email?.split('@')[0] || 'Sfidante').trim();
            this.questions = room.ai_data;

            document.getElementById('duelCreateForm').classList.add('hidden');
            document.getElementById('duelWaitingLobby').classList.remove('hidden');
            document.getElementById('roomCodeDisplay').textContent = room.code;

            await this.joinPlayer(room.id, this.playerName);
            this.subscribeToRoom(room.id);
        } catch (err) {
            UIManager.alert(err.message, 'Entrata Fallita');
        }
    },

    async joinPlayer(roomId, username) {
        if (!roomId) return;
        await supabaseClient.from('quiz_players').insert([{ room_id: roomId, username, score: 0, is_ready: false }]);
    },

    subscribeToRoom(roomId) {
        if (!roomId) return;
        if (this.pollInterval) clearInterval(this.pollInterval);

        const pollData = async () => {
            const [roomRes, playersRes] = await Promise.all([
                supabaseClient.from('quiz_rooms').select('*').eq('id', roomId).single(),
                supabaseClient.from('quiz_players').select('*').eq('room_id', roomId).order('created_at', { ascending: true })
            ]);

            if (!roomRes.data || !playersRes.data) return;

            this.players = playersRes.data;
            this.currentRoom = roomRes.data;

            if (this.currentRoom.status === 'abandoned') return this.handleOpponentLeft();

            // FIX: Robust check for countdown
            if (this.currentRoom.status === 'active' && !this.gameStarted && !this.countdownRunning) {
                this.scheduleStart();
            }

            this.renderLobby();
            this.checkReadyStatus();
            this.syncArenaState();

            if (this.isHost && this.currentRoom.status === 'waiting') this._checkAndLaunchDuel();
        };

        pollData();
        this.pollInterval = setInterval(pollData, 1500);
    },

    checkReadyStatus() {
        if (this.gameStarted) return;
        const opponent = this.players.find(p => p.username !== this.playerName);
        const me = this.players.find(p => p.username === this.playerName);
        if (opponent?.is_ready && me && !me.is_ready && !this.inviting) {
            this.inviting = true;
            UIManager.confirm(`⚔️ ${opponent.username} è pronto a sfidarti! Iniziamo?`, 'PREPARATI').then(yes => {
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
        if (this.players.length > 1 && this.players.every(p => p.is_ready) && !this.gameStarted) {
            await supabaseClient.from('quiz_rooms').update({ status: 'active' }).eq('id', this.currentRoom.id);
        }
    },

    scheduleStart() {
        if (this.countdownRunning) return;
        this.countdownRunning = true;
        this.gameStarted = true;

        // Reset UI for battle
        document.getElementById('duelWaitingLobby').classList.add('hidden');
        const countdownOverlay = document.getElementById('arenaCountdownOverlay');
        const countdownVal = document.getElementById('arenaCountdownValue');

        countdownOverlay.classList.add('active');

        let count = 3;
        countdownVal.textContent = count;

        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                countdownVal.textContent = count;
            } else if (count === 0) {
                countdownVal.textContent = 'VIA!';
            } else {
                clearInterval(timer);
                countdownOverlay.classList.remove('active');
                this.countdownRunning = false;
                setTimeout(() => this.startQuizSession(), 500);
            }
        }, 1000);
    },

    startQuizSession() {
        this.currentIndex = 0;
        this.score = 0;
        this.streak = 0;

        document.getElementById('duelArenaOverlay').classList.add('active');
        this.renderQuestion();
    },

    renderQuestion() {
        const q = this.questions[this.currentIndex];
        if (!q) return;

        document.getElementById('arenaQuestionText').textContent = q.question;
        const grid = document.getElementById('arenaOptionsGrid');
        grid.innerHTML = '';

        q.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'arena-option-btn';
            btn.innerHTML = `<span class="opt-key">${String.fromCharCode(65 + i)}</span> <span>${opt}</span>`;
            btn.onclick = () => this.submitAnswer(i === q.answer, i);
            grid.appendChild(btn);
        });

        this.startQuestionTimer();
    },

    startQuestionTimer() {
        this.timeLeft = this.maxTime;
        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            if (!this.frozenLocally) this.timeLeft -= 0.1;

            document.getElementById('arenaTimerValue').textContent = Math.ceil(this.timeLeft);

            // Visual feedback on timer close to zero
            if (this.timeLeft < 4) document.getElementById('arenaTimerValue').style.color = '#ef4444';
            else document.getElementById('arenaTimerValue').style.color = '#fff';

            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.submitAnswer(false);
            }
        }, 100);
    },

    async submitAnswer(isCorrect, btnIndex = -1) {
        if (this.timerInterval) clearInterval(this.timerInterval);

        if (!isCorrect && this.powerUpEffects.shield) {
            isCorrect = true;
            this.powerUpEffects.shield = false;
            UIManager.toast('SCUDO ATTIVO! 🛡️', 'success');
        }

        const buttons = document.querySelectorAll('.arena-option-btn');
        buttons.forEach((btn, i) => {
            btn.disabled = true;
            if (i === btnIndex) {
                btn.classList.add(isCorrect ? 'correct' : 'wrong');
            }
        });

        if (isCorrect) {
            let pts = 10 + Math.floor(this.timeLeft / 2);
            if (this.powerUpEffects.doubleXP) { pts *= 2; this.powerUpEffects.doubleXP = false; }
            this.score += pts;
            this.streak++;
            if (this.streak % 3 === 0) this.unlockPowerUp();
        } else {
            this.streak = 0;
            document.getElementById('duelArenaOverlay').classList.add('shake');
            setTimeout(() => document.getElementById('duelArenaOverlay').classList.remove('shake'), 400);
        }

        // Sync to DB
        this.currentIndex++;
        await supabaseClient.from('quiz_players').update({ score: this.score, current_question_index: this.currentIndex }).eq('room_id', this.currentRoom.id).eq('username', this.playerName);

        setTimeout(() => {
            if (this.currentIndex >= this.questions.length) {
                this.finishDuel();
            } else {
                this.renderQuestion();
            }
        }, 1200);
    },

    renderLobby() {
        const me = this.players.find(p => p.username === this.playerName);
        const opponent = this.players.find(p => p.username !== this.playerName);

        const lobbyMe = document.getElementById('myLobbyCard');
        const lobbyOpp = document.getElementById('oppLobbyCard');

        if (me) lobbyMe.innerHTML = `<div class="player-card is-me"><i data-lucide="crown"></i><b>${me.username} (Tu)</b><span class="status-ready ${me.is_ready ? 'ready' : ''}">${me.is_ready ? 'Pronto' : 'In attesa'}</span></div>`;
        if (opponent) lobbyOpp.innerHTML = `<div class="player-card"><i data-lucide="user"></i><b>${opponent.username}</b><span class="status-ready ${opponent.is_ready ? 'ready' : ''}">${opponent.is_ready ? 'Pronto' : 'In attesa'}</span></div>`;

        document.getElementById('lobbyPlayerStatus').innerHTML = opponent
            ? '<i data-lucide="zap" style="width:16px;height:16px;display:inline;vertical-align:-2px;"></i> Sfidante in posizione!'
            : '<div class="duel-waiting-spinner" style="width:1rem;height:1rem;display:inline-block;vertical-align:-3px;"></div> In attesa di uno sfidante...';

        if (window.lucide) lucide.createIcons();

        const startBtn = document.getElementById('startDuelBtn');
        if (startBtn) startBtn.disabled = !this.isHost || !opponent;
    },

    syncArenaState() {
        if (!this.gameStarted) return;
        const me = this.players.find(p => p.username === this.playerName);
        const opponent = this.players.find(p => p.username !== this.playerName);

        if (me) {
            document.getElementById('arenaMeName').textContent = `${me.username} (Tu)`;
            document.getElementById('arenaMeScore').textContent = `${me.score} pt`;
        }
        if (opponent) {
            document.getElementById('arenaOppName').textContent = opponent.username;
            document.getElementById('arenaOppScore').textContent = `${opponent.score} pt`;
            if (opponent.active_powerup === 'freeze' && !this.frozenLocally) this.applyFreezeEffect();
        }
    },

    async finishDuel() {
        const overlay = document.getElementById('duelArenaOverlay');
        overlay.classList.remove('active');

        document.getElementById('duelResultsSection').classList.remove('hidden');

        const ranked = [...this.players].sort((a, b) => b.score - a.score);
        const podium = document.getElementById('duelPodium');
        if (podium) {
            const steps = [ranked[1] || { username: '-', score: 0 }, ranked[0], ranked[2] || { username: '-', score: 0 }];
            podium.innerHTML = steps.map((p, i) => `<div class="podium-step ${['second', 'first', 'third'][i]}"><span class="podium-rank">#${[2, 1, 3][i]}</span><span>${p.username}</span><span>${p.score} PT</span></div>`).join('');
        }
        document.getElementById('duelResultsStats').innerHTML = ranked.map((p, i) => `<div class="result-row">#${i + 1} ${p.username} <b>${p.score} PT</b></div>`).join('');

        if (typeof GamificationManager !== 'undefined') {
            GamificationManager.addXP(50 + this.score, 'Vittoria in Arena ⚔️');
        }

        if (this.pollInterval) clearInterval(this.pollInterval);
    },

    unlockPowerUp() {
        const t = ['freeze', 'shield', 'double'][Math.floor(Math.random() * 3)];
        const puNode = document.getElementById(`pu_${t}`);
        if (puNode) {
            puNode.classList.add('active');
            UIManager.toast(`✨ SBLOCCATO: ${t.toUpperCase()}!`, 'success');
        }
        this.activePowerUps.push(t);
    },

    async usePowerUp(type) {
        if (!this.activePowerUps.includes(type)) return;

        document.getElementById(`pu_${type}`)?.classList.remove('active');

        if (type === 'double') this.powerUpEffects.doubleXP = true;
        else if (type === 'shield') this.powerUpEffects.shield = true;
        else if (type === 'freeze') await this.syncPowerUp('freeze');

        this.activePowerUps = this.activePowerUps.filter(p => p !== type);
    },

    async syncPowerUp(type) {
        await supabaseClient.from('quiz_players').update({ active_powerup: type }).eq('room_id', this.currentRoom.id).eq('username', this.playerName);
        if (type === 'freeze') {
            setTimeout(() => supabaseClient.from('quiz_players').update({ active_powerup: null }).eq('room_id', this.currentRoom.id).eq('username', this.playerName), 5000);
        }
    },

    applyFreezeEffect() {
        this.frozenLocally = true;
        UIManager.toast('CONGELATO! ❄️', 'error');
        const ring = document.querySelector('.arena-timer-ring');
        if (ring) {
            ring.style.borderColor = '#60a5fa';
            ring.style.boxShadow = '0 0 30px #60a5fa';
        }
        setTimeout(() => {
            this.frozenLocally = false;
            if (ring) {
                ring.style.borderColor = 'rgba(255,255,255,0.1)';
                ring.style.boxShadow = '0 0 30px rgba(0,0,0,0.5)';
            }
        }, 5000);
    },

    handleOpponentLeft() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        if (this.timerInterval) clearInterval(this.timerInterval);

        // Award victory points to remaining player
        const bonusPoints = 100;
        this.score += bonusPoints;

        // Sync final score to DB
        if (this.currentRoom) {
            supabaseClient.from('quiz_players')
                .update({ score: this.score })
                .eq('room_id', this.currentRoom.id)
                .eq('username', this.playerName)
                .then(() => { });
        }

        UIManager.alert(
            `🏆 L'avversario si è ritirato per manifesta inferiorità!\nHai vinto a tavolino con +${bonusPoints} punti bonus!\n\nPunteggio finale: ${this.score} PT`,
            'Vittoria per Abbandono ⚔️'
        ).then(() => {
            this.resetArena();
        });
    },

    skipQuestion() {
        if (this.timerInterval) clearInterval(this.timerInterval);

        const penalty = 5;
        this.score = Math.max(0, this.score - penalty);
        this.streak = 0;
        this.currentIndex++;

        // Visual feedback
        if (typeof UIManager !== 'undefined') {
            UIManager.toast(`⏭️ Domanda saltata (-${penalty} pt)`, 'warning');
        }

        // Sync to DB
        if (this.currentRoom) {
            supabaseClient.from('quiz_players')
                .update({ score: this.score, current_question_index: this.currentIndex })
                .eq('room_id', this.currentRoom.id)
                .eq('username', this.playerName);
        }

        // Next question or end
        if (this.currentIndex >= this.questions.length) {
            this.finishDuel();
        } else {
            this.renderQuestion();
        }
    },

    async exitDuel() {
        const confirmed = await UIManager.confirm(
            '🚪 Sei sicuro di voler abbandonare lo scontro?\nL\'avversario vincerà automaticamente.',
            'Abbandona Arena'
        );
        if (!confirmed) return;

        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.pollInterval) clearInterval(this.pollInterval);

        // Mark room as abandoned in DB
        if (this.currentRoom) {
            await supabaseClient.from('quiz_rooms')
                .update({ status: 'abandoned' })
                .eq('id', this.currentRoom.id);
        }

        this.resetArena();
        UIManager.toast('Hai abbandonato l\'arena', 'error');
    },

    resetArena() {
        // Close all overlays
        const arenaOverlay = document.getElementById('duelArenaOverlay');
        const countdownOverlay = document.getElementById('arenaCountdownOverlay');
        if (arenaOverlay) arenaOverlay.classList.remove('active');
        if (countdownOverlay) countdownOverlay.classList.remove('active');

        // Reset state
        this.currentRoom = null;
        this.players = [];
        this.questions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.isHost = false;
        this.gameStarted = false;
        this.countdownRunning = false;
        this.streak = 0;
        this.activePowerUps = [];
        this.powerUpEffects = { doubleXP: false, shield: false };
        this.frozenLocally = false;

        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.pollInterval) clearInterval(this.pollInterval);

        // Show lobby again
        const createForm = document.getElementById('duelCreateForm');
        const waitingLobby = document.getElementById('duelWaitingLobby');
        const resultsSection = document.getElementById('duelResultsSection');
        if (createForm) createForm.classList.remove('hidden');
        if (waitingLobby) waitingLobby.classList.add('hidden');
        if (resultsSection) resultsSection.classList.add('hidden');

        // Navigate back to dashboard
        if (typeof showSection === 'function') showSection('dashboard');
    }
};
