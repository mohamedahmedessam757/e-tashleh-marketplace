
import React, { useEffect, useRef } from 'react';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { GlassCard } from '../../ui/GlassCard';
import { useChatStore } from '../../../stores/useChatStore';
import { useOrderChatStore } from '../../../stores/useOrderChatStore';

interface ChatLayoutProps {
  onNavigateToCheckout: () => void;
  viewId?: string;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ onNavigateToCheckout, viewId }) => {
  const { setActiveChat: setSupportChat, chats: supportChats, activeChatId } = useChatStore();
  const { setActiveChat: setOrderChat, chats: orderChats, activeChat, loadChat } = useOrderChatStore();
  const processedViewIdRef = useRef<string | null>(null);

  const hasActiveChat = !!activeChatId || !!activeChat;

  useEffect(() => {
    if (!viewId) return;
    
    // Skip if we already processed this viewId
    if (processedViewIdRef.current === viewId) return;

    // Case 1: activeChat is already set to this viewId (from fetchChat in OrderDetails)
    // No action needed — the store already has the right state
    if (activeChat?.id === viewId) {
      processedViewIdRef.current = viewId;
      return;
    }

    // Case 2: Chat exists in the loaded orderChats list
    const isOrderChat = orderChats.some(c => c.id === viewId);
    if (isOrderChat) {
      setOrderChat(viewId);
      processedViewIdRef.current = viewId;
      return;
    }

    // Case 3: Chat exists in support/legacy chats
    const isSupportChat = supportChats.some(c => c.id === viewId);
    if (isSupportChat) {
      setSupportChat(viewId);
      processedViewIdRef.current = viewId;
      return;
    }

    // Case 4: Chat not found in any list yet (race condition — chats not loaded)
    // Load it directly from the backend by ID
    loadChat(viewId);
    processedViewIdRef.current = viewId;

  }, [viewId, orderChats, supportChats, activeChat?.id, setOrderChat, setSupportChat, loadChat]);

  // Reset ref when viewId changes to allow re-processing
  useEffect(() => {
    if (!viewId) {
      processedViewIdRef.current = null;
    }
  }, [viewId]);

  return (
    <div className="h-[calc(100vh-140px)]">
      <GlassCard className="h-full p-0 flex overflow-hidden border-gold-500/10">
        <div className={`w-full md:w-1/3 md:min-w-[300px] h-full ${hasActiveChat ? 'hidden md:block' : 'block'}`}>
          <ChatList />
        </div>
        <div className={`flex-1 h-full ${!hasActiveChat ? 'hidden md:block' : 'block'}`}>
          <ChatWindow onNavigateToCheckout={onNavigateToCheckout} />
        </div>
      </GlassCard>
    </div>
  );
};
