import React, { useState, useEffect } from 'react';
import type { User } from '../models/user';
import { Avatar } from '../components/Avatar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateSuccess: (updatedUser: User, newToken: string) => void;
}

export function SettingsModal({ isOpen, onClose, currentUser, onUpdateSuccess }: SettingsModalProps) {
  const [username, setUsername] = useState(currentUser.username);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsername(currentUser.username);
      setAvatarUrl(currentUser.avatarUrl || '');
      setError('');
    }
  }, [isOpen, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const token = localStorage.getItem('silex_token');
    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ username, avatarUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update settings.');

      onUpdateSuccess(data.user, data.token);
      onClose();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-6">User Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar avatarUrl={avatarUrl} username={username} size="lg" />
            <input
              type="text"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="Avatar URL"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              required
              className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}