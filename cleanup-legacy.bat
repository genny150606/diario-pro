@echo off
REM ============================================
REM Cleanup: sposta i file legacy nella cartella _legacy
REM Esegui da: f:\diarioNuovo
REM ============================================

if not exist _legacy mkdir _legacy

REM === File JavaScript legacy ===
for %%f in (script.js social-manager.js duel-manager.js chatbot-simple.js gemini-features.js new-features.js flashcard-local-generator.js share-manager.js user-profile.js ui-manager.js ui-interactions.js onboarding.js hamburger-menu.js cloud-storage.js grades-adapter.js auth.js verify_multiplayer.js test_proxy.js vercel_bundle.js) do (
    if exist "%%f" move /Y "%%f" "_legacy\" >nul 2>&1
)

REM === File HTML legacy ===
for %%f in (app-old.html index-old.html email-templates.html) do (
    if exist "%%f" move /Y "%%f" "_legacy\" >nul 2>&1
)

REM === File CSS legacy (duplicati di src/styles/) ===
for %%f in (style.css home.css layout.css features.css gamification.css theme.css animations.css animations-ui.css responsive.css global.css) do (
    if exist "%%f" move /Y "%%f" "_legacy\" >nul 2>&1
)

echo.
echo Pulizia completata! I file legacy sono in _legacy/
echo Puoi eliminare _legacy/ quando sei sicuro che tutto funziona.
