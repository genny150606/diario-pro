import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import './styles/theme.css'
import './styles/global.css'
import './styles/layout.css'
import './styles/style.css'
import './styles/features.css'
import './styles/animations.css'
import './styles/animations-ui.css'
import './styles/responsive.css'
import './styles/gamification.css'
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <DataProvider>
                    <App />
                </DataProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
)
