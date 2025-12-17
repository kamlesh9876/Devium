import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  TextField,
  IconButton,
  Badge,
  Chip,
  Divider,
  Paper,
  Fab,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Zoom,
  Fade,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  Chat as ChatIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Work as WorkIcon,
  Circle as CircleIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Reply as ReplyIcon,
  DoneAll as ReadIcon,
  Done as DeliveredIcon,
  Schedule as PendingIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useChat } from '../../contexts/ChatContext';
import { Message, Conversation, ChatUser } from '../../services/firebaseChatService';

interface ChatInterfaceProps {
  conversationId?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
}

function ChatInterface({ conversationId, userId, userName, userEmail }: ChatInterfaceProps) {
  const { state, sendMessage, setCurrentConversation, setTyping, addMemberToConversation, removeMemberFromConversation, searchUsers } = useChat();
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Get messages for current conversation from real-time state
  const currentMessages = conversationId ? (state.messages[conversationId] || []) : [];
  const currentConversation = conversationId ? state.conversations.find(c => c.id === conversationId) : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, state.currentConversation]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !state.currentConversation) return;

    const content = messageInput.trim();
    setMessageInput('');
    setIsTyping(false);

    try {
      await sendMessage(state.currentConversation.id, content, {
        id: userId,
        name: user?.name || 'Unknown User', // Get from auth context
        email: user?.email || 'user@example.com', // Get from auth context
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'team':
        return <GroupIcon />;
      case 'project':
        return <WorkIcon />;
      case 'direct':
        return <PersonIcon />;
      default:
        return <ChatIcon />;
    }
  };

  const getConversationAvatar = (conversation: Conversation) => {
    const otherParticipant = conversation.participants.find(id => id !== userId);
    const user = state.users.find(u => u.id === otherParticipant);
    
    if (conversation.type === 'direct' && user) {
      return user.avatar || user.name.charAt(0).toUpperCase();
    }
    
    return conversation.name.charAt(0).toUpperCase();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getMessageStatusIcon = (message: Message) => {
    if (message.metadata?.deleted) return null;
    
    if (message.read) {
      return <ReadIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />;
    } else if (message.metadata?.delivered) {
      return <DeliveredIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />;
    } else {
      return <PendingIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} />;
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwn = message.senderId === userId;
    const showDate = index === 0 || 
      new Date(message.timestamp).toDateString() !== 
      new Date(currentMessages[index - 1]?.timestamp || 0).toDateString();
    
    // Find the sender's user data to get proper name
    const senderUser = state.users.find(u => u.id === message.senderId);
    const senderName = senderUser?.name || message.senderName || 'Unknown User';

    if (message.metadata?.deleted) {
      return (
        <Box key={message.id} sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Message deleted
          </Typography>
        </Box>
      );
    }

    return (
      <Fade in timeout={300} key={message.id}>
        <Box>
          {showDate && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <Chip
                label={formatDate(message.timestamp)}
                size="small"
                variant="outlined"
                sx={{ 
                  bgcolor: theme.palette.background.paper,
                  fontSize: '0.75rem'
                }}
              />
            </Box>
          )}
          <Box
            sx={{
              display: 'flex',
              justifyContent: isOwn ? 'flex-end' : 'flex-start',
              mb: 1,
              px: 2,
            }}
          >
            {!isOwn && (
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  mr: 1,
                  bgcolor: theme.palette.primary.light,
                  fontSize: '0.875rem'
                }}
              >
                {message.senderName?.charAt(0).toUpperCase()}
              </Avatar>
            )}
            <Box sx={{ maxWidth: '70%' }}>
              {!isOwn && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {message.senderName}
                </Typography>
              )}
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  bgcolor: isOwn ? theme.palette.primary.main : theme.palette.background.paper,
                  color: isOwn ? theme.palette.primary.contrastText : theme.palette.text.primary,
                  borderRadius: 2,
                  borderBottomRightRadius: isOwn ? 0 : 2,
                  borderBottomLeftRadius: isOwn ? 2 : 0,
                  boxShadow: theme.shadows[1],
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: theme.shadows[2],
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                  {message.content}
                </Typography>
              </Paper>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                <Typography variant="caption" color="text.secondary">
                  {formatTime(message.timestamp)}
                </Typography>
                {isOwn && getMessageStatusIcon(message)}
              </Box>
            </Box>
            {isOwn && (
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  ml: 1,
                  bgcolor: theme.palette.secondary.light,
                  fontSize: '0.875rem'
                }}
              >
                {userName?.charAt(0).toUpperCase()}
              </Avatar>
            )}
          </Box>
        </Box>
      </Fade>
    );
  };

  const renderMembersDialog = () => {
    if (!state.currentConversation) return null;

    const conversationUsers = state.currentConversation.participants
      .map(participantId => state.users.find(u => u.id === participantId))
      .filter(Boolean);

    return (
      <Dialog open={showMembersDialog} onClose={() => setShowMembersDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GroupIcon />
            <Typography variant="h6">
              {state.currentConversation.name} - Members
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <List>
            {conversationUsers.map((user) => (
              <ListItem key={user.id}>
                <ListItemAvatar>
                  <Avatar src={user.avatar} sx={{ bgcolor: 'primary.main' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={user.name}
                  secondary={user.email}
                />
                {user.id === userId && (
                  <Chip label="You" size="small" color="primary" />
                )}
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMembersDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {currentConversation ? currentConversation.name : 'Chat'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Conversations List */}
        <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', display: { xs: 'none', md: 'block' } }}>
          {/* General Team Chat */}
          <List sx={{ p: 0 }}>
            {state.conversations
              .filter(conv => conv.name === 'General Team Chat')
              .map((conversation) => (
                <ListItem
                  key={conversation.id}
                  button
                  selected={state.currentConversation?.id === conversation.id}
                  onClick={() => setCurrentConversation(conversation)}
                  sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      color="success"
                    >
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <GroupIcon />
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }} component="span">
                          {conversation.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={conversation.type}
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.6rem' }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {conversation.lastMessage && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }} component="span">
                            {conversation.lastMessage.content.length > 30
                              ? `${conversation.lastMessage.content.substring(0, 30)}...`
                              : conversation.lastMessage.content}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: 'text.secondary' }} component="span">
                          {conversation.lastMessage ? formatDate(conversation.lastMessage.timestamp) : ''}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
          </List>

          {/* Project Discussions Dropdown */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <FormControl fullWidth size="small">
              <InputLabel>Project Discussion</InputLabel>
              <Select
                value={state.currentConversation?.name?.startsWith('Project:') ? state.currentConversation.name : ''}
                label="Project Discussion"
                onChange={(e) => {
                  const selectedConversation = state.conversations.find(conv => conv.name === e.target.value);
                  if (selectedConversation) {
                    setCurrentConversation(selectedConversation);
                  }
                }}
              >
                {state.conversations
                  .filter(conv => conv.name.startsWith('Project:'))
                  .map((conversation) => {
                    // Get actual member names for this conversation
                    const projectName = conversation.name.replace('Project: ', '');
                    console.log(`Processing conversation: ${conversation.name}`);
                    console.log(`Project name extracted: ${projectName}`);
                    console.log(`Conversation participants:`, conversation.participants);
                    console.log(`Available users:`, state.users);
                    
                    const memberNames = conversation.participants
                      .map(participantId => {
                        const user = state.users.find(u => u.id === participantId);
                        console.log(`Looking for user ${participantId}, found:`, user);
                        return user ? user.name : `User ${participantId}`;
                      })
                      .slice(0, 3) // Show first 3 members to avoid overcrowding
                      .join(', ');
                    
                    const remainingCount = conversation.participants.length - 3;
                    const displayText = remainingCount > 0 
                      ? `${memberNames} +${remainingCount}` 
                      : memberNames;
                    
                    console.log(`Final display text for ${conversation.name}:`, displayText);
                    
                    return (
                      <MenuItem key={conversation.id} value={conversation.name}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WorkIcon fontSize="small" />
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {projectName}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
                            {displayText}
                          </Typography>
                        </Box>
                      </MenuItem>
                    );
                  })}
              </Select>
            </FormControl>
          </Box>

          {/* Other conversations (if any) */}
          <List sx={{ p: 0 }}>
            {state.conversations
              .filter(conv => 
                conv.name !== 'General Team Chat' && 
                !conv.name.startsWith('Project:')
              )
              .map((conversation) => (
                <ListItem
                  key={conversation.id}
                  button
                  selected={state.currentConversation?.id === conversation.id}
                  onClick={() => setCurrentConversation(conversation)}
                  sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      color={conversation.type === 'direct' ? 'success' : 'primary'}
                    >
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {getConversationAvatar(conversation)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }} component="span">
                          {conversation.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={conversation.type}
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.6rem' }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {conversation.lastMessage && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }} component="span">
                            {conversation.lastMessage.content.length > 30
                              ? `${conversation.lastMessage.content.substring(0, 30)}...`
                              : conversation.lastMessage.content}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: 'text.secondary' }} component="span">
                          {conversation.lastMessage ? formatDate(conversation.lastMessage.timestamp) : ''}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
          </List>
        </Box>

        {/* Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {state.currentConversation ? (
            <>
              {/* Chat Header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getConversationIcon(state.currentConversation.type)}
                    <Box>
                      <Typography variant="h6">{state.currentConversation.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {state.currentConversation.participants.length} participants
                      </Typography>
                    </Box>
                  </Box>
                  {state.currentConversation.type === 'project' && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<GroupIcon />}
                      onClick={() => setShowMembersDialog(true)}
                    >
                      Members
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Messages */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'background.default' }}>
                {state.messages[state.currentConversation.id]?.map(renderMessage)}
                
                {/* Typing Indicator */}
                {state.typingUsers[state.currentConversation.id]?.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {state.typingUsers[state.currentConversation.id].map(userId => {
                        const user = state.users.find(u => u.id === userId);
                        return user?.name || 'Someone';
                      }).join(', ')} is typing...
                    </Typography>
                  </Box>
                )}
                
                <div ref={messagesEndRef} />
              </Box>

              {/* Message Input */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <TextField
                    fullWidth
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    variant="outlined"
                    size="small"
                    multiline
                    maxRows={3}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        '&:hover fieldset': {
                          borderColor: theme.palette.primary.main,
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: theme.palette.primary.main,
                          borderWidth: 2,
                        },
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Attach file" arrow>
                      <IconButton
                        size="small"
                        sx={{
                          bgcolor: theme.palette.action.hover,
                          '&:hover': {
                            bgcolor: theme.palette.action.selected,
                          },
                        }}
                      >
                        <AttachFileIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Add emoji" arrow>
                      <IconButton
                        size="small"
                        sx={{
                          bgcolor: theme.palette.action.hover,
                          '&:hover': {
                            bgcolor: theme.palette.action.selected,
                          },
                        }}
                      >
                        <EmojiIcon />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || state.isLoading}
                      color="primary"
                      sx={{
                        bgcolor: messageInput.trim() ? theme.palette.primary.main : theme.palette.action.disabled,
                        color: messageInput.trim() ? theme.palette.primary.contrastText : theme.palette.text.disabled,
                        '&:hover': messageInput.trim() ? {
                          bgcolor: theme.palette.primary.dark,
                        } : {},
                        '&:disabled': {
                          bgcolor: theme.palette.action.disabled,
                          color: theme.palette.text.disabled,
                        },
                      }}
                    >
                      {state.isLoading ? (
                        <CircularProgress size={20} sx={{ color: 'inherit' }} />
                      ) : (
                        <SendIcon />
                      )}
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
              <Typography variant="h6" color="text.secondary" textAlign="center">
                Select a conversation to start chatting
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );

  const handleTyping = (value: string) => {
    setMessageInput(value);

    if (!state.currentConversation) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing status
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      setTyping(state.currentConversation.id, userId, true);
    }

    // Clear typing status after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (state.currentConversation) {
        setTyping(state.currentConversation.id, userId, false);
      }
    }, 1000);
  };

  // Member management functions
  const handleMemberSearch = (query: string) => {
    setMemberSearchQuery(query);
    if (query.trim()) {
      try {
        // For project conversations, only show the specific team members
        let eligibleUsers: ChatUser[] = [];
        
        if (currentConversation?.type === 'project') {
          // Use real-time project team members from Firebase
          const projectTeamMembers = state.users.map(user => user.email).filter(email => email !== undefined);
          
          eligibleUsers = state.users.filter(user => 
            projectTeamMembers.includes(user.email) && 
            user.id !== userId &&
            !currentConversation.participants.includes(user.id)
          );
        } else {
          // For non-project conversations, use regular search
          const results = searchUsers(query);
          eligibleUsers = results.filter(user => 
            !currentConversation?.participants.includes(user.id)
          );
        }
        
        // Apply search filter
        const filteredUsers = eligibleUsers.filter(user => 
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase())
        );
        
        setSearchResults(filteredUsers);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      }
    } else {
      // Show all eligible project team members when query is empty
      if (currentConversation?.type === 'project') {
        // Use real-time project team members from Firebase
        const projectTeamMembers = state.users.map(user => user.email).filter(email => email !== undefined);
        
        const eligibleUsers = state.users.filter(user => 
          projectTeamMembers.includes(user.email) && 
          user.id !== userId &&
          !currentConversation.participants.includes(user.id)
        );
        setSearchResults(eligibleUsers);
      } else {
        setSearchResults([]);
      }
    }
  };

  const handleAddMember = async (userToAdd: ChatUser) => {
    if (!currentConversation || !userId) return;
    
    setIsAddingMember(true);
    try {
      await addMemberToConversation(currentConversation.id, userToAdd.id);
      setShowAddMemberDialog(false);
      setMemberSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding member:', error);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userToRemove: ChatUser) => {
    if (!currentConversation || !userId) return;
    
    try {
      await removeMemberFromConversation(currentConversation.id, userToRemove.id);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {currentConversation?.name || 'Select a conversation'}
          </Typography>
          {currentConversation && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="View Members" arrow>
                <IconButton
                  size="small"
                  onClick={() => setShowMembersDialog(true)}
                  sx={{
                    bgcolor: theme.palette.action.hover,
                    '&:hover': {
                      bgcolor: theme.palette.action.selected,
                    },
                  }}
                >
                  <GroupIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Add Member" arrow>
                <IconButton
                  size="small"
                  onClick={() => setShowAddMemberDialog(true)}
                  sx={{
                    bgcolor: theme.palette.action.hover,
                    '&:hover': {
                      bgcolor: theme.palette.action.selected,
                    },
                  }}
                >
                  <PersonIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {currentMessages.map((message, index) => renderMessage(message, index))}
        
        {/* Typing Indicator */}
        {state.typingUsers[currentConversation?.id || '']?.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              {state.typingUsers[currentConversation?.id || ''].map(userId => {
                const user = state.users.find(u => u.id === userId);
                return user?.name || 'Someone';
              }).join(', ')} is typing...
            </Typography>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            variant="outlined"
            size="small"
            multiline
            maxRows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                  borderWidth: 2,
                },
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Attach file" arrow>
              <IconButton
                size="small"
                sx={{
                  bgcolor: theme.palette.action.hover,
                  '&:hover': {
                    bgcolor: theme.palette.action.selected,
                  },
                }}
              >
                <AttachFileIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add emoji" arrow>
              <IconButton
                size="small"
                sx={{
                  bgcolor: theme.palette.action.hover,
                  '&:hover': {
                    bgcolor: theme.palette.action.selected,
                  },
                }}
              >
                <EmojiIcon />
              </IconButton>
            </Tooltip>
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              sx={{
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': {
                  bgcolor: theme.palette.primary.dark,
                },
                '&:disabled': {
                  bgcolor: theme.palette.action.disabled,
                  color: theme.palette.action.disabled,
                },
              }}
            >
              {isTyping ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            </IconButton>
          </Box>
        </Box>
      </Box>
      
      {renderMembersDialog()}
      
      {/* Add Member Dialog */}
      <Dialog open={showAddMemberDialog} onClose={() => setShowAddMemberDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PersonIcon />
            <Typography variant="h6">Add Member to {currentConversation?.name}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder="Search users by name or email..."
            value={memberSearchQuery}
            onChange={(e) => handleMemberSearch(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          
          <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <Box
                  key={user.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                    cursor: 'pointer',
                  }}
                  onClick={() => handleAddMember(user)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.light }}>
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{user.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" color="primary">
                    <AddIcon />
                  </IconButton>
                </Box>
              ))
            ) : memberSearchQuery ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No users found
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                Type to search for users
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddMemberDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Floating Chat Button Component
function ChatFab({ onClick, unreadCount = 0 }: { onClick: () => void; unreadCount?: number }) {
  return (
    <Fab
      color="primary"
      onClick={onClick}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
      }}
    >
      <Badge badgeContent={unreadCount} color="error">
        <ChatIcon />
      </Badge>
    </Fab>
  );
}

export default ChatInterface;
