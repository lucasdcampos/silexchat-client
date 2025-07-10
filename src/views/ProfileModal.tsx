import { useEffect, useState } from "react";
import { Avatar } from "../components/Avatar";
import type { User } from "../models/user";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const StatusIndicator = ({ status }: { status?: string }) => {
  const statusClasses = {
    ONLINE: 'bg-green-500',
    AFK: 'bg-yellow-500',
    OFFLINE: 'bg-gray-500',
  }[status || 'OFFLINE'];

  return <span className={`absolute bottom-0 right-0 block h-5 w-5 rounded-full border-2 border-gray-800 ${statusClasses}`}></span>;
};

interface ProfileModalProps {
  userId: number | null;
  onClose: () => void;
}

export function ProfileModal({ userId, onClose }: ProfileModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }

    const fetchUser = async () => {
      setLoading(true);
      const token = localStorage.getItem('silex_token');
      try {
        const res = await fetch(`${API_URL}/api/users/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data);
        } else {
          console.error("Failed to fetch user profile");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
        {loading && <p>Loading profile...</p>}
        {!loading && user && (
          <>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar avatarUrl={user.avatarUrl} username={user.username} size="lg" />
                <StatusIndicator status={user.status} />
              </div>
              <h2 className="text-2xl font-bold">{user.username}</h2>
              <div className="w-full pt-4 border-t border-gray-700">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">About</h3>
                <p className="text-sm text-gray-300 break-words">{user.about || 'No information available.'}</p>
              </div>
              <p className="text-xs text-gray-500 pt-2">User ID: {user.id}</p>
            </div>
            <button onClick={onClose} className="mt-6 w-full px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}