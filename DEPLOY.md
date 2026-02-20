# 🚀 Come caricare su Netlify

Ecco una guida passo-passo per pubblicare il tuo sito **StudyJournal Pro** su Netlify.

## 1. Prepara il Repository GitHub
Assicurati che tutte le tue modifiche siano state "pushat" su GitHub.
Se non lo hai ancora fatto:
```bash
git add .
git commit -m "Preparazione deploy Netlify"
git push
```

## 2. Collega Netlify
1. Vai su [netlify.com](https://www.netlify.com) e accedi (o registrati).
2. Nella Dashboard, clicca su **"Add new site"** > **"Import from Git"**.
3. Scegli **GitHub**.
4. Seleziona il repository `diario-pro` (o come lo hai chiamato).

## 3. Configura il Deploy
Netlify dovrebbe rilevare automaticamente il file `netlify.toml` che ho appena creato.
Verifica queste impostazioni:
- **Build command:** `cd api && npm install` (o vuoto se non funziona, ma dovrebbe andare)
- **Publish directory:** `.` (lascia il punto o lo slash)
- **Functions directory:** `api`

## 4. Variabili d'Ambiente (IMPORTANTE!)
Il backend ha bisogno della tua chiave API di Gemini per funzionare.
1. Prima di cliccare "Deploy", clicca su **"Show advanced"** o vai dopo in **Site Settings** > **Environment variables**.
2. Aggiungi una nuova variabile:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** Incolla la tua chiave API di Google Gemini (quella che inizia con `AIza...`)
3. Aggiungi anche:
   - **Key:** `SUPABASE_URL` (se usi variabili lato server, ma il frontend usa quelle nel codice JS)
   - **Key:** `SUPABASE_KEY` (idem)
   *(Nota: Se hai messo le chiavi Supabase direttamente nel codice JS frontend come sembra, non serve metterle qui per ora, ma è buona pratica per il futuro)*.

## 5. Deploy!
Clicca su **"Deploy site"**.

Attendi circa 1-2 minuti. Netlify installerà le dipendenze per l'API e pubblicherà il sito.

Una volta finito, ti darà un URL (es. `https://random-name.netlify.app`). Puoi cambiarlo in **Domain Settings**.

## 🎉 Finito!
Il tuo sito è online!
- Il frontend funzionerà subito.
- Il chatbot e le funzioni AI useranno l'API che Netlify ha deployato come "Function".
