import React, { useState, useEffect } from 'react';
import type { Chat } from '../models/chat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatStarted: (chat: Chat) => void;
}

export function NewChatModal({ isOpen, onClose, onChatStarted }: NewChatModalProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = localStorage.getItem('silex_token');
    try {
      const res = await fetch(`${API_URL}/api/chats/dm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ partnerUsername: username }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start chat.');

      onChatStarted(data);
      onClose();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50">
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
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700" disabled={loading}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? 'Starting...' : 'Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
