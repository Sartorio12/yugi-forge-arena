import { createContext, useState, useContext, ReactNode } from 'react';

interface ChatWindowState {
  userId: string;
  minimized: boolean;
}

interface ChatContextType {
  openChats: ChatWindowState[];
  openChat: (userId: string) => void;
  closeChat: (userId: string) => void;
  toggleMinimize: (userId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [openChats, setOpenChats] = useState<ChatWindowState[]>([]);

  const openChat = (userId: string) => {
    setOpenChats(currentChats => {
      // If chat is already open, focus it (bring to front) but don't add duplicates
      if (currentChats.some(c => c.userId === userId)) {
        return [
          ...currentChats.filter(c => c.userId !== userId),
          { userId, minimized: false } // Bring to front and ensure it's not minimized
        ];
      }
      // Limit number of open chats to 4
      if (currentChats.length >= 4) {
          // Replace the oldest (first) chat
          return [...currentChats.slice(1), { userId, minimized: false }];
      }
      return [...currentChats, { userId, minimized: false }];
    });
  };

  const closeChat = (userId: string) => {
    setOpenChats(currentChats => currentChats.filter(c => c.userId !== userId));
  };

  const toggleMinimize = (userId: string) => {
    setOpenChats(currentChats =>
      currentChats.map(c =>
        c.userId === userId ? { ...c, minimized: !c.minimized } : c
      )
    );
  };

  const value = { openChats, openChat, closeChat, toggleMinimize };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
