import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { ToastProvider } from './contexts/ToastContext'
import './styles/theme.css'
import './styles/global.css'
import './styles/layout.css'
import './styles/style.css'
import './styles/features.css'
import './styles/animations.css'
import './styles/animations-ui.css'
import './styles/responsive.css'
import './styles/gamification.css'
import './styles/social.css'
import './styles/skeleton.css'
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <DataProvider>
                    <ToastProvider>
                        <App />
                    </ToastProvider>
                </DataProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
)
