import { ref, push, onValue, off, update, remove, serverTimestamp } from 'firebase/database';
import { rtdb } from '../firebase';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system';
  conversationId: string;
}

export interface Conversation {
  id: string;
  name: string;
  type: 'team' | 'project' | 'direct';
  participants: string[];
  lastMessage?: Message;
  createdAt: number;
  updatedAt: number;
  metadata?: {
    teamId?: string;
    teamName?: string;
    projectId?: string;
    description?: string;
  };
}

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: number;
}

class FirebaseChatService {
  // Conversation Management
  async createConversation(
    conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>,
    customId?: string
  ): Promise<string> {
    const conversationId = customId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversationRef = ref(rtdb, `conversations/${conversationId}`);

    const timestamp = Date.now();
    const fullConversation: Conversation = {
      ...conversation,
      id: conversationId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await update(conversationRef, fullConversation);
    return conversationId;
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
    const conversationRef = ref(rtdb, `conversations/${conversationId}`);
    await update(conversationRef, {
      ...updates,
      updatedAt: Date.now(),
    });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const conversationRef = ref(rtdb, `conversations/${conversationId}`);
    await remove(conversationRef);
  }

  // Message Management
  async sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<string> {
    const messagesRef = ref(rtdb, `messages/${message.conversationId}`);
    const newMessageRef = push(messagesRef);
    const messageId = newMessageRef.key;
    
    if (!messageId) {
      throw new Error('Failed to send message');
    }

    const fullMessage: Message = {
      ...message,
      id: messageId,
      timestamp: Date.now(),
    };

    await update(newMessageRef, fullMessage);
    
    // Update conversation's last message and timestamp
    await this.updateConversation(message.conversationId, {
      lastMessage: fullMessage,
    });

    return messageId;
  }

  async editMessage(conversationId: string, messageId: string, content: string): Promise<void> {
    const messageRef = ref(rtdb, `messages/${conversationId}/${messageId}`);
    await update(messageRef, {
      content,
      editedAt: Date.now(),
    });
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const messageRef = ref(rtdb, `messages/${conversationId}/${messageId}`);
    await remove(messageRef);
  }

  // Real-time Subscriptions
  subscribeToConversations(userId: string, callback: (conversations: Conversation[]) => void): () => void {
    const conversationsRef = ref(rtdb, 'conversations');
    
    const unsubscribe = onValue(conversationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const conversations: Conversation[] = Object.entries(data)
          .map(([id, conversation]: [string, any]) => ({
            id,
            ...conversation,
          }))
          .filter(conversation => 
            conversation.participants.includes(userId) || 
            (conversation.type === 'team' && this.isUserInTeam(userId, conversation.metadata?.teamId)) ||
            (conversation.type === 'project' && this.isUserInProject(userId, conversation.metadata?.projectId))
          )
          .sort((a, b) => b.updatedAt - a.updatedAt);
        
        callback(conversations);
      } else {
        callback([]);
      }
    });

    return unsubscribe;
  }

  subscribeToMessages(conversationId: string, callback: (messages: Message[]) => void): () => void {
    const messagesRef = ref(rtdb, `messages/${conversationId}`);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messages: Message[] = Object.entries(data)
          .map(([id, message]: [string, any]) => ({
            id,
            ...message,
          }))
          .sort((a, b) => a.timestamp - b.timestamp);
        
        callback(messages);
      } else {
        callback([]);
      }
    });

    return unsubscribe;
  }

  subscribeToUsers(callback: (users: ChatUser[]) => void): () => void {
    const usersRef = ref(rtdb, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const users: ChatUser[] = Object.entries(data)
          .map(([id, user]: [string, any]) => ({
            id,
            ...user,
          }));
        
        callback(users);
      } else {
        callback([]);
      }
    });

    return unsubscribe;
  }

  // User Management
  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const userRef = ref(rtdb, `users/${userId}`);
    await update(userRef, {
      isOnline,
      lastSeen: Date.now(),
    });
  }

  async updateUserProfile(userId: string, profile: Partial<ChatUser>): Promise<void> {
    const userRef = ref(rtdb, `users/${userId}`);
    await update(userRef, profile);
  }

  // Helper Methods
  private isUserInTeam(userId: string, teamId?: string): boolean {
    // This would need to be implemented based on your team data structure
    // For now, return false - you can implement this based on your actual team data
    return false;
  }

  private isUserInProject(userId: string, projectId?: string): boolean {
    // This would need to be implemented based on your project data structure
    // For now, return false - you can implement this based on your actual project data
    return false;
  }

  // Conversation Types
  async createTeamConversation(teamId: string, teamName: string, participants: string[]): Promise<string> {
    return this.createConversation({
      name: teamName,
      type: 'team',
      participants,
      metadata: {
        teamId,
        description: `Team chat for ${teamName}`,
      },
    });
  }

  async createProjectConversation(projectId: string, projectName: string, participants: string[]): Promise<string> {
    return this.createConversation({
      name: projectName,
      type: 'project',
      participants,
      metadata: {
        projectId,
        description: `Project chat for ${projectName}`,
      },
    });
  }

  async createDirectConversation(userId1: string, userId2: string, user1Name: string, user2Name: string): Promise<string> {
    return this.createConversation({
      name: `${user1Name} & ${user2Name}`,
      type: 'direct',
      participants: [userId1, userId2],
    });
  }

  // Typing Indicators
  async setTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    const typingRef = ref(rtdb, `typing/${conversationId}/${userId}`);
    if (isTyping) {
      await update(typingRef, {
        isTyping: true,
        timestamp: Date.now(),
      });
    } else {
      await remove(typingRef);
    }
  }

  subscribeToTyping(conversationId: string, callback: (typingUsers: string[]) => void): () => void {
    const typingRef = ref(rtdb, `typing/${conversationId}`);
    
    const unsubscribe = onValue(typingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const typingUsers = Object.entries(data)
          .filter(([_, typing]: [string, any]) => {
            // Remove typing indicators older than 5 seconds
            return typing.isTyping && (Date.now() - typing.timestamp) < 5000;
          })
          .map(([userId]) => userId);
        
        callback(typingUsers);
      } else {
        callback([]);
      }
    });

    return unsubscribe;
  }
}

export const firebaseChatService = new FirebaseChatService();
