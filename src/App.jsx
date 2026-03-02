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
const CalendarSection = lazy(() => import('./components/sections/CalendarSection'))
const KnowledgeHubSection = lazy(() => import('./components/sections/KnowledgeHubSection'))
const SettingsSection = lazy(() => import('./components/sections/SettingsSection'))
const StudyRoomSection = lazy(() => import('./components/sections/StudyRoomSection'))
const ClassroomSection = lazy(() => import('./components/sections/ClassroomSection'))

// Lightweight section loading fallback
const SectionFallback = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', opacity: 0.4 }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#6495FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
)

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <LoadingScreen />
    return user ? children : <Navigate to="/" replace />
}

export default function App() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <Routes>
                <Route path="/" element={<Landing />} />

                <Route
                    path="/app"
                    element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Suspense fallback={<SectionFallback />}><DashboardSection /></Suspense>} />
                    <Route path="notes" element={<Suspense fallback={<SectionFallback />}><NotesSection /></Suspense>} />
                    <Route path="tasks" element={<Suspense fallback={<SectionFallback />}><TasksSection /></Suspense>} />
                    <Route path="grades" element={<Suspense fallback={<SectionFallback />}><GradesSection /></Suspense>} />
                    <Route path="pomodoro" element={<Suspense fallback={<SectionFallback />}><PomodoroSection /></Suspense>} />
                    <Route path="stats" element={<Suspense fallback={<SectionFallback />}><StatsSection /></Suspense>} />
                    <Route path="duel" element={<Suspense fallback={<SectionFallback />}><DuelSection /></Suspense>} />
                    <Route path="social" element={<Suspense fallback={<SectionFallback />}><SocialSection /></Suspense>} />
                    <Route path="gamification" element={<Suspense fallback={<SectionFallback />}><GamificationSection /></Suspense>} />
                    <Route path="calendar" element={<Suspense fallback={<SectionFallback />}><CalendarSection /></Suspense>} />
                    <Route path="knowledge" element={<Suspense fallback={<SectionFallback />}><KnowledgeHubSection /></Suspense>} />
                    <Route path="study-rooms" element={<Suspense fallback={<SectionFallback />}><StudyRoomSection /></Suspense>} />
                    <Route path="classroom" element={<Suspense fallback={<SectionFallback />}><ClassroomSection /></Suspense>} />
                    <Route path="settings" element={<Suspense fallback={<SectionFallback />}><SettingsSection /></Suspense>} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    )
}
