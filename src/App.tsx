import { useEffect, useRef, useState } from "react";
import type { Chat } from "./models/chat";
import type { User } from "./models/user";
import { io, type Socket } from "socket.io-client";
import { Sidebar } from "./components/Sidebar";
import { AuthPage } from "./pages/AuthPage";
import { NewChatModal } from "./views/NewChatModal";
import { WelcomeView } from "./views/WelcomeView";
import { ChatView } from "./views/ChatView";
import { ProfileModal } from "./views/ProfileModal";
import { SettingsModal } from "./views/SettingsModal";
import { GroupSettingsModal } from "./views/GroupSettingsModal";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface MessageWithSender {
  id: number;
  senderId: number;
  chatId: number;
  content: string;
  createdAt: string;
  sender: User; 
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('silex_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [profileModalData, setProfileModalData] = useState<User | Chat | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [groupSettingsModalChat, setGroupSettingsModalChat] = useState<Chat | null>(null);
  const [isChatsLoading, setIsChatsLoading] = useState(true);

  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    const token = localStorage.getItem('silex_token');
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUser(payload);
    } catch (e) {
      handleLogout();
      return;
    }

    const newSocket = io(API_URL, { auth: { token } });
    setSocket(newSocket);

    const onConnect = () => {
      console.log('Socket connected, fetching initial data...');
      
      const fetchChats = async () => {
        try {
          setIsChatsLoading(true);
          const res = await fetch(`${API_URL}/api/chats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setChats(data);
          }
        } catch (error) {
          console.error("Error fetching chats:", error);
        } finally {
          setIsChatsLoading(false);
        }
      };
      fetchChats();
    };

    const onChatMessage = (message: MessageWithSender) => {
      setChats(prev => {
        const chatToUpdate = prev.find(c => c.id === message.chatId);
        if (!chatToUpdate) return prev;
        const otherChats = prev.filter(c => c.id !== message.chatId);
        return [{ ...chatToUpdate, messages: [message], updatedAt: message.createdAt }, ...otherChats];
      });
    };

    const onUserStatusChange = ({ userId, status }: { userId: number, status: string }) => {
      setChats(prev => 
          prev.map(c => {
            if (c.type === 'DM') {
              const participantIndex = c.participants.findIndex(p => p.user.id === userId);
              if (participantIndex !== -1) {
                const newParticipants = [...c.participants];
                newParticipants[participantIndex].user.status = status as any;
                return { ...c, participants: newParticipants };
              }
            }
            return c;
          })
      );
      setCurrentUser(prev => 
          prev && prev.id === userId ? { ...prev, status: status as any } : prev
      );
    };

    newSocket.on('connect', onConnect);
    newSocket.on('chatMessage', onChatMessage);
    newSocket.on('userStatusChange', onUserStatusChange);

    return () => { 
      newSocket.off('connect', onConnect);
      newSocket.off('chatMessage', onChatMessage);
      newSocket.off('userStatusChange', onUserStatusChange);
      newSocket.disconnect(); 
    };
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

  const handleUpdateUser = (updatedUser: User, newToken: string) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('silex_token', newToken);
    setChats(prev => prev.map(c => {
        if(c.type === 'DM') {
            const participantIndex = c.participants.findIndex(p => p.user.id === updatedUser.id);
            if(participantIndex > -1) {
                const newParticipants = [...c.participants];
                newParticipants[participantIndex].user = { ...newParticipants[participantIndex].user, ...updatedUser };
                return { ...c, participants: newParticipants };
            }
        }
        return c;
    }));
  };

  const handleOpenProfile = (data: User | Chat) => {
    setProfileModalData(data);
  };

  const handleCloseProfile = () => {
    setProfileModalData(null);
  };

  if (!isAuthenticated) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  const handleOpenGroupSettings = (chat: Chat) => {
    setProfileModalData(null);
    setGroupSettingsModalChat(chat);
  };

  const handleCloseGroupSettings = () => {
    setGroupSettingsModalChat(null);
  };

  const handleUpdateGroup = (updatedChat: Chat) => {
    setChats(prev => prev.map(c => c.id === updatedChat.id ? updatedChat : c));
    if (activeChat?.id === updatedChat.id) {
      setActiveChat(updatedChat);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white font-sans">
      <Sidebar
        isChatsLoading={isChatsLoading}
        currentUser={currentUser}
        chats={chats}
        activeChatId={activeChat?.id}
        onSelectChat={setActiveChat}
        onNewChat={() => setIsNewChatModalOpen(true)}
        onLogout={handleLogout}
        onHideChat={handleHideChat}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
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
        currentUser={currentUser}
        onClose={handleCloseProfile}
        onOpenGroupSettings={handleOpenGroupSettings}
      />
      {groupSettingsModalChat && (
        <GroupSettingsModal
          isOpen={!!groupSettingsModalChat}
          onClose={handleCloseGroupSettings}
          chat={groupSettingsModalChat}
          onUpdateSuccess={handleUpdateGroup}
        />
      )}
      </div>
  );
}