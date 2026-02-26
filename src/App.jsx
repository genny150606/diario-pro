import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoadingScreen from './components/layout/LoadingScreen'
import AppLayout from './components/layout/AppLayout'

const Landing = lazy(() => import('./pages/Landing'))

// Lazy load sections
const DashboardSection = lazy(() => import('./components/sections/DashboardSection'))
const NotesSection = lazy(() => import('./components/sections/NotesSection'))
const TasksSection = lazy(() => import('./components/sections/TasksSection'))
const GradesSection = lazy(() => import('./components/sections/GradesSection'))
const PomodoroSection = lazy(() => import('./components/sections/PomodoroSection'))
const StatsSection = lazy(() => import('./components/sections/StatsSection'))
const DuelSection = lazy(() => import('./components/sections/DuelSection'))
const SocialSection = lazy(() => import('./components/sections/SocialSection'))
const GamificationSection = lazy(() => import('./components/sections/GamificationSection'))
const SettingsSection = lazy(() => import('./components/sections/SettingsSection'))

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) {
        return <LoadingScreen />
    }

    return user ? children : <Navigate to="/" replace />
}

export default function App() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <Routes>
                <Route path="/" element={<Landing />} />

                {/* Protected App Routes with Nested Navigation */}
                <Route
                    path="/app"
                    element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<DashboardSection />} />
                    <Route path="notes" element={<NotesSection />} />
                    <Route path="tasks" element={<TasksSection />} />
                    <Route path="grades" element={<GradesSection />} />
                    <Route path="pomodoro" element={<PomodoroSection />} />
                    <Route path="stats" element={<StatsSection />} />
                    <Route path="duel" element={<DuelSection />} />
                    <Route path="social" element={<SocialSection />} />
                    <Route path="gamification" element={<GamificationSection />} />
                    <Route path="settings" element={<SettingsSection />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    )
}
