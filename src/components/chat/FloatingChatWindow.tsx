import { useChat } from './ChatProvider';
import { ChatWindow } from './ChatWindow';
import { useProfile } from '@/hooks/useProfile';
import { FramedAvatar } from '../FramedAvatar';
import { Button } from '@/components/ui/button';
import { X, Minus } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface FloatingChatWindowProps {
  currentUser: User;
  otherUserId: string;
  isMinimized: boolean;
  positionRight: number;
}

export const FloatingChatWindow = ({ currentUser, otherUserId, isMinimized, positionRight }: FloatingChatWindowProps) => {
  const { closeChat, toggleMinimize } = useChat();
  const { profile: otherUser } = useProfile(otherUserId);

  const header = (
    <div
      className="flex items-center justify-between p-2 bg-card border-b border-border rounded-t-lg cursor-pointer h-[48px]"
      onClick={() => toggleMinimize(otherUserId)}
    >
      <div className="flex items-center gap-2 truncate">
        <div className="relative flex-shrink-0">
          <FramedAvatar
            userId={otherUserId}
            avatarUrl={otherUser?.avatar_url}
            frameUrl={otherUser?.equipped_frame_url}
            username={otherUser?.username}
            sizeClassName="h-8 w-8"
          />
          {otherUser?.is_online && (
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
          )}
        </div>
        <span className="font-bold text-sm truncate">{otherUser?.username}</span>
      </div>
      <div className="flex items-center flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toggleMinimize(otherUserId); }}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); closeChat(otherUserId); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed bottom-0 bg-card border border-b-0 border-border shadow-lg rounded-t-lg flex flex-col transition-all duration-300 ease-in-out"
      style={{
        right: `${positionRight}px`,
        width: '328px',
        height: isMinimized ? '48px' : '455px',
        boxShadow: '0 12px 28px 0 rgba(0,0,0,0.2), 0 2px 4px 0 rgba(0,0,0,0.1)',
      }}
    >
      {header}
      <div className={`flex-1 min-h-0 bg-background ${isMinimized ? 'hidden' : 'flex'}`}>
        <ChatWindow selectedUserId={otherUserId} currentUser={currentUser} showHeader={false} />
      </div>
    </div>
  );
};
