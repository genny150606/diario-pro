/* ============================================
   UI MANAGER - CUSTOM MODALS & ALERTS
   Replaces native browser alerts with custom Glass UI
   ============================================ */

if (typeof window.UIManager === 'undefined') {
    window.UIManager = {
        // === ALERT ===
        alert(message, title = 'Avviso') {
            return new Promise((resolve) => {
                const modal = document.getElementById('alertModal');
                const titleEl = document.getElementById('alertTitle');
                const msgEl = document.getElementById('alertMessage');
                const okBtn = document.getElementById('alertOkBtn');

                if (!modal) {
                    window.alert(message);
                    resolve();
                    return;
                }

                titleEl.textContent = title;
                msgEl.textContent = message;
                modal.style.display = 'flex';
                modal.classList.add('active');

                const newOkBtn = okBtn.cloneNode(true);
                okBtn.parentNode.replaceChild(newOkBtn, okBtn);

                newOkBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                    modal.classList.remove('active');
                    resolve();
                });

                newOkBtn.focus();
            });
        },

        // === CONFIRM ===
        confirm(message, title = 'Conferma Azione') {
            return new Promise((resolve) => {
                const modal = document.getElementById('confirmModal');
                const titleEl = document.getElementById('confirmTitle');
                const msgEl = document.getElementById('confirmMessage');
                const okBtn = document.getElementById('confirmOkBtn');
                const cancelBtn = document.getElementById('confirmCancelBtn');

                if (!modal) {
                    resolve(window.confirm(message));
                    return;
                }

                titleEl.textContent = title;
                msgEl.innerHTML = message.replace(/\n/g, '<br>');
                modal.style.display = 'flex';
                modal.classList.add('active');

                const newOkBtn = okBtn.cloneNode(true);
                const newCancelBtn = cancelBtn.cloneNode(true);
                okBtn.parentNode.replaceChild(newOkBtn, okBtn);
                cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

                newOkBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                    modal.classList.remove('active');
                    resolve(true);
                });

                newCancelBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                    modal.classList.remove('active');
                    resolve(false);
                });

                newCancelBtn.focus();
            });
        },

        // === STUDY STREAK ===
        updateStreak() {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const lastVisit = localStorage.getItem('lastVisitDate');
            let streak = parseInt(localStorage.getItem('studyStreak') || '0');

            if (lastVisit === today) {
                this.renderStreak(streak);
                return streak;
            }

            if (lastVisit) {
                const lastDate = new Date(lastVisit);
                const diffTime = Math.abs(now - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    streak++;
                } else if (diffDays > 1) {
                    streak = 1;
                }
            } else {
                streak = 1;
            }

            localStorage.setItem('studyStreak', streak);
            localStorage.setItem('lastVisitDate', today);
            this.renderStreak(streak);
            return streak;
        },

        renderStreak(streak) {
            const streakContainer = document.getElementById('streakContainer');
            if (!streakContainer) return;

            if (streak > 0) {
                streakContainer.innerHTML = `
                    <div class="streak-badge active" title="Serie di studio: ${streak} giorni">
                        <span class="streak-fire">🔥</span>
                        <span class="streak-count">${streak}</span>
                    </div>
                `;
                streakContainer.classList.add('active');
            } else {
                streakContainer.innerHTML = '';
                streakContainer.classList.remove('active');
            }
        },

        // === DAILY CHALLENGES ===
        initDailyChallenges() {
            const container = document.getElementById('dailyChallengesContainer');
            if (!container) return;

            const challenges = [
                { id: 'notes', name: 'Scrivi 3 nuove note', icon: '📝', reward: '+50 XP' },
                { id: 'flashcards', name: 'Crea 5 flashcard', icon: '🎴', reward: '+100 XP' },
                { id: 'duel', name: 'Partecipa a un Duello AI', icon: '⚔️', reward: '+150 XP' }
            ];

            let html = `
            <div class="daily-challenges-widget">
                <div class="challenge-header">
                    <div class="header-text">
                        <h3>🎯 Sfide del Giorno</h3>
                        <p class="challenge-subtitle">Guadagna XP extra completando le missioni</p>
                    </div>
                </div>
                <div class="challenge-list">
        `;

            challenges.forEach(c => {
                html += `
                <div class="challenge-item" id="challenge-${c.id}">
                    <div class="challenge-icon-box">${c.icon}</div>
                    <div class="challenge-info">
                        <div class="challenge-name">${c.name}</div>
                        <div class="challenge-reward">${c.reward}</div>
                    </div>
                    <div class="challenge-check-badge">✓</div>
                </div>
            `;
            });

            html += `</div></div>`;
            container.innerHTML = html;
        },

        // === TOGGLE POPOVER ===
        toggleGamification() {
            const popup = document.getElementById('gamificationPopup');
            if (popup) {
                popup.classList.toggle('active');
            }
        }
    };

    // Auto-init features
    window.addEventListener('DOMContentLoaded', () => {
        if (window.UIManager) { // Simplified check as UIManager is defined above
            window.UIManager.updateStreak();
            window.UIManager.initDailyChallenges();
        }
    });
}
