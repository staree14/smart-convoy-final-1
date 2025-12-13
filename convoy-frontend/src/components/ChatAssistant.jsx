import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Bot, Minimize2, Loader2 } from 'lucide-react';
import '../styles/ChatAssistant.css';

export default function ChatAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I am Sarathi, your convoy operations assistant. How can I help you today?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('http://localhost:8000/api/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ message: userMsg, history: [] })
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error) {
            console.error("[ChatAssistant] Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}. Please check console.` }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="chat-fab-button group"
                title="Open Chat Assistant"
            >
                <MessageCircle className="w-8 h-8" />
                <span className="tooltip">
                    Ask Sarathi AI
                </span>
            </button>
        );
    }

    return (
        <div className="chat-container">

            {/* Header */}
            <div className="chat-header">
                <div className="chat-header-content">
                    <div className="bot-icon-wrapper">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="chat-title">
                        <h3>Sarathi Assistant</h3>
                        <p className="status-indicator">
                            <span className="status-dot"></span>
                            Online
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="minimize-btn"
                >
                    <Minimize2 className="w-5 h-5" />
                </button>
            </div>

            {/* Messages */}
            <div className="messages-area">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`message-row ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
                    >
                        <div
                            className={`message-bubble ${msg.role === 'user'
                                ? 'user-bubble'
                                : 'assistant-bubble'
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message-row message-assistant">
                        <div className="loading-bubble">
                            <Loader2 className="spinner" />
                            <span className="loading-text">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="chat-input-form">
                <div className="input-wrapper">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your question..."
                        className="chat-input"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="send-btn"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}
