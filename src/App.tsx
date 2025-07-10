import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { AuthPage } from './pages/AuthPage';
import { WelcomeView } from './views/WelcomeView';
import { NewChatModal } from './views/NewChatModal';
import type { User } from './models/user';
import type { Chat } from './models/chat';
import { ChatView } from './views/ChatView';
import { io, Socket } from 'socket.io-client';
import type { Message } from './models/message';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('silex_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('silex_token');
    if (isAuthenticated && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload);
      } catch (e) {
        handleLogout();
        return;
      }

      const newSocket = io(API_URL, { auth: { token } });
      setSocket(newSocket);

      newSocket.on('chatMessage', (message: Message) => {
        setChats(prev => {
          const chatToUpdate = prev.find(c => c.id === message.chatId);
          if (!chatToUpdate) return prev;
          const otherChats = prev.filter(c => c.id !== message.chatId);
          return [{ ...chatToUpdate, messages: [message], updatedAt: message.createdAt }, ...otherChats];
        });
      });

      const fetchChats = async () => {
        try {
          const res = await fetch(`${API_URL}/api/chats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setChats(data);
          }
        } catch (error) {
          console.error("Error fetching chats:", error);
        }
      };
      fetchChats();

      return () => {
        newSocket.off('chatMessage');
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    socket?.disconnect();
    setSocket(null);
    localStorage.removeItem('silex_token');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setChats([]);
    setActiveChat(null);
  };

  const handleChatStarted = (newChat: Chat) => {
    setChats(prev => {
      const existing = prev.find(c => c.id === newChat.id);
      if (existing) {
        return [existing, ...prev.filter(c => c.id !== newChat.id)];
      }
      return [newChat, ...prev];
    });
    setActiveChat(newChat);
  };

  if (!isAuthenticated) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white font-sans">
      <Sidebar
        currentUser={currentUser}
        chats={chats}
        activeChatId={activeChat?.id}
        onSelectChat={setActiveChat}
        onNewChat={() => setIsNewChatModalOpen(true)}
        onLogout={handleLogout}
      />
      <main className="flex-1 flex flex-col">
        {activeChat && currentUser && socket ? (
          <ChatView
            chat={activeChat}
            currentUser={currentUser}
            socket={socket}
            onClose={() => setActiveChat(null)}
          />
        ) : (
          <WelcomeView />
        )}
      </main>
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onChatStarted={handleChatStarted}
      />
    </div>
  );
}