
import React, { useState, useEffect, useRef } from 'react';
import { ChatPayload } from '../../types';

interface ChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatPayload[];
  onSendMessage: (text: string) => void;
  myId: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ isOpen, onClose, messages, onSendMessage, myId }) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
    // On mobile, maybe keep open? On PC maybe close? Let's keep open for rapid chatting.
    // onClose(); 
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // Prevent game controls (WASD) from reacting
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // If closed, we show a small faded list of recent messages
  if (!isOpen) {
    const recentMessages = messages.slice(-5); // Show last 5
    return (
      <div className="absolute top-20 left-4 z-40 w-full max-w-sm pointer-events-none font-vt323 text-shadow-sm">
        <div className="flex flex-col gap-1">
          {recentMessages.map((msg) => (
             <div key={msg.id} className={`text-xl drop-shadow-md break-words animate-in fade-in duration-300 ${Date.now() - msg.timestamp > 10000 ? 'opacity-0 transition-opacity duration-1000' : 'opacity-100'}`}>
                <span className={msg.senderId === myId ? "text-green-400" : "text-yellow-400"}>
                    {msg.senderId === myId ? 'You' : msg.senderName}: 
                </span>
                <span className="text-white ml-1">{msg.message}</span>
             </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
        className="absolute top-0 left-0 bottom-0 sm:bottom-auto sm:h-[50vh] sm:top-20 sm:left-4 z-[100] w-full sm:w-96 flex flex-col font-vt323"
        onPointerDown={(e) => e.stopPropagation()} // Allow clicking chat without hitting game world
    >
        {/* Chat History Background */}
        <div 
            className="flex-1 bg-black/70 sm:rounded-t-lg p-2 overflow-y-auto custom-scrollbar flex flex-col justify-end min-h-0"
            onClick={onClose} // Click outside/background to close on mobile simplified
        >
            <div className="flex flex-col gap-1" onPointerDown={(e) => e.stopPropagation()}>
                {messages.map((msg) => (
                    <div key={msg.id} className="text-xl break-words">
                        <span className="text-gray-400 text-sm mr-2">[{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span>
                        <span className={msg.senderId === myId ? "text-green-400 font-bold" : "text-yellow-400 font-bold"}>
                            {msg.senderId === myId ? 'You' : msg.senderName}: 
                        </span>
                        <span className="text-white ml-1">{msg.message}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="bg-black/90 p-2 flex gap-2 border-t-2 border-gray-600 sm:rounded-b-lg">
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-gray-800 text-white px-2 py-1 outline-none border border-gray-600 font-vt323 text-xl placeholder-gray-500"
                placeholder="Type a message..."
                maxLength={100}
            />
            <button 
                type="submit" 
                className="bg-blue-600 text-white px-4 py-1 font-bold hover:bg-blue-500 pixel-btn active:translate-y-1"
            >
                SEND
            </button>
            <button 
                type="button" 
                onClick={onClose}
                className="bg-red-600 text-white px-3 py-1 font-bold hover:bg-red-500 pixel-btn active:translate-y-1 sm:hidden"
            >
                X
            </button>
        </form>
    </div>
  );
};
