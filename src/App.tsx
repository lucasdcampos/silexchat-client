import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { AuthPage } from './pages/AuthPage';
import { WelcomeView } from './views/WelcomeView';
import { NewChatModal } from './views/NewChatModal';
import type { User } from './models/user';
import type { Chat } from './models/chat';
import { ChatView } from './views/ChatView';
import { io, Socket } from 'socket.io-client';
import type { Message } from './models/message';
import { SettingsModal } from './views/SettingsModal';
import { ProfileModal } from './views/ProfileModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('silex_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [profileModalData, setProfileModalData] = useState<User | Chat | null>(null);

  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

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
        setChats(prevChats => {
          const chatIndex = prevChats.findIndex(c => c.id === message.chatId);

          if (chatIndex !== -1) {
            const chatToUpdate = prevChats[chatIndex];
            const otherChats = prevChats.filter(c => c.id !== message.chatId);
            return [{ ...chatToUpdate, messages: [message], updatedAt: message.createdAt }, ...otherChats];
          } else {
            const fetchChatDetails = async () => {
              try {
                const res = await fetch(`${API_URL}/api/chats/${message.chatId}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                  const newChatData = await res.json();
                  setChats(currentChats => [newChatData, ...currentChats.filter(c => c.id !== newChatData.id)]);
                }
              } catch (error) {
                console.error("Error fetching details for hidden chat:", error);
              }
            };
            fetchChatDetails();
            return prevChats;
          }
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

  const handleHideChat = async (chatId: number) => {
    const token = localStorage.getItem('silex_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (activeChat?.id === chatId) {
          setActiveChat(null);
        }
      } else {
        console.error("Failed to hide chat on server");
      }
    } catch (error) {
      console.error("Error hiding chat:", error);
    }
  };

  const handleOpenProfile = (data: User | Chat) => {
    setProfileModalData(data);
  };

  const handleCloseProfile = () => {
    setProfileModalData(null);
  };

  const handleUpdateUser = (updatedUser: User, newToken: string) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('silex_token', newToken);
    setChats(prev => prev.map(c => {
      if (c.type === 'DM') {
        const participantIndex = c.participants.findIndex(p => p.user.id === updatedUser.id);
        if (participantIndex !== -1) {
          const newParticipants = [...c.participants];
          newParticipants[participantIndex].user = updatedUser;
          return { ...c, participants: newParticipants };
        }
      }
      return c;
    }));
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
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onHideChat={handleHideChat}
        onOpenProfile={handleOpenProfile}
      />
      <main className="flex-1 flex flex-col">
        {activeChat && currentUser && socket ? (
          <ChatView
            chat={activeChat}
            currentUser={currentUser}
            socket={socket}
            onClose={() => setActiveChat(null)}
            onOpenProfile={handleOpenProfile}
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
      {currentUser && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          currentUser={currentUser}
          onUpdateSuccess={handleUpdateUser}
        />
      )}

      <ProfileModal 
        data={profileModalData}
        onClose={handleCloseProfile}
      />
      
    </div>
  );
}
