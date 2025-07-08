import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { User } from '../models/user';

const API_URL = 'http://localhost:3000';

interface Message {
  senderId: number;
  content: string;
  createdAt: string;
}

interface ChatViewProps {
  currentUser: User;
  conversationUser: User;
}

export function ChatView({ currentUser, conversationUser }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('silex_token');
    if (!token) return;

    const newSocket = io(API_URL, { auth: { token } });
    setSocket(newSocket);

    newSocket.on('privateMessage', (message: Message) => {
      if (message.senderId === conversationUser.id) {
        setMessages(prev => [...prev, message]);
      }
    });

    const fetchHistory = async () => {
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

    return () => { newSocket.disconnect(); };
  }, [conversationUser.id]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      const payload = { recipientId: conversationUser.id, content: newMessage };
      socket.emit('privateMessage', payload);
      setMessages(prev => [...prev, { senderId: currentUser.id, content: newMessage, createdAt: new Date().toISOString() }]);
      setNewMessage('');
    }
  };

  return (
    <>
      <header className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold">{conversationUser.username}</h2>
      </header>
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`flex mb-4 ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md px-4 py-2 rounded-lg ${msg.senderId === currentUser.id ? 'bg-indigo-600' : 'bg-gray-700'}`}>
              <p>{msg.content}</p>
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