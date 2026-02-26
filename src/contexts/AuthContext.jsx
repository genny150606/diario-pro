import { createContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Get initial session with 5s timeout protection
        const sessionTimeout = setTimeout(() => {
            console.warn('[AUTH] Session fetch timed out (5s), proceeding without auth')
            setLoading(false)
        }, 5000)

        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                clearTimeout(sessionTimeout)
                setUser(session?.user ?? null)
                setLoading(false)
            })
            .catch((err) => {
                clearTimeout(sessionTimeout)
                console.error('[AUTH] getSession error:', err)
                setLoading(false)
            })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null)

                if (event === 'SIGNED_IN' && session) {
                    // Ensure users_data row exists
                    const uid = session.user.id
                    const { data } = await supabase
                        .from('users_data')
                        .select('id')
                        .eq('id', uid)
                        .maybeSingle()

                    if (!data) {
                        await supabase.from('users_data').insert([{
                            id: uid,
                            data: {},
                            updated_at: new Date().toISOString()
                        }])
                    }
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return data
    }

    const signUp = async (email, password, userData = {}) => {
        let schoolType = 'liceo'
        if (userData.age) {
            schoolType = userData.age <= 18 ? 'liceo' : 'università'
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    ...userData,
                    school_type: schoolType
                }
            }
        })
        if (error) throw error

        // Create users_data row immediately
        if (data?.user) {
            await supabase.from('users_data').insert([{
                id: data.user.id,
                data: {},
                updated_at: new Date().toISOString()
            }])
        }

        return data
    }

    const signOut = async () => {
        console.log('[AUTH] Starting signOut process...')

        // Clear local state IMMEDIATELY for best UX
        setUser(null)
        const storageKey = 'sb-' + SUPABASE_URL.split('//')[1].split('.')[0] + '-auth-token'
        localStorage.removeItem(storageKey)
        console.log('[AUTH] Local state cleared')

        try {
            // Attempt to tell Supabase we're signing out, but don't let it hang the UI
            // We use a Promise.race to timeout after 2 seconds
            await Promise.race([
                supabase.auth.signOut(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Sign out network timeout')), 2000))
            ])
            console.log('[AUTH] Supabase signOut successful')
        } catch (error) {
            console.warn('[AUTH] Sign out network call failed or timed out:', error.message)
        }
    }

    const updatePassword = async (newPassword) => {
        if (!newPassword || newPassword.length < 6) {
            throw new Error('La password deve essere di almeno 6 caratteri.')
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
    }

    const value = {
        user,
        loading,
        signIn,
        signUp,
        signOut,
        updatePassword
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
