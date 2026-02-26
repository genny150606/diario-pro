import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://rzdpntvojpibbndhsrlz.supabase.co'
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

            // Direct-First Strategy with 3s Timeout
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 3000)

                const directRes = await window.fetch(url, {
                    ...options,
                    signal: controller.signal
                })
                clearTimeout(timeoutId)

                // If it's a success or a normal client error (4xx), return it immediately
                if (directRes.status < 500 || directRes.status === 404) {
                    return directRes
                }

                // If it's a 520 (Cloudflare) or Gateway error, fall through to proxy
                if (![520, 502, 503, 504].includes(directRes.status)) {
                    return directRes
                }
            } catch (err) {
                // If it's a network error (CORS/Blocked) or Timeout, fall through to proxy
                console.warn(`[AUTH] Direct fetch failed for ${urlStr.split('/').pop()}, attempting proxy fallback...`, err.message)
            }

            // Proxy Fallback logic
            const isRest = urlStr.includes('/rest/v1/')
            const isAuth = urlStr.includes('/auth/v1/')

            if (!import.meta.env.DEV && (isRest || isAuth)) {
                let path = isRest
                    ? `/rest/v1/${urlStr.split('/rest/v1/')[1]}`
                    : `/auth/v1/${urlStr.split('/auth/v1/')[1]}`
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

                try {
                    const proxyRes = await fetch(PROXY_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(proxyBody)
                    })
                    if (proxyRes.ok) return proxyRes
                } catch (proxyErr) {
                    console.error('[PROXY] Fallback also failed:', proxyErr)
                }
            }

            // Universal fallback
            return window.fetch(url, options)
        }
    }
})
