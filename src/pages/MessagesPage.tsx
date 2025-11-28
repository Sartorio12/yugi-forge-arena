import { useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";

interface MessagesPageProps {
  user: User | null;
  onLogout: () => void;
}

const MessagesPage = ({ user, onLogout }: MessagesPageProps) => {
  const { userId: initialUserId } = useParams<{ userId?: string }>();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);

  return (
    <div className="h-screen bg-background text-white flex flex-col">
      <Navbar user={user} onLogout={onLogout} />
      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
        {/* Left Column: Conversation List */}
        <div className="md:col-span-1 lg:col-span-1 border-r border-border h-full">
          <ConversationList 
            onSelectConversation={setSelectedUserId}
            selectedUserId={selectedUserId}
          />
        </div>

        {/* Right Column: Chat Window */}
        <div className="md:col-span-2 lg:col-span-3 h-[calc(100vh-81px)]">
          <ChatWindow 
            selectedUserId={selectedUserId}
            currentUser={user} 
          />
        </div>
      </main>
    </div>
  );
};

export default MessagesPage;
