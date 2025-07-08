import type { User } from "../models/user";

interface SidebarProps {
  currentUser: User | null;
  conversations: User[];
  onSelectConversation: (user: User) => void;
  selectedConversationId?: number | null;
  onNewChat: () => void;
  onLogout: () => void;
}

export function Sidebar({ currentUser, conversations, onSelectConversation, selectedConversationId, onNewChat, onLogout }: SidebarProps) {
  return (
    <aside className="w-80 bg-gray-800 flex flex-col p-3">
      <button onClick={onNewChat} className="w-full py-2 mb-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors">
        New Chat
      </button>
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xs font-bold text-gray-400 uppercase px-2 mb-2">Conversations</h2>
        <ul>
          {conversations.map(user => (
            <li key={user.id} onClick={() => onSelectConversation(user)}
              className={`p-2 rounded-md cursor-pointer hover:bg-gray-700 ${selectedConversationId === user.id ? 'bg-gray-700' : ''}`}>
              {user.username}
            </li>
          ))}
        </ul>
      </div>
      <div className="pt-2 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{currentUser?.username}</span>
          <button onClick={onLogout} className="text-sm text-gray-400 hover:text-white">
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}