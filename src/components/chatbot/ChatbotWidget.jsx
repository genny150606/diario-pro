import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, Send, X, Bot } from 'lucide-react'
import { useData } from '../../hooks/useData'
import './ChatbotWidget.css'

export default function ChatbotWidget() {
    const { addNote } = useData()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)

    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://diario-pro.vercel.app')

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus()
            if (messages.length === 0) {
                setMessages([{
                    role: 'ai',
                    content: '👋 Ciao! Sono il tuo assistente AI personale.\n\nSono qui per aiutarti a studiare in modo più intelligente e veloce. Cosa vuoi fare oggi?'
                }])
            }
        }
    }, [isOpen])

    // Nuclear Spline Watermark Removal
    useEffect(() => {
        const removeWatermark = () => {
            const viewers = document.querySelectorAll('spline-viewer');
            viewers.forEach(viewer => {
                if (viewer && viewer.shadowRoot) {
                    // NUCLEAR OPTION: Hide EVERYTHING in shadowRoot that isn't the canvas
                    const allElements = viewer.shadowRoot.querySelectorAll('*');
                    allElements.forEach(el => {
                        // If it's not the canvas, and it's not a root container we need, hide it
                        if (el.tagName !== 'CANVAS' && el.tagName !== 'SLOT' && el.tagName !== 'STYLE') {
                            // We check if it's part of the UI/Logo by its typical positioning or name
                            const isLogo = el.id?.toLowerCase().includes('logo') ||
                                el.id?.toLowerCase().includes('badge') ||
                                el.className?.toString().toLowerCase().includes('spline') ||
                                el.tagName === 'A';

                            // Even if it doesn't match the name, if it's positioned like a logo, kill it
                            const style = window.getComputedStyle(el);
                            const isPositionedLikeLogo = (style.position === 'absolute' && (style.bottom !== 'auto' || style.top !== 'auto'));

                            if (isLogo || isPositionedLikeLogo) {
                                el.style.display = 'none';
                                el.style.setProperty('display', 'none', 'important');
                                el.style.opacity = '0';
                                el.style.setProperty('opacity', '0', 'important');
                                el.style.pointerEvents = 'none';
                                el.style.visibility = 'hidden';
                            }
                        }
                    });
                }
            });
        };

        const interval = setInterval(removeWatermark, 100);
        const timeout = setTimeout(() => clearInterval(interval), 20000); // Polling for 20s

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, []);

    const formatMarkdown = (text) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>')
    }

    const handleSend = useCallback(async (forcedText = null) => {
        const text = (forcedText || input).trim()
        if (!text || loading) return

        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: text }])
        setLoading(true)

        // Check if note generation request
        const isNoteRequest = /appunti|nota|spieg|riassumi|riassunto|studio|studia/i.test(text)

        try {
            const response = await fetch(`${apiUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: isNoteRequest
                        ? `Crea appunti COMPLETI su: ${text}\n\nSTRUTTURA:\n1. INTRODUZIONE\n2. CONCETTI PRINCIPALI\n3. SPIEGAZIONE DETTAGLIATA\n4. ESEMPI PRATICI\n5. RIASSUNTO`
                        : text,
                    history: messages.slice(-6).map(m => ({
                        role: m.role === 'user' ? 'user' : 'model',
                        parts: [{ text: m.content }]
                    })),
                    context: 'StudyJournal AI Assistant',
                    stream: true
                })
            })

            if (!response.ok) throw new Error(`Server error: ${response.status}`)

            // Streaming SSE
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let fullText = ''
            const aiMsgId = Date.now()

            // Add empty AI message with typing indicator
            setMessages(prev => [...prev, { role: 'ai', content: '<div class="typing-dots"><span></span><span></span><span></span></div>', id: aiMsgId }])

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                for (const line of chunk.split('\n')) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim()
                        if (dataStr === '[DONE]') continue
                        try {
                            const data = JSON.parse(dataStr)
                            if (data.text) {
                                fullText += data.text
                                setMessages(prev => prev.map(m =>
                                    m.id === aiMsgId ? { ...m, content: fullText } : m
                                ))
                            }
                        } catch (e) { /* skip parse errors in SSE */ }
                    }
                }
            }

            // Auto-save notes if it was a note generation request
            if (isNoteRequest && fullText.length > 50) {
                const subject = text.replace(/crea|appunti|su|spieg|nota|di/gi, '').trim() || 'Appunti AI'
                addNote({ title: subject, content: fullText, subject: 'AI' })
                setMessages(prev => [...prev, {
                    role: 'ai',
                    content: '📌 **Appunti salvati automaticamente!** Li trovi nella sezione Note.',
                    id: Date.now()
                }])
            }

        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `❌ Errore: ${err.message}. Riprova tra poco.`,
                id: Date.now()
            }])
        } finally {
            setLoading(false)
        }
    }, [input, loading, messages, apiUrl, addNote])

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <>
            {/* Spline 3D Toggle Button */}
            <div
                className={`chatbot-spline-container ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="AI Assistant"
            >
                <spline-viewer
                    url="https://prod.spline.design/AbmTcgRhAHUrxbQK/scene.splinecode"
                    loading-alpha="0"
                    hint-background-color="transparent"
                    alpha="true"
                ></spline-viewer>

                {isOpen && (
                    <div className="chatbot-close-overlay">
                        <X size={20} />
                    </div>
                )}
            </div>

            {/* Chat Window */}
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-avatar">
                            <spline-viewer
                                url="https://prod.spline.design/7CwI66tHlWIL45AN/scene.splinecode"
                                loading-alpha="0"
                                hint-background-color="transparent"
                                alpha="true"
                            ></spline-viewer>
                        </div>
                        <div>
                            <h4>StudyJournal AI</h4>
                            <span className="chatbot-status">
                                {loading ? '✍️ Scrivendo...' : '🟢 Online'}
                            </span>
                        </div>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map((msg, i) => (
                            <div key={msg.id || i} className={`chat-bubble ${msg.role}`}>
                                <div dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />
                            </div>
                        ))}

                        {messages.length === 1 && !loading && (
                            <div className="chatbot-suggestions">
                                <button onClick={() => handleSend("Crea degli appunti riassuntivi su...")} className="suggestion-chip">
                                    📝 Crea Appunti
                                </button>
                                <button onClick={() => handleSend("Genera 5 flashcard su...")} className="suggestion-chip">
                                    🎴 Genera Flashcard
                                </button>
                                <button onClick={() => handleSend("Puoi spiegarmi in modo semplice...")} className="suggestion-chip">
                                    🧠 Spiegami un concetto
                                </button>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chatbot-input-area">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Chiedi all'AI..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        <button
                            className="chatbot-send-btn"
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                        >
                            {loading ? <span className="spinner"></span> : <Send size={18} strokeWidth={2.5} />}
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
