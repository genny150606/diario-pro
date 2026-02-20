const supabaseClient = require('@supabase/supabase-js').createClient;
// test proxy
const url = 'https://diario-pro.vercel.app/api/supabase-proxy';

async function test() {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            path: '/rest/v1/quiz_rooms?id=eq.b80c3fb1-72f1-4fc3-a2eb-b248aef60067',
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
                'Accept': 'application/json'
            },
            body: {
                status: 'active',
                start_time: new Date().toISOString()
            }
        })
    });

    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log("Body:", text);
}
test();
