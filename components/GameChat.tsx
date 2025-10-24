'use client';

import { useState, useRef, useEffect } from 'react';
import { database, ref, update } from '@/lib/firebase';
import { ChatMessage } from '@/lib/types';

interface GameChatProps {
  roomCode: string;
  playerId: string;
  playerName: string;
  messages: ChatMessage[];
}

const QUICK_EMOJIS = ['👍', '😂', '😮', '😢', '🔥', '❤️', '😎', '🎉', '🤔', '😡', '💪', '👏'];

const QUICK_TEXTS = [
  'Good move!',
  'Nice!',
  'Oops!',
  'Well played!',
  'Let\'s go!',
  'Good luck!'
];

export default function GameChat({ roomCode, playerId, playerName, messages }: GameChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showTexts, setShowTexts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatContainerRef.current && !chatContainerRef.current.contains(event.target as Node)) {
        setShowEmojis(false);
        setShowTexts(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sendMessage = async (message: string, type: 'emoji' | 'text') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId,
      playerName,
      message,
      timestamp: Date.now(),
      type
    };

    const currentMessages = messages || [];
    const updatedMessages = [...currentMessages, newMessage].slice(-50); // Keep last 50 messages

    await update(ref(database, `rooms/${roomCode}`), {
      chat: updatedMessages
    });

    setShowEmojis(false);
    setShowTexts(false);
  };

  // Get last 5 messages for floating display
  const recentMessages = messages.slice(-5);

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-full shadow-2xl z-40 transition-all hover:scale-110"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </button>

      {/* Floating Recent Messages (when chat closed) */}
      {!isOpen && recentMessages.length > 0 && (
        <div className="fixed bottom-24 right-6 space-y-2 z-30 pointer-events-none">
          {recentMessages.map((msg) => (
            <div
              key={msg.id}
              className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 max-w-xs animate-slide-up"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-900">{msg.playerName}:</span>
                <span className={msg.type === 'emoji' ? 'text-2xl' : 'text-sm text-gray-800'}>
                  {msg.message}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 bg-white rounded-xl shadow-2xl z-40 flex flex-col" style={{ height: '400px' }} ref={chatContainerRef}>
          {/* Header */}
          <div className="bg-amber-600 text-white p-3 rounded-t-xl flex justify-between items-center">
            <h3 className="font-bold">Chat</h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-amber-700 rounded p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <p>No messages yet</p>
                <p className="text-sm">Send an emoji or quick message!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.playerId === playerId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-2 ${
                      msg.playerId === playerId
                        ? 'bg-amber-500 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1">
                      {msg.playerId === playerId ? 'You' : msg.playerName}
                    </div>
                    <div className={msg.type === 'emoji' ? 'text-3xl' : 'text-sm'}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-gray-200 bg-white rounded-b-xl relative">
            <div className="flex gap-2">
              {/* Emoji Button */}
              <button
                onClick={() => {
                  setShowEmojis(!showEmojis);
                  setShowTexts(false);
                }}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-2 rounded-lg text-xl transition-colors"
              >
                😊
              </button>

              {/* Quick Text Button */}
              <button
                onClick={() => {
                  setShowTexts(!showTexts);
                  setShowEmojis(false);
                }}
                className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-900 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Quick Messages
              </button>
            </div>

            {/* Emoji Picker */}
            {showEmojis && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-3">
                <div className="grid grid-cols-6 gap-2">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => sendMessage(emoji, 'emoji')}
                      className="text-3xl hover:bg-gray-100 p-2 rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Text Picker */}
            {showTexts && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto">
                {QUICK_TEXTS.map((text) => (
                  <button
                    key={text}
                    onClick={() => sendMessage(text, 'text')}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm transition-colors"
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
