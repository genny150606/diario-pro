import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rzdpntvojpibbndhsrlz.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHBudHZvanBpYmJuZGhzcmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzg1MjEsImV4cCI6MjA4Njk1NDUyMX0.QwnT9Okp8CkN_LxGIeBKWrroo3letL8OhSvaqdQVW7M'

const PROXY_URL = import.meta.env.DEV
    ? '/api/supabase-proxy'
    : '/api/supabase-proxy'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
    global: {
        fetch: async (url, options) => {
            const urlStr = url.toString()
            // Route REST API calls through Vercel proxy to bypass Cloudflare 520
            // ONLY IN PRODUCTION. Local dev doesn't need it and retrying causes massive slowdowns.
            // DO NOT PROXY Auth calls, as they slow down the initial app load due to cold starts.
            if (!import.meta.env.DEV && urlStr.includes('/rest/v1/')) {
                let path = `/rest/v1/${urlStr.split('/rest/v1/')[1]}`

                const rawHeaders = {}
                if (options.headers) {
                    new Headers(options.headers).forEach((v, k) => rawHeaders[k] = v)
                }

                const proxyBody = {
                    path: path,
                    method: options.method,
                    headers: rawHeaders,
                    body: options.body
                }

                // Retry logic with exponential backoff and timeout
                let lastRes
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        const controller = new AbortController()
                        // 12s timeout to allow Vercel serverless cold starts
                        const timeoutId = setTimeout(() => controller.abort(), 12000)

                        lastRes = await fetch(PROXY_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Client-Info': 'studyjournal-pro-react',
                                'X-Client-Retry-Count': attempt.toString()
                            },
                            body: JSON.stringify(proxyBody),
                            signal: controller.signal
                        })

                        clearTimeout(timeoutId)

                        if (lastRes.ok) {
                            return lastRes // Proxy succeeded and returned 2xx
                        }

                        // If proxy endpoint is missing
                        if (lastRes.status === 404 && lastRes.headers.get('content-type')?.includes('text/html')) {
                            break
                        }

                        // Valid 4xx from Supabase
                        if (lastRes.status >= 400 && lastRes.status < 500 && !lastRes.headers.get('content-type')?.includes('text/html')) {
                            return lastRes
                        }

                    } catch (err) {
                        console.warn(`[PROXY RETRY] Attempt ${attempt + 1} failed:`, err.message)
                    }

                    if (attempt < 2) {
                        const delay = 500 * Math.pow(2, attempt) + (Math.random() * 200)
                        await new Promise(r => setTimeout(r, delay))
                    }
                }

                // Fallback to direct Supabase connection if proxy completely failed or timed out
                if (!lastRes || !lastRes.ok) {
                    console.warn(`⚠️ Proxy completely failed (or returned ${lastRes?.status}), falling back to direct Supabase...`)
                    try {
                        return await window.fetch(url, options)
                    } catch (fallbackErr) {
                        console.error('❌ Direct fallback also failed:', fallbackErr)
                        throw fallbackErr
                    }
                }

                return lastRes
            }

            return window.fetch(url, options)
        }
    }
})
