import { useState, useEffect } from 'react';
import { ChatView } from './views/ChatView';
import { Sidebar } from './components/Sidebar';
import { AuthPage } from './pages/AuthPage';
import { WelcomeView } from './views/WelcomeView';
import { NewChatModal } from './views/NewChatModal';
import { io, type Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface User {
  id: number;
  username: string;
}

interface Message {
  senderId: number;
  content: string;
  createdAt: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('silex_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<User[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const updateConversationOrder = (partnerId: number) => {
    setConversations(prev => {
      const convIndex = prev.findIndex(c => c.id === partnerId);
      if (convIndex === -1) return prev; 
      
      const conversationToMove = prev[convIndex];
      const restOfConversations = prev.filter(c => c.id !== partnerId);
      
      return [conversationToMove, ...restOfConversations];
    });
  };

  useEffect(() => {
    const token = localStorage.getItem('silex_token');
    if (isAuthenticated && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser({ id: payload.id, username: payload.username });
      } catch (e) {
        handleLogout();
        return;
      }

      const newSocket = io(API_URL, { auth: { token } });
      setSocket(newSocket);

      newSocket.on('privateMessage', (message: Message) => {
        updateConversationOrder(message.senderId);
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

  const handleSelectConversation = (user: User) => {
    setSelectedConversation(user);
    if (!conversations.find(c => c.id === user.id)) {
      setConversations(prev => [user, ...prev]);
    }
  };

  const handleCloseConversation = () => {
    setSelectedConversation(null);
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
        onNewChat={() => setIsModalOpen(true)}
        onLogout={handleLogout}
      />
      <main className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatView
            key={selectedConversation.id}
            currentUser={currentUser!}
            conversationUser={selectedConversation}
            socket={socket}
            onNewMessageSent={() => updateConversationOrder(selectedConversation.id)}
            onClose={handleCloseConversation}
          />
        ) : (
          <WelcomeView />
        )}
      </main>
      <NewChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStartChat={handleSelectConversation}
      />
    </div>
  );
}