import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
  Divider,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Close as CloseIcon,
  Chat as ChatIcon,
  Group as GroupIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  Send as SendIcon,
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { useChat } from '../../contexts/ChatContext';
import ChatInterface from './ChatInterface';
import { ChatUser } from '../../services/firebaseChatService';

interface ChatSidebarProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export default function ChatSidebar({ userId, userName, userEmail }: ChatSidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'users'>('chats');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const { 
    state, 
    createDirectChat, 
    searchUsers, 
    setCurrentConversation 
  } = useChat();

  // Calculate unread count from real-time data
  const unreadCount = state.conversations.reduce((count, conversation) => {
    const userMessages = state.messages[conversation.id] || [];
    const unreadMessages = userMessages.filter(msg => 
      msg.senderId !== userId && !msg.read
    );
    return count + unreadMessages.length;
  }, 0);

  // Get online users count
  const onlineUsers = state.users.filter(user => user.isOnline);

  // Separate conversations by type
  const projectChats = state.conversations.filter(c => c.type === 'project');
  const directChats = state.conversations.filter(c => c.type === 'direct');

  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (query.trim()) {
      const results = await searchUsers(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleCreateDirectChat = async (targetUserId: string) => {
    try {
      const conversationId = await createDirectChat(targetUserId);
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
        setShowUserSearch(false);
        setUserSearchQuery('');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error creating direct chat:', error);
    }
  };

  // Enhanced conversation display with real-time indicators
  const renderConversationItem = (conversation: any) => {
    const lastMessage = conversation.metadata?.lastMessage;
    const isTyping = state.typingUsers[conversation.id]?.length > 0;
    const unreadCount = (state.messages[conversation.id] || []).filter(
      msg => msg.senderId !== userId && !msg.read
    ).length;

    return (
      <ListItem
        key={conversation.id}
        button
        onClick={() => setCurrentConversation(conversation)}
        sx={{
          borderRadius: 1,
          mb: 1,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          opacity: conversation.metadata?.archived ? 0.6 : 1,
        }}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: conversation.type === 'project' ? theme.palette.primary.light : theme.palette.secondary.light }}>
            {getConversationIcon(conversation.type)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" noWrap component="div">
                {conversation.name}
              </Typography>
              {isTyping && (
                <Typography variant="caption" color="primary.main" component="div">
                  {state.typingUsers[conversation.id].join(', ')} typing...
                </Typography>
              )}
              {unreadCount > 0 && (
                <Chip
                  size="small"
                  label={unreadCount}
                  color="primary"
                  sx={{ height: 20, minWidth: 20 }}
                />
              )}
            </Box>
          }
          secondary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                size="small"
                label={conversation.type === 'project' ? 'Project' : 'Direct'}
                color={conversation.type === 'project' ? 'primary' : 'secondary'}
                variant="outlined"
              />
              {conversation.type === 'project' && (
                <Typography variant="caption" color="text.secondary">
                  {conversation.participants.length} members
                </Typography>
              )}
              {lastMessage && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {lastMessage.senderName}: {lastMessage.content}
                </Typography>
              )}
              {!lastMessage && (
                <Typography variant="caption" color="text.secondary" italic>
                  No messages yet
                </Typography>
              )}
            </Box>
          }
        />
      </ListItem>
    );
  };

  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <WorkIcon />;
      case 'direct':
        return <PersonIcon />;
      default:
        return <ChatIcon />;
    }
  };

  return (
    <>
      {/* Mobile Chat Button */}
      <IconButton
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 1000,
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          width: 56,
          height: 56,
          borderRadius: '50%',
        }}
        onClick={() => setOpen(true)}
      >
        <ChatIcon />
        {unreadCount > 0 && (
          <Badge
            badgeContent={unreadCount}
            color="error"
            sx={{
              position: 'absolute',
              top: -5,
              right: -5,
            }}
          />
        )}
      </IconButton>

      {/* Chat Sidebar */}
      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: isMobile ? '100%' : 380,
          height: isMobile ? '80%' : '100%',
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            backgroundColor: theme.palette.background.paper,
            borderLeft: isMobile ? 'none' : `1px solid ${theme.palette.divider}`,
            borderTop: isMobile ? `1px solid ${theme.palette.divider}` : 'none',
          },
        }}
      >
        <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, pb: 1 }}>
            <Avatar sx={{ mr: 2 }}>
              {userName.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {userName}
            </Typography>
            <IconButton 
              onClick={(e) => setAnchorEl(e.currentTarget)} 
              size="small" 
              sx={{ mr: 1 }}
            >
              <AddIcon />
            </IconButton>
            {unreadCount > 0 && (
              <Badge badgeContent={unreadCount} color="error" sx={{ ml: 1 }}>
                <ChatIcon />
              </Badge>
            )}
            <IconButton onClick={() => setOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Action Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => {
              setShowUserSearch(true);
              setAnchorEl(null);
            }}>
              <PersonIcon sx={{ mr: 1 }} />
              Start Direct Chat
            </MenuItem>
          </Menu>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
            <Box sx={{ display: 'flex' }}>
              <Box
                sx={{
                  flex: 1,
                  textAlign: 'center',
                  py: 1,
                  cursor: 'pointer',
                  borderBottom: activeTab === 'chats' ? 2 : 0,
                  borderColor: activeTab === 'chats' ? 'primary.main' : 'transparent',
                }}
                onClick={() => setActiveTab('chats')}
              >
                <ChatIcon sx={{ mr: 1 }} />
                <Typography variant="body2">Chats</Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  textAlign: 'center',
                  py: 1,
                  cursor: 'pointer',
                  borderBottom: activeTab === 'users' ? 2 : 0,
                  borderColor: activeTab === 'users' ? 'primary.main' : 'transparent',
                }}
                onClick={() => setActiveTab('users')}
              >
                <GroupIcon sx={{ mr: 1 }} />
                <Typography variant="body2">
                  Users ({onlineUsers.length})
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Conversations List */}
          {activeTab === 'chats' && (
            <Box sx={{ height: '100%', overflow: 'auto' }}>
              {/* Project Chats */}
              {projectChats.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 'bold', color: 'primary.main' }}>
                    Project Chats ({projectChats.length})
                  </Typography>
                  {projectChats.map(renderConversationItem)}
                </>
              )}

              {/* Direct Chats */}
              {directChats.length > 0 && (
                <>
                  {projectChats.length > 0 && <Divider sx={{ my: 1 }} />}
                  <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 'bold', color: 'secondary.main' }}>
                    Direct Chats ({directChats.length})
                  </Typography>
                  {directChats.map(renderConversationItem)}
                </>
              )}

              {/* Empty State */}
              {projectChats.length === 0 && directChats.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No conversations yet
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Start a direct chat or join a project to see conversations
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Users List */}
          {activeTab === 'users' && (
            <Box sx={{ height: '100%', overflow: 'auto' }}>
              <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 'bold' }}>
                Online Users ({onlineUsers.length})
              </Typography>
              {onlineUsers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No users online
                  </Typography>
                </Box>
              ) : (
                onlineUsers.map((user) => (
                  <ListItem
                    key={user.id}
                    button
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: user.isOnline ? theme.palette.success.main : theme.palette.grey[500],
                        }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" noWrap>
                            {user.name}
                          </Typography>
                          {user.isOnline && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: theme.palette.success.main,
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))
              )}
            </Box>
          )}

          {/* Chat Interface */}
          {state.currentConversation && (
            <Box sx={{ height: 300, borderTop: 1, borderColor: 'divider' }}>
              <ChatInterface
                conversationId={state.currentConversation.id}
                userId={userId}
                userName={userName}
                userEmail={userEmail}
              />
            </Box>
          )}
        </Box>
      </Drawer>

      {/* User Search Dialog */}
      <Dialog 
        open={showUserSearch} 
        onClose={() => {
          setShowUserSearch(false);
          setUserSearchQuery('');
          setSearchResults([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Start Direct Chat</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Search by email or name"
            value={userSearchQuery}
            onChange={(e) => handleUserSearch(e.target.value)}
            placeholder="Enter email or name..."
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {searchResults.map((user) => (
                <ListItem
                  key={user.id}
                  button
                  onClick={() => handleCreateDirectChat(user.id)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: user.isOnline ? theme.palette.success.main : theme.palette.grey[500],
                      }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" noWrap component="div">
                          {user.name}
                        </Typography>
                        {user.isOnline && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: theme.palette.success.main,
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
          
          {/* No Results */}
          {userSearchQuery && searchResults.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No users found
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowUserSearch(false);
            setUserSearchQuery('');
            setSearchResults([]);
          }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
