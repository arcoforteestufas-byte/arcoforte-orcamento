'use client';

import { useChat } from '@ai-sdk/react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, status, error, sendMessage } = useChat({
    api: '/api/chat',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isLoading = status === 'in_progress' || status === 'streaming';

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-lg transition-transform hover:scale-105 flex items-center justify-center"
          aria-label="Abrir assistente"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Janela do Chat */}
      {isOpen && (
        <div className="bg-background border border-border rounded-xl shadow-2xl w-[380px] h-[550px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <span className="font-semibold text-sm">Assistente ArcoForte</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-primary-foreground/20 p-1 rounded transition-colors"
              aria-label="Fechar assistente"
            >
              <X size={18} />
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
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
                    className={`px-3 py-2 text-sm rounded-lg whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-muted text-foreground rounded-tl-none'
                    }`}
                  >
                    {m.content}
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
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim() || isLoading) return;
                sendMessage({ role: 'user', content: input });
                setInput('');
              }}
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
