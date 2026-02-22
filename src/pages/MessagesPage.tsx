import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface MessagesPageProps {
  user: User | null;
  onLogout: () => void;
}

const MessagesPage = ({ user, onLogout }: MessagesPageProps) => {
  const { userId: initialUserId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);

  useEffect(() => {
    if (initialUserId) {
      setSelectedUserId(initialUserId);
    }
  }, [initialUserId]);

  const handleSelectConversation = (userId: string) => {
    setSelectedUserId(userId);
    // Update URL without full navigation if on mobile to keep state
    if (window.innerWidth < 768) {
      navigate(`/messages/${userId}`, { replace: true });
    }
  };

  const handleBackToList = () => {
    setSelectedUserId(null);
    navigate('/messages', { replace: true });
  };

  return (
    <div className="h-screen bg-background text-white flex flex-col overflow-hidden">
      <Navbar user={user} onLogout={onLogout} />
      <main className="flex-1 flex md:grid md:grid-cols-3 lg:grid-cols-4 h-[calc(100vh-81px)] overflow-hidden">
        {/* Left Column: Conversation List - Hidden on mobile if a chat is selected */}
        <div className={`
          ${selectedUserId ? 'hidden md:flex' : 'flex'} 
          w-full md:w-auto md:col-span-1 lg:col-span-1 border-r border-border h-full overflow-hidden min-w-0 flex-col
        `}>
          <ConversationList 
            onSelectConversation={handleSelectConversation}
            selectedUserId={selectedUserId}
          />
        </div>

        {/* Right Column: Chat Window - Hidden on mobile if no chat is selected */}
        <div className={`
          ${selectedUserId ? 'flex' : 'hidden md:flex'} 
          w-full md:w-auto md:col-span-2 lg:col-span-3 h-full overflow-hidden min-w-0 flex-col
        `}>
          <ChatWindow 
            selectedUserId={selectedUserId}
            currentUser={user} 
            onBack={handleBackToList}
          />
        </div>
      </main>
    </div>
  );
};

export default MessagesPage;
