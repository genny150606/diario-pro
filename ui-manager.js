/* ============================================
   UI MANAGER - CUSTOM MODALS & ALERTS
   Replaces native browser alerts with custom Glass UI
   ============================================ */

const UIManager = {
    // === ALERT ===
    alert(message, title = 'Avviso') {
        return new Promise((resolve) => {
            const modal = document.getElementById('alertModal');
            const titleEl = document.getElementById('alertTitle');
            const msgEl = document.getElementById('alertMessage');
            const okBtn = document.getElementById('alertOkBtn');

            if (!modal) {
                // Fallback if modal HTML is missing
                window.alert(message);
                resolve();
                return;
            }

            titleEl.textContent = title;
            msgEl.textContent = message;
            modal.style.display = 'flex';

            // Clean up previous listeners to avoid duplicates
            const newOkBtn = okBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newOkBtn, okBtn);

            newOkBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                resolve();
            });

            // Focus button for accessibility
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
                // Fallback
                resolve(window.confirm(message));
                return;
            }

            titleEl.textContent = title;
            msgEl.innerHTML = message.replace(/\n/g, '<br>'); // Support newlines
            modal.style.display = 'flex';

            // Clone buttons to clear listeners
            const newOkBtn = okBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newOkBtn, okBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            newOkBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                resolve(true);
            });

            newCancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                resolve(false);
            });

            // Focus cancel by default for safety
            newCancelBtn.focus();
        });
    }
};

// Make it global if needed, though 'const' does not attach to window automatically in modules, 
// strictly speaking in non-module scripts it's global.
window.UIManager = UIManager;
