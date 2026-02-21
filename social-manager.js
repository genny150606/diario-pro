/* ============================================
   SOCIAL MANAGER - FRIENDSHIPS & CHALLENGES
   ============================================ */

window.SocialManager = {
    friends: [],
    pendingRequests: [],
    invitations: [],
    isPolling: false,

    async init() {
        if (!AuthManager.user) return;

        // Ensure user has a username in users_data
        await this.syncUsername();

        this.startPolling();
        this.loadSocialData();
        this.setupClickOutside();
    },

    setupClickOutside() {
        document.addEventListener('click', (e) => {
            const container = document.querySelector('.search-container-relative');
            const searchResults = document.getElementById('searchResults');
            if (container && !container.contains(e.target)) {
                console.log("🎯 Clicked outside search. Closing menu.");
                if (searchResults) searchResults.innerHTML = '';
            }
        });
    },

    async syncUsername() {
        const email = AuthManager.user.email;
        const defaultName = email.split('@')[0];

        const { data, error } = await supabaseClient
            .from('users_data')
            .select('username')
            .eq('id', AuthManager.user.id)
            .single();

        if (!data?.username) {
            console.log("✍️ Setting default username:", defaultName);
            await supabaseClient
                .from('users_data')
                .upsert({
                    id: AuthManager.user.id,
                    username: defaultName,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
        }
    },

    async loadSocialData() {
        await Promise.all([
            this.loadFriends(),
            this.loadPendingRequests()
        ]);
        this.renderSocialUI();
    },

    async loadFriends() {
        // FK DISAMBIGUATION: Use users_data!column_name to resolve ambiguity
        const { data, error } = await supabaseClient
            .from('friendships')
            .select('id,sender_id,receiver_id,status,sender:users_data!sender_id(username),receiver:users_data!receiver_id(username)')
            .or(`sender_id.eq.${AuthManager.user.id},receiver_id.eq.${AuthManager.user.id}`)
            .eq('status', 'accepted');

        if (error) {
            console.error("❌ Friends Fetch Error:", error.message, error.details, error.hint);
            console.error("Full Error Object:", error);
            return;
        }

        this.friends = data.map(f => {
            const isSender = f.sender_id === AuthManager.user.id;
            return {
                id: f.id,
                friendId: isSender ? f.receiver_id : f.sender_id,
                username: isSender ? f.receiver.username : f.sender.username
            };
        });
    },

    async loadPendingRequests() {
        console.log("📥 Loading pending requests for:", AuthManager.user.id);
        const { data, error } = await supabaseClient
            .from('friendships')
            .select('id,sender_id,receiver_id,status,sender:users_data!sender_id(username)')
            .eq('receiver_id', AuthManager.user.id)
            .eq('status', 'pending');

        if (error) {
            console.error("❌ Pending Requests Error:", error);
            return;
        }

        console.log("📥 Pending Requests found:", data?.length || 0);
        this.pendingRequests = data || [];
    },

    async searchUsers() {
        const input = document.getElementById('userSearchInput');
        if (!input) return;

        const query = input.value.trim();
        console.log("🔍 Search Query:", query);

        if (query.length < 3) {
            const container = document.getElementById('searchResults');
            if (container) container.innerHTML = '';
            return;
        }

        const { data, error } = await supabaseClient
            .from('users_data')
            .select('id, username')
            .ilike('username', `%${query}%`)
            .neq('id', AuthManager.user.id)
            .limit(5);

        if (error) console.error("❌ Search Error:", error);
        console.log("📊 Search Results:", data);

        this.renderSearchResults(data || []);
    },

    async sendFriendRequest(event, receiverId) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        console.log("🚀 START sendFriendRequest to:", receiverId);

        if (!AuthManager.user || !AuthManager.user.id) {
            console.error("❌ No user logged in!");
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('friendships')
                .insert([{
                    sender_id: AuthManager.user.id,
                    receiver_id: receiverId,
                    status: 'pending'
                }]);

            if (error) {
                console.error("❌ Supabase Request Error:", error);
                if (error.code === '23505') {
                    UIManager.alert("Richiesta di amicizia già inviata a questo utente!");
                } else {
                    UIManager.alert("Errore nell'invio della richiesta: " + (error.message || "Errore sconosciuto"));
                }
            } else {
                console.log("✅ Request sent successfully!");
                await UIManager.alert("Richiesta inviata con successo!", "Successo");
                const container = document.getElementById('searchResults');
                if (container) container.innerHTML = ''; // Close menu on success
            }
        } catch (err) {
            console.error("❌ Catch Error in sendFriendRequest:", err);
            UIManager.alert("Errore imprevisto durante l'invio della richiesta.");
        }
    },

    async acceptFriendRequest(requestId) {
        await supabaseClient
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', requestId);

        this.loadSocialData();
    },

    // ── CHALLENGE LOGIC ──
    async challengeFriend(friendId, friendName) {
        // 1. Create a room first (reusing DuelManager logic)
        const roomCode = await DuelManager.createRoom(true);
        if (!roomCode) return;

        // 2. Send invitation
        const { error } = await supabaseClient
            .from('duel_invitations')
            .insert([{
                host_id: AuthManager.user.id,
                host_name: (AuthManager.user.email.split('@')[0]),
                guest_id: friendId,
                room_code: roomCode,
                status: 'pending'
            }]);

        if (error) console.error("Challenge Error:", error);
        else UIManager.alert(`Sfida inviata a ${friendName}! Attendi...`);
    },

    startPolling() {
        if (this.isPolling) return;
        this.isPolling = true;

        setInterval(async () => {
            console.log("🔄 Background Social Refresh...");
            await this.loadSocialData();

            // Poll for duel invitations (already handled by loadSocialData? No, separate table)
            const { data: invs } = await supabaseClient
                .from('duel_invitations')
                .select('*')
                .eq('guest_id', AuthManager.user.id)
                .eq('status', 'pending')
                .limit(1);

            if (invs && invs.length > 0) {
                console.log("🎮 New challenge detected!");
                this.handleIncomingInvitation(invs[0]);
            }
        }, 10000); // Poll every 10s for performance
    },

    async handleIncomingInvitation(inv) {
        const accept = await UIManager.confirm(
            `🎮 SFIDA DA ${inv.host_name.toUpperCase()}!`,
            `Vuoi accettare il duello?`
        );

        if (accept) {
            await supabaseClient
                .from('duel_invitations')
                .update({ status: 'accepted' })
                .eq('id', inv.id);

            // Auto join room
            DuelManager.joinRoom(inv.room_code);
        } else {
            await supabaseClient
                .from('duel_invitations')
                .update({ status: 'rejected' })
                .eq('id', inv.id);
        }
    },

    // ── UI RENDERING ──
    renderSocialUI() {
        const friendsList = document.getElementById('friendsList');
        const requestsList = document.getElementById('pendingRequestsList');

        if (!friendsList) return;

        console.log("🎨 Current Friends:", this.friends.length);
        console.log("🎨 Current Pending:", this.pendingRequests.length);

        friendsList.innerHTML = this.friends.length ? this.friends.map(f => `
            <div class="social-item">
                <div class="user-info">
                    <span class="user-avatar">👤</span>
                    <span class="username">${f.username || 'Utente'}</span>
                </div>
                <button class="challenge-btn" onclick="SocialManager.challengeFriend('${f.friendId}', '${f.username || 'Utente'}')">⚔️ SFIDA</button>
            </div>
        `).join('') : '<p class="empty-state">Nessun amico ancora.</p>';

        requestsList.innerHTML = this.pendingRequests.length ? this.pendingRequests.map(r => `
            <div class="social-item pending">
                <span>Richiesta da: <strong>${r.sender?.username || 'Sconosciuto'}</strong></span>
                <div class="actions">
                    <button class="accept-btn" onclick="SocialManager.acceptFriendRequest('${r.id}')">✅ Accetta</button>
                </div>
            </div>
        `).join('') : '<p class="empty-state">Nessuna richiesta in attesa.</p>';
    },

    renderSearchResults(users) {
        console.log("🎨 Rendering results:", users);
        const container = document.getElementById('searchResults');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = '<div class="search-result-item"><span>Nessun utente trovato</span></div>';
            return;
        }

        container.innerHTML = users.map(u => `
            <div class="search-result-item">
                <span>${u.username}</span>
                <button 
                    style="cursor: pointer !important; pointer-events: auto !important;"
                    onclick="SocialManager.sendFriendRequest(event, '${u.id}')"
                    onmouseover="console.log('👆 Hover detected on button for ${u.username}')">
                    ➕ Aggiungi
                </button>
            </div>
        `).join('');
    }
};
