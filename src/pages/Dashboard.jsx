import { useState } from 'react'
import AppLayout from '../components/layout/AppLayout'
import DashboardSection from '../components/sections/DashboardSection'
import NotesSection from '../components/sections/NotesSection'
import TasksSection from '../components/sections/TasksSection'
import GradesSection from '../components/sections/GradesSection'
import PomodoroSection from '../components/sections/PomodoroSection'
import StatsSection from '../components/sections/StatsSection'
import DuelSection from '../components/sections/DuelSection'
import SocialSection from '../components/sections/SocialSection'
import GamificationSection from '../components/sections/GamificationSection'
import SettingsSection from '../components/sections/SettingsSection'

const SECTION_MAP = {
    dashboard: DashboardSection,
    notes: NotesSection,
    tasks: TasksSection,
    grades: GradesSection,
    pomodoro: PomodoroSection,
    stats: StatsSection,
    duel: DuelSection,
    social: SocialSection,
    gamification: GamificationSection,
    settings: SettingsSection,
}


export default function Dashboard() {
    const [activeSection, setActiveSection] = useState('dashboard')

    const ActiveComponent = SECTION_MAP[activeSection] || DashboardSection

    return (
        <AppLayout activeSection={activeSection} onSectionChange={setActiveSection}>
            <ActiveComponent />
        </AppLayout>
    )
}
