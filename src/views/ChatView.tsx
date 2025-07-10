import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import type { User } from '../models/user';
import { ParsedMessage } from '../components/ParsedMessage';
import { Avatar } from '../components/Avatar';
import type { Message } from '../models/message';
import type { Chat } from '../models/chat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getChatDisplayData = (chat: Chat, currentUserId: number) => {
  if (chat.type === 'GROUP') {
    return { name: chat.name, avatarUrl: chat.avatarUrl };
  }
  const otherParticipant = chat.participants.find(p => p.user.id !== currentUserId);
  return {
    name: otherParticipant?.user.username,
    avatarUrl: otherParticipant?.user.avatarUrl,
  };
};

interface ChatViewProps {
  chat: Chat;
  currentUser: User;
  socket: Socket | null;
  onClose: () => void;
}

export function ChatView({ chat, currentUser, socket, onClose }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const displayData = getChatDisplayData(chat, currentUser.id);

  useEffect(() => {
    if (!socket) return;

    const fetchHistory = async () => {
      const token = localStorage.getItem('silex_token');
      try {
        const res = await fetch(`${API_URL}/api/messages/${chat.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Failed to fetch chat history', error);
      }
    };
    fetchHistory();

    const handleChatMessage = (message: Message) => {
      if (message.chatId === chat.id && message.senderId !== currentUser.id) {
        setMessages(prev => [...prev, message]);
      }
    };

    const handleMessageConfirmed = ({ tempId, message }: { tempId: number, message: Message }) => {
      setMessages(prev => 
        prev.map(m => (m.id === tempId ? message : m))
      );
    };

    socket.on('chatMessage', handleChatMessage);
    socket.on('messageConfirmed', handleMessageConfirmed);

    return () => {
      socket.off('chatMessage', handleChatMessage);
      socket.off('messageConfirmed', handleMessageConfirmed);
    };
  }, [chat.id, socket, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      const tempId = -Math.random();
      const temporaryMessage: Message = {
        id: tempId,
        senderId: currentUser.id,
        content: newMessage,
        createdAt: new Date().toISOString(),
        chatId: chat.id,
        sender: currentUser,
      };
      
      setMessages(prev => [...prev, temporaryMessage]);

      socket.emit('chatMessage', {
        chatId: chat.id,
        content: newMessage,
        tempId: tempId,
      });
      setNewMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Avatar avatarUrl={displayData.avatarUrl} username={displayData.name} />
          <h2 className="text-xl font-semibold">{displayData.name}</h2>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">&times;</button>
      </header>
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, index) => {
          const isSender = msg.senderId === currentUser.id;
          const showHeader = !isSender && (index === 0 || messages[index - 1].senderId !== msg.senderId);

          return (
            <div key={msg.id} className={`flex items-start gap-3 ${isSender ? 'justify-end' : 'justify-start'} ${showHeader ? 'mt-4' : 'mt-1'}`}>
              <div className="w-8 flex-shrink-0">
                {showHeader && (
                  <Avatar avatarUrl={msg.sender?.avatarUrl} username={msg.sender?.username} size="sm" />
                )}
              </div>
              
              <div className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}>
                {showHeader && (
                  <span className="text-sm font-semibold text-gray-300 mb-1 ml-2">{msg.sender?.username}</span>
                )}
                <div className={`max-w-lg p-3 rounded-lg ${
                    isSender 
                    ? 'bg-indigo-600' 
                    : 'bg-gray-700'
                }`}>
                    <div className="flex items-end gap-2">
                      <div className="min-w-0">
                        <ParsedMessage text={msg.content} />
                      </div>
                      <span className={`text-xs flex-shrink-0 pb-0.5 ${
                          isSender ? 'text-indigo-200' : 'text-gray-400'
                      }`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <footer className="p-4 border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" className="ml-4 p-3 bg-indigo-600 rounded-full hover:bg-indigo-700">&rarr;</button>
        </form>
      </footer>
    </div>
  );
}