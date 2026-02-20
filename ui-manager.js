/* ============================================
   UI MANAGER - CUSTOM MODALS & ALERTS
   Replaces native browser alerts with custom Glass UI
   ============================================ */

// Prevent redeclaration error
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
        }
    };

    // Make it global if needed, though 'const' does not attach to window automatically in modules, 
    // strictly speaking in non-module scripts it's global.
    window.UIManager = UIManager;
