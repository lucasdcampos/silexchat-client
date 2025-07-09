import React from 'react';
import type { Conversation, User } from '../models/user';
import { Avatar } from './Avatar';

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.15l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2.15l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

interface SidebarProps {
  currentUser: User | null;
  conversations: Conversation[];
  onSelectConversation: (user: Conversation) => void;
  selectedConversationId?: number | null;
  onNewChat: () => void;
  onLogout: () => void;
  onHideConversation: (partnerId: number) => void;
  onOpenSettings: () => void;
}

export function Sidebar({ currentUser, conversations, onSelectConversation, selectedConversationId, onNewChat, onLogout, onHideConversation, onOpenSettings }: SidebarProps) {
  return (
    <aside className="w-80 bg-gray-800 flex flex-col p-3">
      <button onClick={onNewChat} className="w-full py-2 mb-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors">
        New Chat
      </button>
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xs font-bold text-gray-400 uppercase px-2 mb-2">Conversations</h2>
        <ul>
          {conversations.map(user => (
            <li key={user.id} 
                className={`group flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-700 ${selectedConversationId === user.id ? 'bg-gray-700' : ''}`}
                onClick={() => onSelectConversation(user)}>
              <div className="flex items-center gap-3 flex-1 truncate">
                <Avatar avatarUrl={user.avatarUrl} username={user.username} size="sm" />
                <span className="flex-1 truncate">{user.username}</span>
              </div>
              {user.unreadCount > 0 && (
                <span className="ml-2 bg-indigo-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                  {user.unreadCount}
                </span>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onHideConversation(user.id);
                }}
                className="p-1 rounded-full text-gray-500 hover:bg-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0"
                aria-label={`Hide conversation with ${user.username}`}>
                  <XIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="pt-2 border-t border-gray-700">
        <div className="flex items-center justify-between gap-3">
          {currentUser && (
            <div className="flex items-center gap-3 flex-1 truncate">
              <Avatar avatarUrl={currentUser.avatarUrl} username={currentUser.username} />
              <span className="font-semibold truncate">{currentUser.username}</span>
            </div>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onOpenSettings} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors">
              <SettingsIcon className="h-5 w-5" />
            </button>
            <button onClick={onLogout} className="text-sm text-gray-400 hover:text-white">
              Log out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}