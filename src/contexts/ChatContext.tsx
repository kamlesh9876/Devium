import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { ref, onValue, update, onChildAdded, onChildChanged, onChildRemoved, off } from 'firebase/database';
import { firebaseChatService, Message, Conversation, ChatUser } from '../services/firebaseChatService';
import { useAuth } from './AuthContext';
import { rtdb } from '../firebase';

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  users: ChatUser[];
  currentConversation: Conversation | null;
  typingUsers: Record<string, string[]>;
  isLoading: boolean;
  error: string | null;
}

type ChatAction =
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_MESSAGES'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: { conversationId: string; message: Message } }
  | { type: 'SET_USERS'; payload: ChatUser[] }
  | { type: 'SET_CURRENT_CONVERSATION'; payload: Conversation | null }
  | { type: 'SET_TYPING_USERS'; payload: { conversationId: string; users: string[] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_CONVERSATION'; payload: Conversation };

const initialState: ChatState = {
  conversations: [],
  messages: {},
  users: [],
  currentConversation: null,
  typingUsers: {},
  isLoading: false,
  error: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: action.payload.messages,
        },
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: [
            ...(state.messages[action.payload.conversationId] || []),
            action.payload.message,
          ],
        },
      };

    case 'SET_USERS':
      return { ...state, users: action.payload };

    case 'SET_CURRENT_CONVERSATION':
      return { ...state, currentConversation: action.payload };

    case 'SET_TYPING_USERS':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.conversationId]: action.payload.users,
        },
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.id === action.payload.id ? action.payload : conv
        ),
        currentConversation:
          state.currentConversation?.id === action.payload.id
            ? action.payload
            : state.currentConversation,
      };

    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  sendMessage: (
    conversationId: string,
    content: string,
    sender: { id: string; name: string; email: string }
  ) => Promise<void>;
  createConversation: (
    conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>;
  createDirectChat: (targetUserId: string) => Promise<string>;
  searchUsers: (query: string) => Promise<ChatUser[]>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => Promise<void>;
  updateUserOnlineStatus: (userId: string, isOnline: boolean) => Promise<void>;
  refreshConversations: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user } = useAuth();
  const userId = user?.uid || null;

  /* -------------------- PROJECT-BASED CHAT CREATION -------------------- */
  useEffect(() => {
    if (!userId || !user) return;

    const createProjectChats = async () => {
      try {
        // Get all projects
        const projectsRef = ref(rtdb, 'projects');
        const projectsSnapshot = await new Promise<any>(resolve =>
          onValue(projectsRef, resolve, { onlyOnce: true })
        );
        const projects = Object.entries(projectsSnapshot.val() || {}).map(
          ([id, project]: [string, any]) => ({ id, ...project })
        );

        // Get all teams
        const teamsRef = ref(rtdb, 'teams');
        const teamsSnapshot = await new Promise<any>(resolve =>
          onValue(teamsRef, resolve, { onlyOnce: true })
        );
        const teams = Object.entries(teamsSnapshot.val() || {}).map(
          ([id, team]: [string, any]) => ({ id, ...team })
        );

        // Get existing conversations
        const conversationsRef = ref(rtdb, 'conversations');
        const conversationsSnapshot = await new Promise<any>(resolve =>
          onValue(conversationsRef, resolve, { onlyOnce: true })
        );
        const existingConversations = Object.entries(conversationsSnapshot.val() || {}).map(
          ([id, conv]: [string, any]) => ({ id, ...conv })
        );

        // Create ONE chat per project for user's assigned projects only
        for (const project of projects) {
          const projectTeam = teams.find(t => t.id === project.teamId);
          
          // Get project team members from Firebase or use provided project team data
          const projectMembers = projectTeam?.members || project.assignedMembers || [];

          // Only create chat if user is a project member and project is active
          if (!projectMembers.includes(userId) || project.archived) continue;

          const conversationId = `project_${project.id}`;
          const existing = existingConversations.find(c => c.id === conversationId);

          if (!existing) {
            // Create new project chat with real-time enabled
            await firebaseChatService.createConversation({
              name: project.name,
              type: 'project',
              participants: projectMembers,
              metadata: {
                projectId: project.id,
                teamId: project.teamId,
                teamName: projectTeam?.name,
                description: `Project chat for ${project.name}`,
                archived: project.archived || false
              },
            }, conversationId);
          } else {
            // Update existing project chat members and activity
            await firebaseChatService.updateConversation(conversationId, {
              participants: projectMembers,
              updatedAt: Date.now(),
              metadata: {
                ...existing.metadata,
                archived: project.archived || false
              }
            });
          }
        }
      } catch (e) {
        console.error('Error creating project chats:', e);
      }
    };

    createProjectChats();
  }, [userId, user]);
  /* -------------------- REAL-TIME SUBSCRIPTIONS -------------------- */
  useEffect(() => {
    if (!userId) return;

    // Real-time conversations listener with enhanced filtering
    const conversationsRef = ref(rtdb, 'conversations');
    const unsubscribeConversations = onValue(conversationsRef, (snapshot) => {
      const allConversations = snapshot.val() || {};
      const conversations = Object.entries(allConversations).map(
        ([id, conv]: [string, any]) => ({ id, ...conv })
      );
      
      // Enhanced filtering for real-time performance with deduplication
      const filtered = conversations.filter(
        c => {
          // Skip archived project chats
          if (c.type === 'project' && c.metadata?.archived) return false;
          
          // Include project chats where user is a member
          if (c.type === 'project' && c.participants?.includes(userId)) return true;
          
          // Include direct chats where user is a participant
          if (c.type === 'direct' && c.participants?.includes(userId)) return true;
          
          return false;
        }
      );
      
      // Remove duplicate project chats by keeping only one per projectId
      const uniqueConversations = [];
      const seenProjectIds = new Set();
      
      for (const conv of filtered) {
        if (conv.type === 'project') {
          const projectId = conv.metadata?.projectId;
          if (projectId && !seenProjectIds.has(projectId)) {
            seenProjectIds.add(projectId);
            uniqueConversations.push(conv);
          }
        } else {
          // Keep all direct chats
          uniqueConversations.push(conv);
        }
      }
      
      // Sort by last activity for better UX
      uniqueConversations.sort((a, b) => {
        const aTime = a.metadata?.lastActivity || a.updatedAt || 0;
        const bTime = b.metadata?.lastActivity || b.updatedAt || 0;
        return bTime - aTime;
      });
      
      dispatch({ type: 'SET_CONVERSATIONS', payload: uniqueConversations });
    });

    // Real-time users listener with online status
    const usersRef = ref(rtdb, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const allUsers = snapshot.val() || {};
      const users = Object.entries(allUsers).map(
        ([id, user]: [string, any]) => ({ 
          id, 
          ...user,
          isOnline: user.isOnline || false,
          lastSeen: user.lastSeen || Date.now()
        })
      );
      dispatch({ type: 'SET_USERS', payload: users });
    });

    // Real-time typing indicators listener
    const typingRef = ref(rtdb, 'typing');
    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      const typingData = snapshot.val() || {};
      const typingUsers: Record<string, string[]> = {};
      
      Object.entries(typingData).forEach(([conversationId, data]: [string, any]) => {
        if (data && typeof data === 'object') {
          const typingList = Object.keys(data).filter(userId => data[userId]);
          if (typingList.length > 0) {
            typingUsers[conversationId] = typingList;
          }
        }
      });
      
      dispatch({ type: 'SET_TYPING_USERS', payload: typingUsers });
    });

    return () => {
      off(conversationsRef);
      off(usersRef);
      off(typingRef);
    };
  }, [userId]);

  /* -------------------- REAL-TIME MESSAGES -------------------- */
  useEffect(() => {
    if (!state.currentConversation) return;

    // Real-time messages listener for current conversation
    const messagesRef = ref(rtdb, `messages/${state.currentConversation.id}`);
    const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
      const messagesData = snapshot.val() || {};
      const messages = Object.entries(messagesData).map(
        ([id, msg]: [string, any]) => ({ id, ...msg })
      ).sort((a, b) => a.timestamp - b.timestamp);
      
      dispatch({
        type: 'SET_MESSAGES',
        payload: { conversationId: state.currentConversation!.id, messages },
      });
    });

    return () => {
      off(messagesRef);
    };
  }, [state.currentConversation]);

  /* -------------------- ACTIONS -------------------- */
  const sendMessage = async (
    conversationId: string,
    content: string,
    sender: { id: string; name: string; email: string }
  ) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Send message with enhanced metadata
      const messageId = await firebaseChatService.sendMessage({
        conversationId,
        senderId: sender.id,
        senderName: sender.name,
        senderEmail: sender.email,
        content,
        type: 'text',
        read: false,
        metadata: {
          delivered: false,
          readReceipts: [],
          edited: false,
          deleted: false
        }
      });
      
      // Update conversation activity
      await firebaseChatService.updateConversation(conversationId, {
        updatedAt: Date.now(),
        metadata: {
          lastMessage: {
            id: messageId,
            content: content,
            senderName: sender.name
          }
        }
      });
      
      // Clear typing indicator
      await firebaseChatService.setTyping(conversationId, sender.id, false);
      
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const createConversation = async (
    conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>
  ) => firebaseChatService.createConversation(conversation);

  const createDirectChat = async (targetUserId: string): Promise<string> => {
    if (!userId || !user) throw new Error('User not authenticated');
    
    // Check if direct chat already exists
    const existingDirectChat = state.conversations.find(
      c => c.type === 'direct' && 
           c.participants.includes(userId) && 
           c.participants.includes(targetUserId) &&
           c.participants.length === 2
    );
    
    if (existingDirectChat) {
      return existingDirectChat.id;
    }
    
    // Get target user info
    const targetUser = state.users.find(u => u.id === targetUserId);
    if (!targetUser) throw new Error('User not found');
    
    // Create direct chat with fixed ID format
    const conversationId = `direct_${[userId, targetUserId].sort().join('_')}`;
    
    await firebaseChatService.createConversation({
      name: `${targetUser.name}`,
      type: 'direct',
      participants: [userId, targetUserId],
      metadata: {
        createdAt: Date.now()
      },
    }, conversationId);
    
    return conversationId;
  };

  const searchUsers = async (query: string): Promise<ChatUser[]> => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return state.users.filter(user => 
      user.id !== userId && // Don't include current user
      (user.email.toLowerCase().includes(lowerQuery) ||
       user.name.toLowerCase().includes(lowerQuery))
    );
  };

  const setCurrentConversation = (conversation: Conversation | null) =>
    dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversation });

  const setTyping = (conversationId: string, userId: string, isTyping: boolean) =>
    firebaseChatService.setTyping(conversationId, userId, isTyping);

  const updateUserOnlineStatus = (userId: string, isOnline: boolean) =>
    firebaseChatService.updateUserOnlineStatus(userId, isOnline);

  const refreshConversations = () => {};

  const addMemberToConversation = async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check if user is already a participant
      if (conversation.participants.includes(userId)) {
        console.log('User is already a participant in this conversation');
        return;
      }

      // Add user to participants
      const updatedParticipants = [...conversation.participants, userId];
      await firebaseChatService.updateConversation(conversationId, {
        participants: updatedParticipants,
        updatedAt: Date.now(),
        metadata: {
          ...conversation.metadata,
          lastActivity: Date.now()
        }
      });

      // Add a system message to notify about the new member
      const newUser = state.users.find(u => u.id === userId);
      const currentUser = state.users.find(u => u.id === user?.uid);
      
      if (newUser && currentUser) {
        await firebaseChatService.sendMessage({
          conversationId,
          senderId: 'system',
          senderName: 'System',
          senderEmail: 'system@chat.com',
          content: `${currentUser.name} added ${newUser.name} to the conversation`,
          type: 'system',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error adding member to conversation:', error);
      throw error;
    }
  };

  const removeMemberFromConversation = async (conversationId: string, userId: string): Promise<void> => {
    try {
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Remove user from participants
      const updatedParticipants = conversation.participants.filter(id => id !== userId);
      await firebaseChatService.updateConversation(conversationId, {
        participants: updatedParticipants,
        updatedAt: Date.now(),
        metadata: {
          ...conversation.metadata,
          lastActivity: Date.now()
        }
      });

      // Add a system message to notify about the member removal
      const removedUser = state.users.find(u => u.id === userId);
      const currentUser = state.users.find(u => u.id === user?.uid);
      
      if (removedUser && currentUser) {
        await firebaseChatService.sendMessage({
          conversationId,
          senderId: 'system',
          senderName: 'System',
          senderEmail: 'system@chat.com',
          content: `${currentUser.name} removed ${removedUser.name} from the conversation`,
          type: 'system',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error removing member from conversation:', error);
      throw error;
    }
  };

  return (
    <ChatContext.Provider
      value={{
        state,
        sendMessage,
        createConversation,
        createDirectChat,
        searchUsers,
        setCurrentConversation,
        setTyping,
        updateUserOnlineStatus,
        refreshConversations,
        addMemberToConversation,
        removeMemberFromConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
