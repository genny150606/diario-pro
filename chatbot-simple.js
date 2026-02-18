// Chatbot COMPLETO con Smart Features (Appunti + Flashcard)

const SimpleChatbot = {
    isOpen: false,
    apiUrl: '', // Relative path because backend is on same domain in Vercel
    currentGeneratedNotes: null,
    history: [],

    init() {
        console.log('✅ Chatbot inizializzato con smart features');
        const toggle = document.getElementById('geminiChatToggle');
        const sendBtn = document.querySelector('#geminiChatInput button');
        const input = document.getElementById('chatInputField');

        if (toggle) toggle.addEventListener('click', () => this.toggle());

        const closeBtn = document.getElementById('closeChatBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.toggle());

        if (sendBtn) sendBtn.addEventListener('click', () => this.send());
        if (input) input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.send();
        });

        console.log('✅ Event listeners aggiunti');
    },

    toggle() {
        console.log('🔄 Toggle chat...');
        const window = document.getElementById('geminiChatWindow');
        if (!window) {
            console.error('❌ geminiChatWindow non trovato!');
            return;
        }
        this.isOpen = !this.isOpen;
        window.style.display = this.isOpen ? 'flex' : 'none';
        console.log('💬 Chat:', this.isOpen ? 'APERTO' : 'CHIUSO');
    },

    send() {
        const input = document.getElementById('chatInputField');
        const messages = document.getElementById('geminiChatMessages');

        if (!input || !messages) {
            console.error('❌ Input o messages non trovati!');
            return;
        }

        const text = input.value.trim();
        if (!text) return;

        console.log('📤 Messaggio:', text);

        // Mostra messaggio utente
        const userBubble = document.createElement('div');
        userBubble.className = 'chat-bubble user';
        userBubble.textContent = text;
        messages.appendChild(userBubble);
        messages.scrollTop = messages.scrollHeight;

        this.history.push({ role: 'user', content: text });
        input.value = '';
        input.focus();

        // Controlla se chiede appunti
        if (this.isRequestingNotes(text)) {
            console.log('📝 Richiesta di appunti rilevata');
            this.generateNotes(text, messages);
        } else {
            console.log('💬 Chat normale');
            this.callChatAPI(text, messages);
        }
    },

    isRequestingNotes(message) {
        const keywords = [
            'appunti', 'spiega', 'riassumi', 'lezione', 'insegna',
            'genera', 'crea', 'scrivi', 'spiegazione', 'resoconto'
        ];
        const lowerMessage = message.toLowerCase();
        const hasKeyword = keywords.some(keyword => lowerMessage.includes(keyword));
        const isGenerative = lowerMessage.includes('su') || lowerMessage.includes('di ') ||
            lowerMessage.includes('brevi') || lowerMessage.includes('completi');

        return hasKeyword && isGenerative;
    },

    async generateNotes(userRequest, messagesDiv) {
        // Mostra skeleton loading
        const skeletonBubble = document.createElement('div');
        skeletonBubble.className = 'chat-bubble ai';
        skeletonBubble.innerHTML = '⏳ Generando appunti...';
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

            console.log('🔄 Generando appunti...');

            const response = await fetch(`${this.apiUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: prompt,
                    history: [],
                    context: 'Generazione appunti'
                })
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const data = await response.json();
            const content = data.reply;

            if (!content || content.length < 50) {
                throw new Error('Contenuto generato troppo breve');
            }

            console.log('✅ Appunti generati');

            // Salva appunti e mostra risposta
            this.currentGeneratedNotes = {
                title: subject,
                subject: this.determineSubject(subject),
                content: content,
                generatedAt: new Date().toISOString()
            };

            skeletonBubble.remove();

            const aiBubble = document.createElement('div');
            aiBubble.className = 'chat-bubble ai';
            aiBubble.innerHTML = `📝 <strong>Ho creato gli appunti su "${subject}"!</strong><br><br>` +
                `<strong>Vuoi che generi automaticamente delle flashcard da questi appunti?</strong>`;
            messagesDiv.appendChild(aiBubble);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            this.history.push({ role: 'ai', content: aiBubble.innerHTML });

            // Aggiungi pulsante flashcard
            setTimeout(() => this.addFlashcardButton(messagesDiv), 300);

        } catch (error) {
            console.error('❌ Errore appunti:', error.message);
            skeletonBubble.textContent = '❌ Errore: ' + error.message;
        }
    },

    addFlashcardButton(messagesDiv) {
        const buttonDiv = document.createElement('div');
        buttonDiv.style.cssText = `
            display: flex;
            gap: 8px;
            margin-top: 12px;
            padding: 0 16px;
        `;

        buttonDiv.innerHTML = `
            <button style="
                flex: 1;
                padding: 10px 16px;
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: all 150ms ease;
            " onclick="SimpleChatbot.generateFlashcards()">
                ✨ Genera Flashcard
            </button>
            <button style="
                padding: 10px 16px;
                background: var(--bg-tertiary);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: all 150ms ease;
            " onclick="SimpleChatbot.skipFlashcards()">
                Dopo
            </button>
        `;

        messagesDiv.appendChild(buttonDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },

    async generateFlashcards() {
        if (!this.currentGeneratedNotes) {
            alert('❌ Nessun appunto disponibile');
            return;
        }

        const messagesDiv = document.getElementById('geminiChatMessages');
        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'chat-bubble ai';
        loadingBubble.textContent = '⏳ Generando flashcard...';
        messagesDiv.appendChild(loadingBubble);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        try {
            console.log('🔄 Generando flashcard...');

            const response = await fetch(`${this.apiUrl}/api/generate-flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: this.currentGeneratedNotes.content.substring(0, 3000),
                    subject: this.currentGeneratedNotes.subject || 'Generale',
                    numberOfCards: 5
                })
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const data = await response.json();

            if (!data.flashcards || data.flashcards.length === 0) {
                throw new Error('Nessuna flashcard generata');
            }

            console.log(`✅ ${data.flashcards.length} flashcard generate`);

            // Salva nel database
            let appData = {};
            try {
                const savedData = localStorage.getItem('studyjournal_data');
                if (savedData) appData = JSON.parse(savedData);
            } catch (e) {
                console.warn('⚠️ Errore lettura localStorage');
            }

            if (!appData.flashcards) appData.flashcards = [];

            let count = 0;
            data.flashcards.forEach(card => {
                if (card.front && card.back) {
                    appData.flashcards.push({
                        id: Date.now() + Math.random(),
                        front: card.front,
                        back: card.back,
                        subject: this.currentGeneratedNotes.subject,
                        correct: 0,
                        incorrect: 0,
                        difficulty: 'medium'
                    });
                    count++;
                }
            });

            localStorage.setItem('studyjournal_data', JSON.stringify(appData));
            console.log(`💾 ${count} flashcard salvate`);

            // Mostra successo con counter
            loadingBubble.remove();

            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                background: var(--bg-tertiary);
                padding: 16px;
                border-radius: 12px;
                border-left: 4px solid var(--accent);
                margin: 8px 0;
            `;
            messageDiv.innerHTML = `✅ Ho creato <strong id="flashcard-count">0</strong> flashcard!<br><br>📚 Sono salve nella sezione Flashcards.`;
            messagesDiv.appendChild(messageDiv);

            // Anima il counter
            let current = 0;
            const interval = setInterval(() => {
                current++;
                document.getElementById('flashcard-count').textContent = current;
                if (current >= count) clearInterval(interval);
            }, 100);

            // Pulsante vai alle flashcard
            setTimeout(() => {
                const btnDiv = document.createElement('div');
                btnDiv.style.cssText = 'padding: 0 16px; margin-top: 8px;';
                btnDiv.innerHTML = `
                    <button style="
                        width: 100%;
                        padding: 10px 16px;
                        background: linear-gradient(135deg, #ec4899, #f472b6);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 150ms ease;
                    " onclick="document.getElementById('geminiChatToggle').click(); setTimeout(() => document.querySelector('[onclick*=showSection]') && showSection('notes'), 300);">
                        📚 Vai alle Flashcard
                    </button>
                `;
                messagesDiv.appendChild(btnDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 500);

            this.currentGeneratedNotes = null;

        } catch (error) {
            console.error('❌ Errore flashcard:', error.message);
            loadingBubble.textContent = '❌ Errore: ' + error.message;
        }
    },

    skipFlashcards() {
        const messagesDiv = document.getElementById('geminiChatMessages');
        const aiBubble = document.createElement('div');
        aiBubble.className = 'chat-bubble ai';
        aiBubble.textContent = 'Ok! Puoi generare flashcard in qualsiasi momento. Come posso aiutarti? 😊';
        messagesDiv.appendChild(aiBubble);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        this.currentGeneratedNotes = null;
    },

    async callChatAPI(message, messagesDiv) {
        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'chat-bubble ai';
        loadingBubble.textContent = '⏳ Caricamento...';
        messagesDiv.appendChild(loadingBubble);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        try {
            console.log('🚀 Chiamo API chat');

            // Recupera contesto
            const schoolType = localStorage.getItem('studyjournal_school_type') || 'high_school';
            const contextStr = `Tipo di scuola: ${schoolType === 'university' ? 'Università' : 'Liceo'}. Ruolo: Tutor scolastico amichevole.`;

            // Escludi l'ultimo messaggio (quello corrente) dalla history per evitare duplicati se il backend lo aggiunge
            const historyPayload = this.history.slice(0, -1).slice(-6);

            const response = await fetch(`${this.apiUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    history: historyPayload,
                    context: contextStr
                })
            });

            console.log('📥 Status:', response.status);

            if (!response.ok) throw new Error(`Error ${response.status}`);

            const data = await response.json();
            const reply = data.reply || 'Nessuna risposta';

            console.log('✅ Risposta ricevuta');

            loadingBubble.remove();

            const aiBubble = document.createElement('div');
            aiBubble.className = 'chat-bubble ai';
            aiBubble.innerHTML = reply
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            messagesDiv.appendChild(aiBubble);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            this.history.push({ role: 'ai', content: reply });

        } catch (error) {
            console.error('❌ Errore API:', error.message);
            loadingBubble.textContent = '❌ Errore: ' + error.message;
        }
    },

    extractSubject(message) {
        const patterns = [
            /su\s+([^\.]+)/i,
            /di\s+([^\.]+)/i,
            /appunti[:\s]+([^\.]+)/i,
            /spiega(?:mi)?\s+(?:tutto\s+)?su\s+([^\.]+)/i,
            /lezione\s+su\s+([^\.]+)/i,
        ];

        for (let pattern of patterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
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
            if (keywords.some(keyword => lowerTitle.includes(keyword))) {
                return subject;
            }
        }

        return 'Generale';
    }
};

// Inizializza
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        SimpleChatbot.init();
    });
} else {
    SimpleChatbot.init();
}