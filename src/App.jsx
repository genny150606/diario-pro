import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)'
            }}>
                <p>Caricamento...</p>
            </div>
        )
    }

    return user ? children : <Navigate to="/" replace />
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route
                path="/app"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}
