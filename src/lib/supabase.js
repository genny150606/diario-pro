import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://rzdpntvojpibbndhsrlz.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHBudHZvanBpYmJuZGhzcmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzg1MjEsImV4cCI6MjA4Njk1NDUyMX0.QwnT9Okp8CkN_LxGIeBKWrroo3letL8OhSvaqdQVW7M'

const PROXY_URL = '/api/supabase-proxy'

const createSupabaseClient = () => {
    return createClient(SUPABASE_URL, SUPABASE_KEY, {
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

                if (isRest || isAuth) {
                    console.log(`[PROXY] Attempting fallback for ${urlStr.split('/').pop()}...`)
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
                        const proxyController = new AbortController()
                        const proxyTimeoutId = setTimeout(() => proxyController.abort(), 10000)

                        const proxyRes = await fetch(PROXY_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(proxyBody),
                            signal: proxyController.signal
                        })
                        clearTimeout(proxyTimeoutId)

                        // If proxy successfully communicates with Supabase (even if returning a 4xx Supabase business error), return it.
                        // Only fallthrough to direct connection if the PROXY ITSELF fails (5xx).
                        if (proxyRes.status < 500) {
                            return proxyRes
                        } else {
                            console.warn(`[PROXY] Returned 5xx error for ${urlStr.split('/').pop()}, falling back to direct connection...`)
                        }
                    } catch (proxyErr) {
                        console.error('[PROXY] Fallback failed or timed out:', proxyErr)
                    }
                }

                // Universal fallback
                return window.fetch(url, options)
            }
        }
    })
}

export const supabase = window.__SUPABASE_CLIENT__ || createSupabaseClient()
if (import.meta.env?.DEV) {
    window.__SUPABASE_CLIENT__ = supabase
}
