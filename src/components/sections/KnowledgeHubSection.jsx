import { useState, useRef, useEffect } from 'react'
import { useData } from '../../hooks/useData'
import { useToast } from '../../contexts/ToastContext'
import {
    Upload, FileText, Loader2, Search, Filter, BookOpen, MoreVertical, Trash2, Edit2, Play, Plus, Zap, RefreshCw, Sparkles, ChevronDown, Info, Calendar, Send, FileUp
} from 'lucide-react'

export default function KnowledgeHubSection() {
    const { data, saveData, updateData } = useData()
    const { addToast } = useToast()
    const [file, setFile] = useState(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [analysisResult, setAnalysisResult] = useState(null)
    const [chatMessages, setChatMessages] = useState([])
    const [inputMessage, setInputMessage] = useState('')
    const [sendingChat, setSendingChat] = useState(false)
    const chatEndRef = useRef(null)

    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://diario-pro.vercel.app')

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [chatMessages])

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile)
        } else {
            addToast('Per favore seleziona un file PDF.', 'warning')
        }
    }

    const handleUpload = async () => {
        if (!file) return
        setAnalyzing(true)
        setAnalysisResult(null)
        setChatMessages([])

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch(`${apiUrl}/api/analyze-pdf`, {
                method: 'POST',
                body: formData
            })

            if (!response.ok) throw new Error('Errore durante l\'analisi del PDF')

            const result = await response.json()
            setAnalysisResult(result)
            setChatMessages([{
                role: 'model',
                content: 'Ciao! Ho analizzato il documento. Puoi farmi domande sul contenuto o guardare il riassunto qui sopra.'
            }])
        } catch (err) {
            addToast(`Errore: ${err.message}`, 'error')
        } finally {
            setAnalyzing(false)
        }
    }

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !analysisResult?.textPreview || sendingChat) return

        const userMsg = { role: 'user', content: inputMessage }
        setChatMessages(prev => [...prev, userMsg])
        setInputMessage('')
        setSendingChat(true)

        try {
            const response = await fetch(`${apiUrl}/api/document-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: inputMessage,
                    documentText: analysisResult.textPreview, // In a real scenario, this would be the full text
                    history: chatMessages.slice(-5)
                })
            })

            const result = await response.json()
            setChatMessages(prev => [...prev, { role: 'model', content: result.reply }])
        } catch (err) {
            setChatMessages(prev => [...prev, { role: 'model', content: 'Ops, qualcosa è andato storto con la chat.' }])
        } finally {
            setSendingChat(false)
        }
    }

    const handleImportFlashcards = () => {
        if (!analysisResult?.flashcards?.length) return

        const newCards = analysisResult.flashcards.map(c => ({
            id: Date.now() + Math.random(),
            front: c.front,
            back: c.back,
            subject: 'AI Hub',
            correct: 0,
            incorrect: 0
        }))

        saveData({
            ...data,
            flashcards: [...data.flashcards, ...newCards]
        })
        addToast(`${newCards.length} flashcard importate con successo!`, 'success')
    }

    return (
        <section className="section active reveal-entrance">
            <div className="hero">
                <h1><span className="gradient-text">AI Knowledge Hub</span> 🧠</h1>
                <p>Carica documenti e lascia che l'IA li studi per te</p>
            </div>

            <div className="hub-grid" style={{ display: 'grid', gridTemplateColumns: analysisResult ? '1fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>

                {/* Upload Section */}
                <div className="card glass-card hover-glow animated-border" style={{ padding: '2rem', textAlign: 'center' }}>
                    <div className="upload-area" style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px', padding: '3rem 1rem', cursor: 'pointer', transition: 'all 0.3s' }} onClick={() => document.getElementById('pdf-upload').click()}>
                        <input type="file" id="pdf-upload" hidden accept=".pdf" onChange={handleFileChange} />
                        <div style={{ background: 'var(--accent-gradient)', padding: '1rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1rem' }}>
                            <FileUp color="white" size={32} />
                        </div>
                        <h3 style={{ marginBottom: '0.5rem' }}>{file ? file.name : 'Trascina o clicca per caricare'}</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Supporta solo file PDF (max 10MB)</p>
                    </div>

                    {file && (
                        <button
                            className="btn-primary"
                            style={{ width: '100%', marginTop: '1.5rem', py: '1rem', fontSize: '1.1rem' }}
                            onClick={handleUpload}
                            disabled={analyzing}
                        >
                            {analyzing ? (
                                <><Loader2 className="spinning" size={20} /> Analizzando...</>
                            ) : (
                                <><Sparkles size={20} /> Avvia Analisi IA</>
                            )}
                        </button>
                    )}
                </div>

                {/* Analysis Result (Summary) */}
                {analysisResult && (
                    <div className="card glass-card hover-glow reveal-entrance" style={{ animationDelay: '0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={20} className="text-secondary" /> Riassunto Documento
                            </h3>
                            <div className="badge-premium">Analisi IA</div>
                        </div>
                        <div className="analysis-summary-content" style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6', fontSize: '0.95rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                            <div dangerouslySetInnerHTML={{ __html: analysisResult.summary.replace(/\n/g, '<br/>') }} />
                        </div>

                        {analysisResult.flashcards?.length > 0 && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <button className="btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} onClick={handleImportFlashcards}>
                                    <Plus size={18} /> Importa {analysisResult.flashcards.length} Flashcard generate
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Document Chat Section */}
            {analysisResult && (
                <div className="card glass-card hover-glow reveal-entrance" style={{ marginTop: '1.5rem', animationDelay: '0.4s', padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#38F9D7', boxShadow: '0 0 10px #38F9D7' }}></div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Chat con il Documento</h3>
                    </div>

                    <div className="chat-window" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                        <div className="messages" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {chatMessages.map((m, i) => (
                                <div key={i} style={{
                                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '80%',
                                    padding: '0.8rem 1.2rem',
                                    borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                    background: m.role === 'user' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                                    color: m.role === 'user' ? 'white' : 'white',
                                    boxShadow: m.role === 'user' ? '0 4px 15px rgba(56, 249, 215, 0.2)' : 'none',
                                    fontSize: '0.95rem'
                                }}>
                                    {m.content}
                                </div>
                            ))}
                            {sendingChat && (
                                <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '0.8rem 1.2rem', borderRadius: '20px', display: 'flex', gap: '5px' }}>
                                    <span className="pulse-dot"></span>
                                    <span className="pulse-dot" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="pulse-dot" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="chat-input-area" style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '0.75rem' }}>
                            <input
                                type="text"
                                placeholder="Chiedi qualcosa sul documento..."
                                value={inputMessage}
                                onChange={e => setInputMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem 1rem' }}
                            />
                            <button
                                className="btn-icon"
                                onClick={handleSendMessage}
                                style={{ background: 'var(--accent-gradient)', color: 'white', borderRadius: '12px', width: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
