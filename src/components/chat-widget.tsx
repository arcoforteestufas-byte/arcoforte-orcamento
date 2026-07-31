'use client';

import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userText = input.trim();
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      
      if (!res.ok) throw new Error(await res.text() || 'Falha ao comunicar com servidor');
      
      const data = await res.json();
      
      setMessages(prev => [...prev, { id: Date.now().toString() + 'bot', role: 'assistant', content: data.text }]);
      
    } catch (err: any) {
      console.error(err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-transform hover:scale-105 flex items-center justify-center"
          aria-label="Abrir assistente"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Janela do Chat */}
      {isOpen && (
        <div className="bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-[0_20px_50px_rgb(0,0,0,0.15)] w-[calc(100vw-32px)] sm:w-[380px] h-[75vh] max-h-[600px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-[#ff8c42] text-primary-foreground px-4 py-3 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                <Bot size={18} />
              </div>
              <span className="font-semibold text-sm">Assistente ArcoForte</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-black/10 p-1.5 rounded-full transition-colors"
              aria-label="Fechar assistente"
            >
              <X size={18} />
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm my-auto">
                <Bot size={40} className="mx-auto mb-3 opacity-50" />
                <p>Olá! Sou o especialista em estufas da ArcoForte.</p>
                <p className="mt-1">Como posso te ajudar a montar o orçamento ideal hoje?</p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 max-w-[85%] ${
                    m.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                  }`}
                >
                  <div
                    className={`p-2 rounded-full flex-shrink-0 ${
                      m.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div
                    className={`px-3 py-2 text-sm rounded-lg whitespace-pre-wrap [&>p]:mb-2 last:[&>p]:mb-0 [&>h3]:font-bold [&>h3]:text-base [&>h3]:mb-1 [&>h3]:mt-2 [&>ul]:list-disc [&>ul]:ml-4 [&>ul]:mb-2 [&>li]:mb-1 [&>strong]:font-semibold ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-muted text-foreground rounded-tl-none'
                    }`}
                  >
                    {m.role === 'user' ? (
                      m.content
                    ) : (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {error && (
               <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg border border-destructive/20 flex items-center justify-between">
                 <span>Erro: {error.message}</span>
                 <button onClick={() => window.location.reload()} className="underline hover:no-underline">X</button>
               </div>
            )}
            
            {isLoading && (
              <div className="flex items-center gap-2 self-start text-muted-foreground">
                <Bot size={16} />
                <span className="text-xs animate-pulse">Digitando...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Área de Input */}
          <div className="p-3 bg-card border-t border-border">
            <form
              onSubmit={handleSendMessage}
              className="flex items-center bg-background border border-input rounded-full overflow-hidden px-2 py-1 focus-within:ring-1 focus-within:ring-primary"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre estufas..."
                className="flex-1 bg-transparent border-none outline-none text-sm px-2 py-2"
              />
              <button
                type="submit"
                className="bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                disabled={isLoading || !input.trim()}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
