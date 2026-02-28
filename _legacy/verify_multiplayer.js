const fetch = require('node-fetch');

const API_PROXY = 'https://diario-pro.vercel.app/api/supabase-proxy';
const ROOM_CODE = process.argv[2]; // Pass code as arg

if (!ROOM_CODE) {
    console.error("Usage: node verify_multiplayer.js <ROOM_CODE>");
    process.exit(1);
}

async function simulatePlayer2() {
    console.log(`🤖 Simulating Player 2 for Room: ${ROOM_CODE}`);

    try {
        // 1. Find Room ID
        const roomRes = await fetch(API_PROXY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: `/rest/v1/quiz_rooms?code=eq.${ROOM_CODE}`,
                method: 'GET'
            })
        });
        const rooms = await roomRes.json();
        if (!rooms || rooms.length === 0) throw new Error("Room not found");
        const roomId = rooms[0].id;
        console.log(`✅ Found Room ID: ${roomId}`);

        // 2. Join as "Bot Sfidante"
        const joinRes = await fetch(API_PROXY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: '/rest/v1/quiz_players',
                method: 'POST',
                body: {
                    room_id: roomId,
                    username: 'Bot Sfidante',
                    score: 0,
                    is_ready: true
                }
            })
        });
        console.log(`✅ Joined as 'Bot Sfidante'. Status: ${joinRes.status}`);

        // 3. Poll for game start
        console.log("⏳ Watching for game start...");
        let gameStarted = false;
        for (let i = 0; i < 30; i++) {
            const statusRes = await fetch(API_PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: `/rest/v1/quiz_rooms?id=eq.${roomId}`,
                    method: 'GET'
                })
            });
            const roomData = await statusRes.json();
            if (roomData[0]?.status === 'active') {
                gameStarted = true;
                break;
            }
            await new Promise(r => setTimeout(r, 2000));
        }

        if (gameStarted) {
            console.log("⚔️ Battle started! Simulating progress...");
            for (let q = 1; q <= 5; q++) {
                await new Promise(r => setTimeout(r, 3000));
                const botScore = q * 120;
                await fetch(API_PROXY, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        path: `/rest/v1/quiz_players?room_id=eq.${roomId}&username=eq.Bot%20Sfidante`,
                        method: 'PATCH',
                        body: { score: botScore, current_question_index: q }
                    })
                });
                console.log(`📊 Bot progress: ${q}/5 - Score: ${botScore}`);
            }
            console.log("🏁 Bot finished battle.");
        } else {
            console.log("❌ Timeout waiting for host to start.");
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

simulatePlayer2();
