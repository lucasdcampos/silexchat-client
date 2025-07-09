import { useState, useEffect, useRef } from 'react';
import { ChatView } from './views/ChatView';
import { Sidebar } from './components/Sidebar';
import { AuthPage } from './pages/AuthPage';
import { WelcomeView } from './views/WelcomeView';
import { NewChatModal } from './views/NewChatModal';
import { io, type Socket } from 'socket.io-client';
import type { User, Conversation } from './models/user';
import { SettingsModal } from './views/SettingsModal';
import { ProfileModal } from './views/ProfileModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface MessageWithSender {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
  sender: User; 
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('silex_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [profileModalUser, setProfileModalUser] = useState<User | null>(null); 
  const [socket, setSocket] = useState<Socket | null>(null);

  const handleOpenProfile = (user: User) => {
    setProfileModalUser(user);
  };

  const handleCloseProfile = () => {
    setProfileModalUser(null);
  };

  const selectedConversationRef = useRef<Conversation | null>(null);
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  const updateConversationOrder = (partner: User) => {
    setConversations(prev => {
      const convIndex = prev.findIndex(c => c.id === partner.id);
      let conversationToMove: Conversation;

      if (convIndex !== -1) {
        conversationToMove = { ...prev[convIndex], ...partner };
      } else {
        conversationToMove = { ...partner, unreadCount: 0 };
      }
      
      const restOfConversations = prev.filter(c => c.id !== partner.id);
      return [conversationToMove, ...restOfConversations];
    });
  };

  useEffect(() => {
    const token = localStorage.getItem('silex_token');
    if (isAuthenticated && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser({ id: payload.id, username: payload.username, avatarUrl: payload.avatarUrl });
      } catch (e) {
        handleLogout();
        return;
      }

      const newSocket = io(API_URL, { auth: { token } });
      setSocket(newSocket);

      newSocket.on('privateMessage', (message: MessageWithSender) => {
        if (selectedConversationRef.current?.id !== message.sender.id) {
          setConversations(prev => prev.map(c => 
            c.id === message.sender.id 
              ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } 
              : c
          ));
        }
        updateConversationOrder(message.sender);
      });

      const fetchConversations = async () => {
        try {
          const res = await fetch(`${API_URL}/api/users/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setConversations(data);
          }
        } catch (error) {
          console.error("Error fetching conversations:", error);
        }
      };
      fetchConversations();

      return () => { newSocket.disconnect(); };
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
    setSelectedConversation(null);
    setConversations([]);
  };

  const handleSelectConversation = (user: Conversation) => {
    const token = localStorage.getItem('silex_token');
    if (token && user.unreadCount > 0) {
      fetch(`${API_URL}/api/messages/conversation/${user.id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(err => console.error("Failed to mark as read:", err));
    }

    setSelectedConversation({ ...user, unreadCount: 0 });
    setConversations(prev => prev.map(c => 
      c.id === user.id ? { ...c, unreadCount: 0 } : c
    ));
    
    if (!conversations.find(c => c.id === user.id)) {
      setConversations(prev => [{ ...user, unreadCount: 0 }, ...prev]);
    }
  };
  
  const handleHideConversation = async (partnerId: number) => {
    const token = localStorage.getItem('silex_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/users/conversations/${partnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== partnerId));
        if (selectedConversation?.id === partnerId) {
          setSelectedConversation(null);
        }
      } else {
        console.error("Failed to hide conversation on server");
      }
    } catch (error) {
      console.error("Error hiding conversation:", error);
    }
  };

  const handleCloseConversation = () => {
    setSelectedConversation(null);
  };
  
  const handleUpdateUser = (updatedUser: User, newToken: string) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('silex_token', newToken);
    setConversations(prev => prev.map(c => c.id === updatedUser.id ? { ...c, ...updatedUser } : c));
  };

  if (!isAuthenticated) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white font-sans">
      <Sidebar
        currentUser={currentUser}
        conversations={conversations}
        onSelectConversation={handleSelectConversation}
        selectedConversationId={selectedConversation?.id}
        onNewChat={() => setIsNewChatModalOpen(true)}
        onLogout={handleLogout}
        onHideConversation={handleHideConversation}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenProfile={handleOpenProfile}
      />
      <main className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatView
            key={selectedConversation.id}
            currentUser={currentUser!}
            conversationUser={selectedConversation}
            socket={socket}
            onNewMessageSent={() => updateConversationOrder(selectedConversation)}
            onClose={handleCloseConversation}
            onOpenProfile={handleOpenProfile}
          />
        ) : (
          <WelcomeView />
        )}
      </main>
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onStartChat={handleSelectConversation}
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
        user={profileModalUser}
        onClose={handleCloseProfile}
      />
    </div>
  );
}