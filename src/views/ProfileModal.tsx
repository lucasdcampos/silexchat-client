import type { User } from '../models/user';
import { Avatar } from '../components/Avatar';

interface ProfileModalProps {
  user: User | null;
  onClose: () => void;
}

export function ProfileModal({ user, onClose }: ProfileModalProps) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-4">
          <Avatar avatarUrl={user.avatarUrl} username={user.username} size="lg" />
          <h2 className="text-2xl font-bold">{user.username}</h2>
          <p className="text-sm text-gray-400">User ID: {user.id}</p>
        </div>
        <button onClick={onClose} className="mt-6 w-full px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700">
          Close
        </button>
      </div>
    </div>
  );
}