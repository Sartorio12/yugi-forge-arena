import { useChat } from './ChatProvider';
import { FloatingChatWindow } from './FloatingChatWindow';
import { User } from '@supabase/supabase-js';

// This would typically come from the main App component
interface ChatDockProps {
  currentUser: User | null;
}

export const ChatDock = ({ currentUser }: ChatDockProps) => {
  const { openChats } = useChat();

  if (!currentUser || openChats.length === 0) {
    return null;
  }

  const CHAT_WIDTH = 328;
  const CHAT_MARGIN = 15;
  const DOCK_RIGHT_OFFSET = 80;

  return (
    <div className="fixed bottom-0 right-0 h-0 z-[1000] hidden md:flex items-end">
      {openChats.map((chat, index) => (
        <FloatingChatWindow
          key={chat.userId}
          currentUser={currentUser}
          otherUserId={chat.userId}
          isMinimized={chat.minimized}
          positionRight={DOCK_RIGHT_OFFSET + (index * (CHAT_WIDTH + CHAT_MARGIN))}
        />
      ))}
    </div>
  );
};
