import React, { useState, useEffect } from 'react';
import type { Conversation, User } from '../models/user';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (user: Conversation) => void;
}

export function NewChatModal({ isOpen, onClose, onStartChat }: NewChatModalProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        const token = localStorage.getItem('silex_token');
        const res = await fetch(`${API_URL}/api/users/users`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setAllUsers(data);
      };
      fetchUsers();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (targetUser) {
      onStartChat({ ...targetUser, unreadCount: 0 });
      onClose();
      setUsername('');
      setError('');
    } else {
      setError(`User "${username}" not found.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4">Start a new conversation</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter username"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">Chat</button>
          </div>
        </form>
      </div>
    </div>
  );
}
