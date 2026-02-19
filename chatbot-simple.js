// ============================================
// SMART CHATBOT — App Navigator & Action Engine
// Full AI assistant with intent detection, grade/task adding,
// free flashcard generation, smart date parsing, and app navigation.
// ============================================

const SimpleChatbot = {
    isOpen: false,
    apiUrl: '',
    currentGeneratedNotes: null,
    history: [],
    recognition: null,
    isJarvisMode: false,
    synth: window.speechSynthesis,

    // ── ITALIAN DAY NAMES → js getDay() values ──
    DAYS_IT: {
        'lunedì': 1, 'lunedi': 1,
        'martedì': 2, 'martedi': 2,
        'mercoledì': 3, 'mercoledi': 3,
        'giovedì': 4, 'giovedi': 4,
        'venerdì': 5, 'venerdi': 5,
        'sabato': 6,
        'domenica': 0
    },

    // ── SUBJECT ALIASES (Italian school subjects) ──
    SUBJECT_ALIASES: {
        'italiano': 'Italiano', 'ita': 'Italiano',
        'matematica': 'Matematica', 'mate': 'Matematica', 'mat': 'Matematica',
        'inglese': 'Inglese', 'eng': 'Inglese',
        'storia': 'Storia',
        'filosofia': 'Filosofia', 'filo': 'Filosofia',
        'scienze': 'Scienze',
        'fisica': 'Fisica',
        'chimica': 'Chimica',
        'latino': 'Latino',
        'greco': 'Greco',
        'arte': 'Arte', 'storia dell\'arte': 'Arte',
        'educazione fisica': 'Ed. Fisica', 'motoria': 'Ed. Fisica', 'ginnastica': 'Ed. Fisica',
        'informatica': 'Informatica', 'info': 'Informatica',
        'geografia': 'Geografia', 'geo': 'Geografia',
        'musica': 'Musica',
        'religione': 'Religione',
        'diritto': 'Diritto',
        'economia': 'Economia',
        'francese': 'Francese',
        'spagnolo': 'Spagnolo',
        'tedesco': 'Tedesco',
    },

    init() {
        console.log('✅ Smart Chatbot inizializzato');
        const toggle = document.getElementById('geminiChatToggle');
        const sendBtn = document.querySelector('#geminiChatInput button');
        const input = document.getElementById('chatInputField');
        const inputGroup = document.getElementById('geminiChatInput');

        // JARVIS MODE BUTTON
        if (inputGroup) {
            const micBtn = document.createElement('button');
            micBtn.id = 'jarvisToggleBtn';
            micBtn.innerHTML = '🎙️';
            micBtn.style.cssText = `
                background: var(--bg-secondary); border: 1px solid var(--border);
                border-radius: 50%; width: 40px; height: 40px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                margin-right: 8px; transition: all 0.2s; font-size: 18px;
            `;
            micBtn.title = "Attiva Jarvis Mode (Vocale)";

            // Insert before text input
            inputGroup.insertBefore(micBtn, input);

            micBtn.addEventListener('click', () => this.toggleJarvis());
        }

        if (toggle) toggle.addEventListener('click', () => this.toggle());
        const closeBtn = document.getElementById('closeChatBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.toggle());
        if (sendBtn) sendBtn.addEventListener('click', () => this.send());
        if (input) input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.send();
        });

        this.initVoice();
    },

    initVoice() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.lang = 'it-IT';
            this.recognition.interimResults = false;

            this.recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                console.log('🎤 Jarvis heard:', text);
                const input = document.getElementById('chatInputField');
                if (input) {
                    input.value = text;
                    this.send(); // Auto-send
                }
            };

            this.recognition.onend = () => {
                const btn = document.getElementById('jarvisToggleBtn');
                if (this.isJarvisMode && btn) {
                    // Stay active? Or stop? For now, simplistic toggle.
                    btn.classList.remove('jarvis-active');
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Jarvis Error:', event.error);
                this.toggleJarvis(false); // Force stop
            };
        } else {
            console.warn('Web Speech API not supported');
        }
    },

    toggleJarvis(forceState = null) {
        const btn = document.getElementById('jarvisToggleBtn');
        if (!this.recognition) {
            alert('Il tuo browser non supporta i comandi vocali.');
            return;
        }

        this.isJarvisMode = forceState !== null ? forceState : !this.isJarvisMode;

        if (this.isJarvisMode) {
            this.recognition.start();
            btn.classList.add('jarvis-active');
            btn.innerHTML = '🛑';

            // Play sound
            this.speak('Sono in ascolto.');
        } else {
            this.recognition.stop();
            btn.classList.remove('jarvis-active');
            btn.innerHTML = '🎙️';
            window.speechSynthesis.cancel();
        }
    },

    speak(text) {
        if (!this.isJarvisMode) return;

        // Remove markdown for speech
        const cleanText = text.replace(/[*_#`]/g, '');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'it-IT';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        window.speechSynthesis.speak(utterance);
    },

    toggle() {
        const win = document.getElementById('geminiChatWindow');
        if (!win) return;
        this.isOpen = !this.isOpen;
        win.style.display = this.isOpen ? 'flex' : 'none';
        if (this.isOpen && this.history.length === 0) this.displayWelcomeMessage();
    },

    displayWelcomeMessage() {
        const messages = document.getElementById('geminiChatMessages');
        if (!messages) return;

        const welcomeBubble = document.createElement('div');
        welcomeBubble.className = 'chat-bubble ai';
        welcomeBubble.innerHTML = this.formatMarkdown(`
            👋 **Ciao! Sono il tuo Assistente AI.**<br><br>
            Ecco cosa posso fare per te:<br><br>
            🧭 **Naviga**: _"Portami ai voti"_, _"Apri le note"_<br>
            📝 **Appunti**: _"Spiegami la Rivoluzione Francese"_<br>
            🎴 **Flashcard**: _"Crea 5 flashcard sulla fotosintesi"_ (anche senza appunti!)<br>
            📊 **Voti**: _"Aggiungimi un 7 in italiano"_<br>
            📋 **Compiti**: _"Il prof ha assegnato esercizio 45 per mercoledì"_<br>
            ❓ **Domande**: _"Cos'è il DNA?"_<br><br>
            *Come posso aiutarti?*
        `);
        messages.appendChild(welcomeBubble);
        this.history.push({ role: 'ai', content: 'Welcome message displayed.' });
    },

    formatMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    },

    async send() {
        const input = document.getElementById('chatInputField');
        const messages = document.getElementById('geminiChatMessages');
        if (!input || !messages) return;

        const text = input.value.trim();
        if (!text) return;

        // User bubble
        const userBubble = document.createElement('div');
        userBubble.className = 'chat-bubble user';
        userBubble.textContent = text;
        messages.appendChild(userBubble);
        messages.scrollTop = messages.scrollHeight;
        this.history.push({ role: 'user', content: text });
        input.value = '';
        input.focus();

        // Track interaction in Supabase (non-blocking)
        if (typeof incrementChatbotStat === 'function') incrementChatbotStat();

        // SPLIT COMMANDS: "fai questo POI fai quello"
        // Split by "poi", "dopo", "e" (and), "then"
        const commands = text.split(/\s+(?:poi|dopo|e|and|then)\s+/i);

        for (const cmd of commands) {
            if (!cmd.trim()) continue;
            await this.processCommand(cmd.trim(), messages);
            // Small delay between actions for natural feel
            if (commands.length > 1) await new Promise(r => setTimeout(r, 800));
        }
    },

    async processCommand(text, messages) {
        // Detect intent
        const intent = this.detectIntent(text);
        console.log('🧠 Intent detected:', intent.type);

        switch (intent.type) {
            case 'navigate':
                this.handleNavigation(intent, messages);
                break;
            case 'add_grade':
                this.handleAddGrade(intent, messages);
                break;
            case 'add_task':
                this.handleAddTask(intent, messages);
                break;
            case 'create_flashcards_free':
                await this.handleFreeFlashcards(intent, messages);
                break;
            case 'generate_notes':
                await this.generateNotes(text, messages);
                break;
            case 'change_school':
                this.handleSchoolSetting(messages);
                break;
            default:
                await this.callChatAPI(text, messages);
        }
    },

    // ═══════════════════════════════════════════
    // INTENT DETECTION ENGINE
    // ═══════════════════════════════════════════
    detectIntent(message) {
        const lower = message.toLowerCase().trim();

        // 1. NAVIGATION
        const navPatterns = [
            { regex: /(?:porta(?:mi)?|vai|apri|mostra(?:mi)?|vedi)\s+(?:a(?:lle?|i|l)?|le?|i|il|la)?\s*(note|appunti)/i, section: 'notes' },
            { regex: /(?:porta(?:mi)?|vai|apri|mostra(?:mi)?|vedi)\s+(?:a(?:lle?|i|al)?|le?|i|il|la)?\s*(compiti|tasks?|homework)/i, section: 'tasks' },
            { regex: /(?:porta(?:mi)?|vai|apri|mostra(?:mi)?|vedi)\s+(?:a(?:lle?|i|al)?|le?|i|il|la)?\s*(voti|grade|pagella|libretto)/i, section: 'grades' },
            { regex: /(?:porta(?:mi)?|vai|apri|mostra(?:mi)?|vedi)\s+(?:a(?:lle?|i|al)?|le?|i|il|la)?\s*(statistiche|stats?|grafici)/i, section: 'stats' },
            { regex: /(?:porta(?:mi)?|vai|apri|mostra(?:mi)?|vedi)\s+(?:a(?:lle?|i|al)?|le?|i|il|la)?\s*(presenze|assenze|esami)/i, section: 'presences' },
            { regex: /(?:porta(?:mi)?|vai|apri|mostra(?:mi)?|vedi)\s+(?:a(?:lle?|i|al)?|le?|i|il|la)?\s*(impostazioni|settings?|profilo)/i, section: 'settings' },
            { regex: /(?:porta(?:mi)?|vai|apri|mostra(?:mi)?|vedi)\s+(?:a(?:lle?|i|al)?|le?|i|il|la)?\s*(dashboard|home|panoramica)/i, section: 'dashboard' },
        ];
        for (const p of navPatterns) {
            if (p.regex.test(lower)) return { type: 'navigate', section: p.section };
        }

        // 2. ADD GRADE — "aggiungimi un 7 in italiano", "ho preso 8 in mate"
        const gradeMatch = lower.match(/(?:aggiung(?:i(?:mi)?|ere)|mett(?:i(?:mi)?|ere)|ho\s+preso|inseris?c?i?(?:mi)?|segna(?:mi)?)\s+(?:un\s+)?(\d+(?:[.,]\d+)?)\s+(?:in|di|a)\s+(.+)/i);
        if (gradeMatch) {
            const value = parseFloat(gradeMatch[1].replace(',', '.'));
            const rawSubject = gradeMatch[2].trim().replace(/[.!?]+$/, '');
            const subject = this.resolveSubject(rawSubject);
            if (value >= 1 && value <= 30) {
                return { type: 'add_grade', value, subject };
            }
        }

        // 3. ADD TASK — "il prof ha assegnato...", "compiti di... per..."
        const taskPatterns = [
            /(?:il prof(?:essore)?|la prof(?:essoressa)?)\s+(?:ha\s+)?(?:assegnato|dato|detto)\s+(.+)/i,
            /(?:compiti?|homework|eserciz(?:io|i))\s+(?:di\s+)?(.+)/i,
            /(?:fare?|studiare?|completare?|finire?)\s+(.+?)(?:\s+per\s+|$)/i,
        ];
        for (const pattern of taskPatterns) {
            const match = lower.match(pattern);
            if (match) {
                const rawTask = match[1].trim();
                const dateInfo = this.extractDate(lower);
                const subjectInfo = this.extractSubjectFromTask(lower);
                return { type: 'add_task', description: rawTask, date: dateInfo, subject: subjectInfo, originalMessage: message };
            }
        }

        // 4. FREE FLASHCARD — "crea 5 flashcard sulla fotosintesi"
        const flashcardMatch = lower.match(/(?:crea(?:mi)?|genera(?:mi)?|fai(?:mi)?|fammi)\s+(\d+)?\s*flashcard\s+(?:su(?:lla?|llo?|i|gli|le)?|di|riguardo)\s+(.+)/i);
        if (flashcardMatch) {
            const num = parseInt(flashcardMatch[1]) || 5;
            const topic = flashcardMatch[2].trim();
            return { type: 'create_flashcards_free', topic, count: Math.min(num, 20) };
        }
        // Also catch "flashcard su X" without number
        const flashcardMatch2 = lower.match(/flashcard\s+(?:su(?:lla?|llo?|i|gli|le)?|di|riguardo)\s+(.+)/i);
        if (flashcardMatch2) {
            return { type: 'create_flashcards_free', topic: flashcardMatch2[1].trim(), count: 5 };
        }

        // 5. GENERATE NOTES
        if (this.isRequestingNotes(message)) {
            return { type: 'generate_notes' };
        }

        // 6. SCHOOL SETTINGS
        if (/(?:cambia|imposta|setta)\s+(?:tipo\s+)?(?:di\s+)?scuola/i.test(lower) ||
            /(?:sono|vado)\s+(?:all'|al\s?)?(università|uni|liceo|superiori)/i.test(lower)) {
            return { type: 'change_school' };
        }

        // 7. GENERAL CHAT
        return { type: 'general_chat' };
    },

    // ═══════════════════════════════════════════
    // SMART DATE PARSER (Italian)
    // ═══════════════════════════════════════════
    extractDate(text) {
        const lower = text.toLowerCase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // "domani"
        if (/\bdomani\b/.test(lower)) {
            const d = new Date(today);
            d.setDate(d.getDate() + 1);
            return d;
        }
        // "dopodomani"
        if (/\bdopodomani\b/.test(lower)) {
            const d = new Date(today);
            d.setDate(d.getDate() + 2);
            return d;
        }
        // "oggi"
        if (/\boggi\b/.test(lower)) {
            return new Date(today);
        }

        // Day names: "per mercoledì", "entro lunedì", etc.
        for (const [dayName, dayNum] of Object.entries(this.DAYS_IT)) {
            const regex = new RegExp(`\\b${dayName}\\b`, 'i');
            if (regex.test(lower)) {
                const d = new Date(today);
                const currentDay = d.getDay();
                let diff = dayNum - currentDay;
                if (diff <= 0) diff += 7; // Always next occurrence
                d.setDate(d.getDate() + diff);
                return d;
            }
        }

        // Explicit date: "15 marzo", "3/4", "03-04"
        const dateMatch = lower.match(/(\d{1,2})\s*[\/\-]\s*(\d{1,2})/);
        if (dateMatch) {
            const day = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]) - 1;
            const d = new Date(today.getFullYear(), month, day);
            if (d < today) d.setFullYear(d.getFullYear() + 1);
            return d;
        }

        return null;
    },

    resolveSubject(raw) {
        const lower = raw.toLowerCase().trim();
        return this.SUBJECT_ALIASES[lower] || raw.charAt(0).toUpperCase() + raw.slice(1);
    },

    extractSubjectFromTask(text) {
        const lower = text.toLowerCase();
        for (const [alias, name] of Object.entries(this.SUBJECT_ALIASES)) {
            if (lower.includes(alias)) return name;
        }
        return 'Generale';
    },

    // ═══════════════════════════════════════════
    // ACTION HANDLERS
    // ═══════════════════════════════════════════

    // ── NAVIGATION ──
    handleNavigation(intent, messagesDiv) {
        const sectionNames = {
            'dashboard': 'Dashboard',
            'notes': 'Note',
            'tasks': 'Compiti',
            'grades': 'Voti',
            'stats': 'Statistiche',
            'presences': 'Presenze',
            'settings': 'Impostazioni'
        };

        if (typeof showSection === 'function') {
            showSection(intent.section);
        }

        const name = sectionNames[intent.section] || intent.section;
        this.addAIBubble(messagesDiv, `🧭 Ti ho portato alla sezione **${name}**. Serve altro?`);

        // Close chat after a short delay
        setTimeout(() => {
            this.toggle();
        }, 800);
    },

    // ── ADD GRADE ──
    handleAddGrade(intent, messagesDiv) {
        try {
            // Use global loadData to get correct user scope
            const appData = (typeof loadData === 'function') ? loadData() : {};

            if (!appData.grades) appData.grades = [];

            appData.grades.push({
                id: Date.now(),
                subject: intent.subject,
                value: intent.value,
                date: new Date().toISOString().split('T')[0],
                type: 'orale'
            });

            // Use global saveData to sync to cloud
            if (typeof saveData === 'function') {
                saveData(appData);
            } else {
                localStorage.setItem('studyjournal_data', JSON.stringify(appData));
            }

            this.addAIBubble(messagesDiv,
                `✅ Ho aggiunto un **${intent.value}** in **${intent.subject}**! 📊<br><br>` +
                `Vuoi andare alla sezione Voti per vederlo?`
            );

            // Add quick action button
            this.addActionButton(messagesDiv, '📊 Vai ai Voti', () => {
                if (typeof showSection === 'function') showSection('grades');
                this.toggle();
            });

            // Trigger re-render if function exists
            if (typeof renderGrades === 'function') renderGrades();

        } catch (err) {
            this.addAIBubble(messagesDiv, `❌ Errore nell'aggiunta del voto: ${err.message}`);
        }
    },

    // ── ADD TASK ──
    handleAddTask(intent, messagesDiv) {
        try {
            // Use global loadData to get correct user scope
            const appData = (typeof loadData === 'function') ? loadData() : {};

            if (!appData.tasks) appData.tasks = [];

            const task = {
                id: Date.now(),
                subject: intent.subject,
                description: intent.description,
                completed: false,
                createdAt: new Date().toISOString()
            };

            if (intent.date) {
                task.dueDate = intent.date.toISOString().split('T')[0];
            }

            appData.tasks.push(task);
            // Use global saveData to sync to cloud
            if (typeof saveData === 'function') {
                saveData(appData);
            } else {
                localStorage.setItem('studyjournal_data', JSON.stringify(appData));
            }

            const dateStr = intent.date
                ? intent.date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
                : 'senza scadenza';

            this.addAIBubble(messagesDiv,
                `✅ Compito aggiunto!<br><br>` +
                `📋 **${intent.description}**<br>` +
                `📚 Materia: ${intent.subject}<br>` +
                `📅 Scadenza: ${dateStr}`
            );

            this.addActionButton(messagesDiv, '📋 Vai ai Compiti', () => {
                if (typeof showSection === 'function') showSection('tasks');
                this.toggle();
            });

            if (typeof renderTasks === 'function') renderTasks();

        } catch (err) {
            this.addAIBubble(messagesDiv, `❌ Errore nell'aggiunta del compito: ${err.message}`);
        }
    },

    // ── SCHOOL SETTINGS ──
    handleSchoolSetting(messagesDiv) {
        this.addAIBubble(messagesDiv, '🏫 **Che tipo di scuola frequenti?**<br>Questo mi aiuta a darti risposte più adatte.');

        const btnDiv = document.createElement('div');
        btnDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 12px; padding: 0 16px;';

        const makeBtn = (label, val) => {
            const btn = document.createElement('button');
            btn.style.cssText = 'flex:1; padding:8px; background:var(--bg-tertiary); color:var(--text-primary); border:1px solid var(--border); border-radius:8px; cursor:pointer;';
            btn.textContent = label;
            btn.onclick = () => this.setSchoolType(val, messagesDiv);
            return btn;
        };

        btnDiv.appendChild(makeBtn('🎓 Università', 'university'));
        btnDiv.appendChild(makeBtn('🏫 Liceo / Superiori', 'high_school'));
        messagesDiv.appendChild(btnDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },

    setSchoolType(type, messagesDiv) {
        localStorage.setItem('studyjournal_school_type', type);
        const label = type === 'university' ? 'Università' : 'Liceo';
        this.addAIBubble(messagesDiv, `✅ Ho impostato **${label}**. Adatterò le mie risposte!`);
    },

    // ── FREE FLASHCARD GENERATION (without notes) ──
    async handleFreeFlashcards(intent, messagesDiv) {
        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'chat-bubble ai';
        loadingBubble.innerHTML = `⏳ Generando **${intent.count} flashcard** su "${intent.topic}"...`;
        messagesDiv.appendChild(loadingBubble);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        try {
            const response = await fetch(`${this.apiUrl}/api/generate-flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: `Genera flashcard complete e dettagliate sull'argomento: ${intent.topic}. Le flashcard devono coprire i concetti principali, definizioni, date importanti e fatti chiave.`,
                    subject: this.extractSubjectFromTask(intent.topic),
                    numberOfCards: intent.count
                })
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const data = await response.json();
            if (!data.flashcards || data.flashcards.length === 0) throw new Error('Nessuna flashcard generata');

            // Save to Cloud/Local via global helper
            const appData = (typeof loadData === 'function') ? loadData() : {};

            if (!appData.flashcards) appData.flashcards = [];

            let count = 0;
            data.flashcards.forEach(card => {
                if (card.front && card.back) {
                    appData.flashcards.push({
                        id: Date.now() + Math.random(),
                        front: card.front,
                        back: card.back,
                        subject: this.extractSubjectFromTask(intent.topic),
                        correct: 0,
                        incorrect: 0,
                        difficulty: 'medium'
                    });
                    count++;
                }
            });

            if (typeof saveData === 'function') {
                saveData(appData);
            } else {
                localStorage.setItem('studyjournal_data', JSON.stringify(appData));
            }

            loadingBubble.remove();

            // Success message with counter animation
            const successDiv = document.createElement('div');
            successDiv.className = 'chat-bubble ai';
            successDiv.innerHTML = `✅ Ho creato <strong id="fc-count-free">0</strong> flashcard su **"${intent.topic}"**!<br><br>📚 Salvate nella sezione Flashcard.`;
            messagesDiv.appendChild(successDiv);

            let current = 0;
            const counterEl = document.getElementById('fc-count-free');
            const interval = setInterval(() => {
                current++;
                if (counterEl) counterEl.textContent = current;
                if (current >= count) clearInterval(interval);
            }, 80);

            this.addActionButton(messagesDiv, '📚 Vai alle Flashcard', () => {
                if (typeof showSection === 'function') showSection('notes');
                this.toggle();
            });

        } catch (error) {
            loadingBubble.innerHTML = `❌ Errore: ${error.message}`;
        }
    },

    // ═══════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════
    addAIBubble(messagesDiv, html) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ai';
        bubble.innerHTML = this.formatMarkdown(html);
        messagesDiv.appendChild(bubble);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        this.history.push({ role: 'ai', content: html });

        // JARVIS SPEAK
        if (this.isJarvisMode) this.speak(html);
    },

    addActionButton(messagesDiv, label, onClick) {
        const btnDiv = document.createElement('div');
        btnDiv.style.cssText = 'padding: 0 16px; margin-top: 8px;';
        const btn = document.createElement('button');
        btn.style.cssText = `
            width: 100%; padding: 10px 16px;
            background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover, #2563eb));
            color: white; border: none; border-radius: 8px;
            cursor: pointer; font-weight: 500; font-size: 14px;
            transition: all 150ms ease;
        `;
        btn.textContent = label;
        btn.addEventListener('click', onClick);
        btnDiv.appendChild(btn);
        messagesDiv.appendChild(btnDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },

    // ═══════════════════════════════════════════
    // NOTES GENERATION (same as before, but improved)
    // ═══════════════════════════════════════════
    isRequestingNotes(message) {
        const keywords = ['appunti', 'spiega', 'riassumi', 'lezione', 'insegna', 'genera', 'crea', 'scrivi', 'spiegazione', 'resoconto'];
        const lowerMessage = message.toLowerCase();
        const hasKeyword = keywords.some(keyword => lowerMessage.includes(keyword));
        const isGenerative = lowerMessage.includes('su') || lowerMessage.includes('di ') || lowerMessage.includes('brevi') || lowerMessage.includes('completi');
        // Don't trigger if it's a flashcard request
        if (lowerMessage.includes('flashcard')) return false;
        return hasKeyword && isGenerative;
    },

    async generateNotes(userRequest, messagesDiv) {
        const skeletonBubble = document.createElement('div');
        skeletonBubble.className = 'chat-bubble ai';
        skeletonBubble.innerHTML = '⏳ Preparando gli appunti...';
        messagesDiv.appendChild(skeletonBubble);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        try {
            const subject = this.extractSubject(userRequest);
            const prompt = `Crea appunti COMPLETI e BEN STRUTTURATI su: ${subject}

STRUTTURA OBBLIGATORIA:
1. INTRODUZIONE - Definisci chiaramente l'argomento
2. CONCETTI PRINCIPALI - Lista i punti chiave numerati
3. SPIEGAZIONE DETTAGLIATA - Spiega ogni concetto
4. ESEMPI PRATICI - Fornisci almeno 2 esempi reali
5. RIASSUNTO - Sintesi dei punti essenziali

Scrivi in modo CHIARO e EDUCATIVO. Sii PRECISO e COMPLETO.`;

            const response = await fetch(`${this.apiUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, history: [], context: 'Generazione appunti', stream: true })
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            skeletonBubble.remove();

            const aiBubble = document.createElement('div');
            aiBubble.className = 'chat-bubble ai';
            messagesDiv.appendChild(aiBubble);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') continue;
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.text) {
                                fullText += data.text;
                                aiBubble.innerHTML = `📝 <strong>Generando appunti su "${subject}"...</strong><br><br>` + this.formatMarkdown(fullText);
                                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                            }
                        } catch (e) { }
                    }
                }
            }

            this.currentGeneratedNotes = { title: subject, subject: this.determineSubject(subject), content: fullText, generatedAt: new Date().toISOString() };

            // AUTO-SAVE NOTES TO CLOUD
            const appData = (typeof loadData === 'function') ? loadData() : {};
            if (!appData.notes) appData.notes = [];

            appData.notes.push({
                id: Date.now(),
                title: subject,
                subject: this.currentGeneratedNotes.subject,
                content: fullText,
                date: new Date().toISOString()
            });

            if (typeof saveData === 'function') saveData(appData);

            aiBubble.innerHTML = `📝 <strong>Appunti su "${subject}" salvati!</strong><br><br>` + this.formatMarkdown(fullText) + `<br><br><strong>Vuoi che generi flashcard da questi appunti?</strong>`;
            this.history.push({ role: 'ai', content: fullText });
            setTimeout(() => this.addFlashcardButton(messagesDiv), 300);

        } catch (error) {
            skeletonBubble.textContent = '❌ Errore nella generazione. Riprova tra poco.';
        }
    },

    addFlashcardButton(messagesDiv) {
        const buttonDiv = document.createElement('div');
        buttonDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 12px; padding: 0 16px;';
        buttonDiv.innerHTML = `
            <button style="flex:1; padding:10px 16px; background:linear-gradient(135deg,#3b82f6,#2563eb); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:500; font-size:14px;" onclick="SimpleChatbot.askFlashcardQuantity()">✨ Sì, genera</button>
            <button style="padding:10px 16px; background:var(--bg-tertiary); color:var(--text-primary); border:1px solid var(--border); border-radius:8px; cursor:pointer; font-weight:500; font-size:14px;" onclick="SimpleChatbot.skipFlashcards()">No, dopo</button>
        `;
        messagesDiv.appendChild(buttonDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },

    askFlashcardQuantity() {
        const messagesDiv = document.getElementById('geminiChatMessages');
        this.addAIBubble(messagesDiv, '🔢 **Quante flashcard vuoi?**');
        const buttonDiv = document.createElement('div');
        buttonDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 12px; padding: 0 16px;';
        [5, 10, 15].forEach(q => {
            const btn = document.createElement('button');
            btn.style.cssText = 'flex:1; padding:8px 12px; background:var(--bg-tertiary); color:var(--text-primary); border:1px solid var(--border); border-radius:8px; cursor:pointer; font-weight:500;';
            btn.textContent = q;
            btn.addEventListener('click', () => this.generateFlashcards(q));
            buttonDiv.appendChild(btn);
        });
        messagesDiv.appendChild(buttonDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },

    async generateFlashcards(num = 5) {
        if (!this.currentGeneratedNotes) {
            if (typeof UIManager !== 'undefined') await UIManager.alert('❌ Nessun appunto disponibile.', 'Errore');
            return;
        }

        const messagesDiv = document.getElementById('geminiChatMessages');
        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'chat-bubble ai';
        loadingBubble.textContent = '⏳ Generando flashcard...';
        messagesDiv.appendChild(loadingBubble);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        try {
            const response = await fetch(`${this.apiUrl}/api/generate-flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: this.currentGeneratedNotes.content.substring(0, 3000),
                    subject: this.currentGeneratedNotes.subject || 'Generale',
                    numberOfCards: num
                })
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const data = await response.json();
            if (!data.flashcards || data.flashcards.length === 0) throw new Error('Nessuna flashcard generata');

            // Save to Cloud/Local via global helper
            const appData = (typeof loadData === 'function') ? loadData() : {};
            if (!appData.flashcards) appData.flashcards = [];

            let count = 0;
            data.flashcards.forEach(card => {
                if (card.front && card.back) {
                    appData.flashcards.push({
                        id: Date.now() + Math.random(), front: card.front, back: card.back,
                        subject: this.currentGeneratedNotes.subject, correct: 0, incorrect: 0, difficulty: 'medium'
                    });
                    count++;
                }
            });

            if (typeof saveData === 'function') {
                saveData(appData);
            } else {
                localStorage.setItem('studyjournal_data', JSON.stringify(appData));
            }
            loadingBubble.remove();

            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-bubble ai';
            messageDiv.innerHTML = `✅ Ho creato <strong id="flashcard-count">${count}</strong> flashcard!<br><br>📚 Salvate nella sezione Flashcard.`;
            messagesDiv.appendChild(messageDiv);

            this.addActionButton(messagesDiv, '📚 Vai alle Flashcard', () => {
                if (typeof showSection === 'function') showSection('notes');
                this.toggle();
            });

            this.currentGeneratedNotes = null;

        } catch (error) {
            loadingBubble.textContent = '❌ Errore: ' + error.message;
        }
    },

    skipFlashcards() {
        const messagesDiv = document.getElementById('geminiChatMessages');
        this.addAIBubble(messagesDiv, 'Ok! Puoi generare flashcard in qualsiasi momento. Come posso aiutarti? 😊');
        this.currentGeneratedNotes = null;
    },

    // ═══════════════════════════════════════════
    // CHAT API (streaming)
    // ═══════════════════════════════════════════
    async callChatAPI(message, messagesDiv) {
        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'chat-bubble ai';
        loadingBubble.textContent = '⏳ Pensando...';
        messagesDiv.appendChild(loadingBubble);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        try {
            const schoolType = localStorage.getItem('studyjournal_school_type') || 'high_school';
            const contextStr = `Tipo di scuola: ${schoolType === 'university' ? 'Università' : 'Liceo'}. Ruolo: Tutor scolastico amichevole. Rispondi in italiano.`;
            const historyPayload = this.history.slice(0, -1).slice(-6);

            const response = await fetch(`${this.apiUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history: historyPayload, context: contextStr, stream: true })
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);
            loadingBubble.remove();

            const aiBubble = document.createElement('div');
            aiBubble.className = 'chat-bubble ai';
            messagesDiv.appendChild(aiBubble);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') continue;
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.text) {
                                fullText += data.text;
                                aiBubble.innerHTML = this.formatMarkdown(fullText);
                                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                            }
                        } catch (e) { }
                    }
                }
            }

            // JARVIS SPEAK (Streaming complete)
            if (this.isJarvisMode) this.speak(fullText);

            this.history.push({ role: 'ai', content: fullText });
        } catch (error) {
            loadingBubble.textContent = '❌ Errore. Riprova tra qualche secondo.';
        }
    },

    // ═══════════════════════════════════════════
    // SUBJECT HELPERS
    // ═══════════════════════════════════════════
    extractSubject(message) {
        const patterns = [
            /su\s+([^\.]+)/i, /di\s+([^\.]+)/i, /appunti[:\s]+([^\.]+)/i,
            /spiega(?:mi)?\s+(?:tutto\s+)?su\s+([^\.]+)/i, /lezione\s+su\s+([^\.]+)/i,
        ];
        for (let pattern of patterns) {
            const match = message.match(pattern);
            if (match && match[1]) return match[1].trim();
        }
        return message.replace(/genera|crea|scrivi|appunti|su|riassumi|spiega|brevi/gi, '').trim() || 'Argomento';
    },

    determineSubject(title) {
        const subjects = {
            'matematica': ['calcolo', 'algebra', 'geometria', 'numero', 'equazione'],
            'storia': ['guerra', 're', 'imperatore', 'rivoluzione', 'storia'],
            'inglese': ['english', 'verb', 'tense', 'grammar'],
            'italiano': ['dante', 'petrarca', 'boccaccio', 'letteratura'],
            'scienze': ['fisica', 'chimica', 'biologia', 'atomo', 'cellula', 'sistema', 'solare']
        };

        const lowerTitle = title.toLowerCase();
        for (let [subject, keywords] of Object.entries(subjects)) {
            if (keywords.some(keyword => lowerTitle.includes(keyword))) return subject;
        }
        return 'Generale';
    },

    // ═══════════════════════════════════════════
    // FILE UPLOAD — PDF & TXT Import
    // ═══════════════════════════════════════════
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        event.target.value = '';

        const messagesDiv = document.getElementById('geminiChatMessages');
        const fileName = file.name;
        const ext = fileName.split('.').pop().toLowerCase();

        const userBubble = document.createElement('div');
        userBubble.className = 'chat-bubble user';
        userBubble.textContent = `📎 ${fileName}`;
        messagesDiv.appendChild(userBubble);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'chat-bubble ai';
        loadingBubble.innerHTML = `⏳ Elaborando <strong>${fileName}</strong>...`;
        messagesDiv.appendChild(loadingBubble);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        try {
            let text = '';

            if (ext === 'txt') {
                text = await file.text();
            } else if (ext === 'pdf') {
                text = await this.extractPDFText(file);
            } else {
                throw new Error(`Formato .${ext} non supportato. Usa PDF o TXT.`);
            }

            if (!text || text.trim().length < 10) {
                throw new Error('Il file sembra vuoto o non contiene testo leggibile.');
            }

            let appData = {};
            try { const saved = localStorage.getItem('studyjournal_data'); if (saved) appData = JSON.parse(saved); } catch (e) { }
            if (!appData.notes) appData.notes = [];

            const noteTitle = fileName.replace(/\.[^/.]+$/, '');
            const subject = this.determineSubject(noteTitle);

            appData.notes.push({
                id: Date.now(),
                title: noteTitle,
                content: text.substring(0, 10000),
                subject: subject,
                createdAt: new Date().toISOString(),
                source: 'file_import'
            });

            localStorage.setItem('studyjournal_data', JSON.stringify(appData));
            loadingBubble.remove();

            this.addAIBubble(messagesDiv,
                `✅ File importato con successo!<br><br>` +
                `📄 **${noteTitle}**<br>` +
                `📚 Materia: ${subject}<br>` +
                `📝 ${text.length} caratteri estratti<br><br>` +
                `Vuoi che generi **flashcard** da questi appunti?`
            );

            this.currentGeneratedNotes = { title: noteTitle, subject, content: text.substring(0, 3000), generatedAt: new Date().toISOString() };
            setTimeout(() => this.addFlashcardButton(messagesDiv), 300);

            this.addActionButton(messagesDiv, '📚 Vai alle Note', () => {
                if (typeof showSection === 'function') showSection('notes');
                this.toggle();
            });

        } catch (error) {
            loadingBubble.innerHTML = `❌ Errore: ${error.message}`;
        }
    },

    async extractPDFText(file) {
        if (typeof pdfjsLib === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Impossibile caricare il lettore PDF.'));
                document.head.appendChild(script);
            });
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }

        return fullText.trim();
    }
};

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SimpleChatbot.init());
} else {
    SimpleChatbot.init();
}