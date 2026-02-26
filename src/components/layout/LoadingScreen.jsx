import React from 'react';

export default function LoadingScreen() {
    return (
        <div className="loading-screen">
            <div className="loading-content">
                <div className="loading-logo-wrapper">
                    <div className="logo-sparkle"></div>
                    <div className="logo-glow"></div>
                    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="premium-logo-svg">
                        <circle cx="50" cy="50" r="48" stroke="url(#logoBorder)" strokeWidth="0.5" strokeDasharray="10 5" />
                        <path d="M50 20L65 50L50 80L35 50L50 20Z" fill="url(#mainGradient)" />
                        <path d="M50 35L58 50L50 65L42 50L50 35Z" fill="white" fillOpacity="0.8" />
                        <defs>
                            <linearGradient id="mainGradient" x1="50" y1="20" x2="50" y2="80" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#5B9FF3" />
                                <stop offset="1" stopColor="#8B5CF6" />
                            </linearGradient>
                            <linearGradient id="logoBorder" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                                <stop stopColor="white" stopOpacity="0.1" />
                                <stop offset="0.5" stopColor="white" stopOpacity="0.5" />
                                <stop offset="1" stopColor="white" stopOpacity="0.1" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <div className="loading-text-container">
                    <h1 className="loading-brand">StudyJournal <span className="premium-tag">PRO</span></h1>
                    <div className="loading-status">
                        <span className="status-dot"></span>
                        <p className="status-text">Sincronizzazione in corso...</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
