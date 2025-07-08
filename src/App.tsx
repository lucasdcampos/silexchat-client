import { useState, useEffect } from 'react';
import { AuthPage } from './pages/AuthPage';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './views/ChatView';
import { WelcomeView } from './views/WelcomeView';
import { NewChatModal } from './views/NewChatModal';
import type { User } from './models/user';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('silex_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<User[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('silex_token');
      try {
        const payload = JSON.parse(atob(token!.split('.')[1]));
        setCurrentUser({ id: payload.id, username: payload.username });
      } catch (e) {
        handleLogout();
      }
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
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