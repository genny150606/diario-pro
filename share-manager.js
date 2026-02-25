/* ============================================
   SHARE MANAGER — Resource Sharing System
   Send notes/flashcards to friends
   ============================================ */

const ShareManager = {
    pendingResource: null,
    pendingResourceType: null,

    // ── STEP 3: Open Share Modal ──
    openShareModal(resourceType, resourceId) {
        const data = loadData();
        let resource = null;

        if (resourceType === 'note') {
            const notes = data.notes || [];
            resource = notes.find(n => n.id === resourceId);
        } else if (resourceType === 'flashcard') {
            const flashcards = data.flashcards || [];
            resource = flashcards.find(f => f.id === resourceId);
        }

        if (!resource) {
            UIManager.toast('Risorsa non trovata', 'error');
            return;
        }

        this.pendingResource = resource;
        this.pendingResourceType = resourceType;

        // Render friends list in modal
        const listContainer = document.getElementById('shareFriendsList');
        if (!listContainer) return;

        const friends = (window.SocialManager && SocialManager.friends) || [];

        if (friends.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">Nessun amico disponibile. Aggiungi amici dalla sezione Social.</p>';
        } else {
            listContainer.innerHTML = friends.map(f => `
                <div class="share-friend-item" onclick="ShareManager.sendResource('${f.friendId}', '${(f.username || 'Utente').replace(/'/g, "\\'")}')">
                    <div class="share-friend-info">
                        <i data-lucide="user"></i>
                        <span>${f.username || 'Utente'}</span>
                    </div>
                    <i data-lucide="send" class="share-send-icon"></i>
                </div>
            `).join('');
        }

        // Show modal
        const modal = document.getElementById('shareResourceModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }

        if (window.lucide) lucide.createIcons();
    },

    closeShareModal() {
        const modal = document.getElementById('shareResourceModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        this.pendingResource = null;
        this.pendingResourceType = null;
    },

    // ── STEP 3: Send Resource ──
    async sendResource(friendId, friendName) {
        try {
            if (!this.pendingResource || !this.pendingResourceType) {
                UIManager.toast('Nessuna risorsa selezionata', 'error');
                return;
            }

            if (!AuthManager || !AuthManager.user) {
                UIManager.toast('Devi essere autenticato', 'error');
                return;
            }

            const { error } = await supabaseClient
                .from('shared_resources')
                .insert([{
                    sender_id: AuthManager.user.id,
                    receiver_id: friendId,
                    resource_type: this.pendingResourceType,
                    resource_data: this.pendingResource
                }]);

            if (error) throw error;

            this.closeShareModal();
            UIManager.toast(`Risorsa inviata a ${friendName}!`, 'success');

        } catch (err) {
            console.error('Share error:', err);
            UIManager.toast('Errore nell\'invio: ' + (err.message || 'Sconosciuto'), 'error');
        }
    },

    // ── STEP 4: Fetch Inbox ──
    async fetchInbox() {
        const container = document.getElementById('sharedInboxList');
        if (!container) return;

        if (!AuthManager || !AuthManager.user) {
            container.innerHTML = '<p class="empty-state">Accedi per vedere le risorse ricevute.</p>';
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('shared_resources')
                .select('*, sender:users_data!sender_id(username)')
                .eq('receiver_id', AuthManager.user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<p class="empty-state">Nessuna risorsa in arrivo.</p>';
                return;
            }

            // Update badge count
            const badge = document.getElementById('inboxBadge');
            if (badge) {
                badge.textContent = data.length;
                badge.style.display = data.length > 0 ? 'flex' : 'none';
            }

            container.innerHTML = data.map(item => {
                const iconName = item.resource_type === 'note' ? 'file-text' : 'layers';
                const typeLabel = item.resource_type === 'note' ? 'Nota' : 'Flashcard';
                const title = item.resource_data?.title || item.resource_data?.front || typeLabel;
                const senderName = item.sender?.username || 'Utente';

                return `
                    <div class="inbox-item card">
                        <div class="inbox-item-info">
                            <div class="inbox-item-icon">
                                <i data-lucide="${iconName}"></i>
                            </div>
                            <div>
                                <span class="inbox-item-title">${title}</span>
                                <span class="inbox-item-sender">Da <strong>${senderName}</strong> &middot; ${typeLabel}</span>
                            </div>
                        </div>
                        <div class="inbox-item-actions">
                            <button class="btn-secondary btn-small" onclick="ShareManager.rejectResource('${item.id}')">
                                <i data-lucide="x"></i>
                            </button>
                            <button class="btn-primary btn-small" onclick="ShareManager.acceptResource('${item.id}')">
                                <i data-lucide="download"></i> Salva
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            if (window.lucide) lucide.createIcons();

        } catch (err) {
            console.error('Inbox fetch error:', err);
            container.innerHTML = '<p class="empty-state">Errore nel caricamento.</p>';
        }
    },

    // ── STEP 4: Accept Resource ──
    async acceptResource(shareId) {
        try {
            // 1. Fetch the shared resource
            const { data: shared, error: fetchError } = await supabaseClient
                .from('shared_resources')
                .select('*')
                .eq('id', shareId)
                .single();

            if (fetchError) throw fetchError;
            if (!shared) throw new Error('Risorsa non trovata');

            // 2. Inject into local data
            const appData = loadData();

            if (shared.resource_type === 'note') {
                if (!appData.notes) appData.notes = [];
                const newNote = {
                    ...shared.resource_data,
                    id: Date.now(),
                    date: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                };
                appData.notes.push(newNote);
                NotesManager.data = appData.notes;
            } else if (shared.resource_type === 'flashcard') {
                if (!appData.flashcards) appData.flashcards = [];
                const newCard = {
                    ...shared.resource_data,
                    id: Date.now(),
                    correct: 0,
                    incorrect: 0
                };
                appData.flashcards.push(newCard);
                FlashcardManager.data = appData.flashcards;
            }

            saveData(appData);

            // 3. Update status to 'saved'
            await supabaseClient
                .from('shared_resources')
                .update({ status: 'saved' })
                .eq('id', shareId);

            // 4. Refresh UI
            this.fetchInbox();
            if (shared.resource_type === 'note' && typeof UIManagerExtensions !== 'undefined') {
                UIManagerExtensions.renderNotes();
            }

            UIManager.toast('Risorsa salvata con successo!', 'success');

        } catch (err) {
            console.error('Accept error:', err);
            UIManager.toast('Errore nel salvataggio: ' + (err.message || 'Sconosciuto'), 'error');
        }
    },

    // ── Reject Resource ──
    async rejectResource(shareId) {
        try {
            await supabaseClient
                .from('shared_resources')
                .update({ status: 'rejected' })
                .eq('id', shareId);

            this.fetchInbox();
            UIManager.toast('Risorsa rifiutata', 'warning');

        } catch (err) {
            console.error('Reject error:', err);
        }
    }
};
