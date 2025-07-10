import { Avatar } from './Avatar';
import type { Chat } from '../models/chat';
import type { User } from '../models/user';

const getChatDisplayData = (chat: Chat, currentUserId: number) => {
  if (chat.type === 'GROUP') {
    return {
      name: chat.name,
      avatarUrl: chat.avatarUrl,
    };
  } else { // DM
    const otherParticipant = chat.participants.find(p => p.user.id !== currentUserId);
    return {
      name: otherParticipant?.user.username,
      avatarUrl: otherParticipant?.user.avatarUrl,
    };
  }
};

interface SidebarProps {
  currentUser: User | null;
  chats: Chat[];
  activeChatId?: number | null;
  onSelectChat: (chat: Chat) => void;
  onNewChat: () => void;
  onLogout: () => void;
}

export function Sidebar({ currentUser, chats, activeChatId, onSelectChat, onNewChat, onLogout }: SidebarProps) {
  return (
    <aside className="w-80 bg-gray-800 flex flex-col p-3">
      <button onClick={onNewChat} className="w-full py-2 mb-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors">
        New Chat
      </button>
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xs font-bold text-gray-400 uppercase px-2 mb-2">Chats</h2>
        <ul>
          {chats.map(chat => {
            const displayData = getChatDisplayData(chat, currentUser!.id);
            return (
              <li key={chat.id} 
                  className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-700 ${activeChatId === chat.id ? 'bg-gray-700' : ''}`}
                  onClick={() => onSelectChat(chat)}>
                <Avatar avatarUrl={displayData.avatarUrl} username={displayData.name} size="sm" />
                <span className="ml-3 flex-1 truncate">{displayData.name}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="pt-2 border-t border-gray-700">
        <div className="flex items-center justify-between">
          {currentUser && (
            <div className="flex items-center gap-3 flex-1 truncate p-1">
              <Avatar avatarUrl={currentUser.avatarUrl} username={currentUser.username} />
              <span className="font-semibold truncate">{currentUser.username}</span>
            </div>
          )}
          <button onClick={onLogout} className="text-sm text-gray-400 hover:text-white">
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}