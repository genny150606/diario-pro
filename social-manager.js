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
            await supabaseClient
                .from('users_data')
                .update({ username: defaultName })
                .eq('id', AuthManager.user.id);
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
        const { data, error } = await supabaseClient
            .from('friendships')
            .select(`
                id,
                sender_id,
                receiver_id,
                status,
                sender:sender_id(username),
                receiver:receiver_id(username)
            `)
            .or(`sender_id.eq.${AuthManager.user.id},receiver_id.eq.${AuthManager.user.id}`)
            .eq('status', 'accepted');

        if (error) return console.error("Friends Error:", error);

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
        const { data, error } = await supabaseClient
            .from('friendships')
            .select('*, sender:sender_id(username)')
            .eq('receiver_id', AuthManager.user.id)
            .eq('status', 'pending');

        this.pendingRequests = data || [];
    },

    async searchUsers() {
        const input = document.getElementById('userSearchInput');
        if (!input) return;

        const query = input.value.trim();
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

        this.renderSearchResults(data || []);
    },

    async sendFriendRequest(receiverId) {
        const { error } = await supabaseClient
            .from('friendships')
            .insert([{
                sender_id: AuthManager.user.id,
                receiver_id: receiverId,
                status: 'pending'
            }]);

        if (error) {
            if (error.code === '23505') UIManager.alert("Richiesta già inviata!");
            else console.error(error);
        } else {
            UIManager.alert("Richiesta inviata!", "Successo");
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
            // Poll for invitations
            const { data: invs } = await supabaseClient
                .from('duel_invitations')
                .select('*')
                .eq('guest_id', AuthManager.user.id)
                .eq('status', 'pending')
                .limit(1);

            if (invs && invs.length > 0) {
                this.handleIncomingInvitation(invs[0]);
            }
        }, 5000);
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

        friendsList.innerHTML = this.friends.length ? this.friends.map(f => `
            <div class="social-item">
                <div class="user-info">
                    <span class="user-avatar">👤</span>
                    <span class="username">${f.username}</span>
                </div>
                <button class="challenge-btn" onclick="SocialManager.challengeFriend('${f.friendId}', '${f.username}')">⚔️ SFIDA</button>
            </div>
        `).join('') : '<p class="empty-state">Nessun amico ancora.</p>';

        requestsList.innerHTML = this.pendingRequests.length ? this.pendingRequests.map(r => `
            <div class="social-item pending">
                <span>Richiesta da: <strong>${r.sender.username}</strong></span>
                <div class="actions">
                    <button class="accept-btn" onclick="SocialManager.acceptFriendRequest('${r.id}')">✅</button>
                </div>
            </div>
        `).join('') : '';
    },

    renderSearchResults(users) {
        const container = document.getElementById('searchResults');
        container.innerHTML = users.map(u => `
            <div class="search-result-item">
                <span>${u.username}</span>
                <button onclick="SocialManager.sendFriendRequest('${u.id}')">➕ Aggiungi</button>
            </div>
        `).join('');
    }
};
