import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import type { Conversation, User } from '../models/user';
import { ParsedMessage } from '../components/ParsedMessage';
import { MessageActions } from '../MessageActions';
import { Avatar } from '../components/Avatar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

interface Message {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
}

interface ChatViewProps {
  currentUser: User;
  conversationUser: Conversation;
  socket: Socket | null;
  onNewMessageSent: () => void;
  onClose: () => void;
}

export function ChatView({ currentUser, conversationUser, socket, onNewMessageSent, onClose }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handlePrivateMessage = (message: Message & { sender: User }) => {
      if (message.senderId === conversationUser.id) {
        setMessages(prev => [...prev, message]);
      }
    };

    const handleMessageDeleted = ({ messageId }: { messageId: number }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    };

    const handleMessageConfirmed = ({ tempId, message }: { tempId: number, message: Message }) => {
      setMessages(prev => 
        prev.map(m => (m.id === tempId ? message : m))
      );
    };
    
    socket.on('privateMessage', handlePrivateMessage);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('messageConfirmed', handleMessageConfirmed);

    const fetchHistory = async () => {
      const token = localStorage.getItem('silex_token');
      try {
        const res = await fetch(`${API_URL}/api/messages/conversation/${conversationUser.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setMessages(data);
      } catch (error) {
        console.error('Failed to fetch chat history', error);
      }
    };
    
    fetchHistory();

    return () => {
      socket.off('privateMessage', handlePrivateMessage);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('messageConfirmed', handleMessageConfirmed);
    };
  }, [conversationUser.id, socket]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      const tempId = -Math.random();
      const payload = { 
        recipientId: conversationUser.id, 
        content: newMessage,
        tempId: tempId 
      };
      socket.emit('privateMessage', payload);
      setMessages(prev => [...prev, { id: tempId, senderId: currentUser.id, content: newMessage, createdAt: new Date().toISOString() }]);
      setNewMessage('');
      onNewMessageSent();
    }
  };

  const handleCopyId = (id: number) => {
    if (id > 0) {
        navigator.clipboard.writeText(id.toString());
    }
    setActiveMenu(null);
  };

  const handleDelete = async (id: number) => {
    if (id < 0) {
        setActiveMenu(null);
        return;
    }
    const token = localStorage.getItem('silex_token');
    try {
      const res = await fetch(`${API_URL}/api/messages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== id));
      } else {
        console.error("Failed to delete message");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
    setActiveMenu(null);
  };

  return (
    <>
      <header className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Avatar avatarUrl={conversationUser.avatarUrl} username={conversationUser.username} />
          <h2 className="text-xl font-semibold">{conversationUser.username}</h2>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors">
          <XIcon className="h-5 w-5" />
        </button>
      </header>
      <div className="flex-1 p-4 md:px-6 lg:px-8 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`group flex items-center gap-2 mb-2 ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            {msg.senderId === currentUser.id && (
              <div className="relative">
                <button onClick={() => setActiveMenu(activeMenu === msg.id ? null : msg.id)} className="opacity-0 group-hover:opacity-100 text-gray-400">
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                {activeMenu === msg.id && (
                  <MessageActions messageId={msg.id} onCopy={handleCopyId} onDelete={handleDelete} />
                )}
              </div>
            )}
            <div className={`max-w-xl p-3 rounded-lg ${
                msg.senderId === currentUser.id 
                ? 'bg-indigo-600 self-end rounded-br-none' 
                : 'bg-gray-700 self-start rounded-bl-none'
            }`}>
                <ParsedMessage text={msg.content} />
                <p className={`text-xs mt-1 text-right ${
                    msg.senderId === currentUser.id 
                    ? 'text-indigo-200' 
                    : 'text-gray-400'
                }`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <footer className="p-4 border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" className="ml-4 p-3 bg-indigo-600 rounded-full hover:bg-indigo-700 transition-colors">
            Send
          </button>
        </form>
      </footer>
    </>
  );
}