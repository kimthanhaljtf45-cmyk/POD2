import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AudioPlayer } from '../components/AudioPlayer';
import { AudioUploader } from '../components/AudioUploader';
import { PrivatePodcastGate } from '../components/PrivatePodcastGate';
import { PodcastReactions } from '../components/PodcastReactions';
import { ShareDialog } from '../components/ShareDialog';
import { PodcastCommentsSection } from '../components/PodcastCommentsSection';
import { usePlayer } from '../components/GlobalPlayer';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { 
  Heart, Share2, Bookmark, BookmarkCheck, Send, Loader2, Eye, Calendar, Radio,
  Flame, Sparkles, Brain, Copy, CheckCircle, Check, ThumbsUp, MessageCircle,
  Twitter, Facebook, Link as LinkIcon, Code, ListPlus, Plus, UserPlus,
  ChevronDown, ChevronUp, Lock, Download, Play, Pause, Upload, Clock, Headphones,
  TrendingUp, Users, BarChart3, Music, HelpCircle, Scissors, BarChart2
} from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '../context/WalletContext';

// Social Layer Components
import { 
  TimestampedReactions, 
  QASection, 
  PollsSection, 
  ClipsSection, 
  SmartLink,
  FeaturedComments 
} from '../components/social';

// Content Components
import {
  ChaptersSection,
  GuestsSection,
  ResourcesSection,
  FactsSection,
  TagsSection,
  TranscriptSearch
} from '../components/content';

// Notification & Recommendations
import TelegramNotifyButton from '../components/TelegramNotifyButton';
import SimilarByTags from '../components/SimilarByTags';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Reaction types with icons
const REACTIONS = [
  { type: 'like', icon: ThumbsUp, label: 'Like', color: 'text-blue-500' },
  { type: 'fire', icon: Flame, label: 'Fire', color: 'text-orange-500' },
  { type: 'heart', icon: Heart, label: 'Love', color: 'text-red-500' },
  { type: 'mind_blown', icon: Brain, label: 'Mind Blown', color: 'text-purple-500' },
  { type: 'clap', icon: Sparkles, label: 'Amazing', color: 'text-yellow-500' },
];

export const PodcastDetail = () => {
  const { podcastId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { walletAddress, isConnected, connect } = useWallet();
  const { playPodcast, currentPodcast, isPlaying, togglePlay, currentTime, seek } = usePlayer();
  const [podcast, setPodcast] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [userReactions, setUserReactions] = useState([]);
  const [reactions, setReactions] = useState({});
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [hasAccess, setHasAccess] = useState(true); // For private podcasts
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [socialTab, setSocialTab] = useState('comments');
  
  const currentUserId = walletAddress || 'demo-user-123';
  const currentUsername = 'Demo User';
  const isAuthor = author?.id === currentUserId;
  
  // Handle smart link timestamp
  useEffect(() => {
    const timestamp = searchParams.get('t');
    if (timestamp && podcast?.audio_url) {
      const time = parseInt(timestamp, 10);
      if (!isNaN(time)) {
        // Auto-play from timestamp
        setTimeout(() => {
          playPodcast(podcast);
          seek(time);
          toast.success(`Starting from ${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`);
        }, 1000);
      }
    }
  }, [podcast?.id, searchParams]);
  
  // WebSocket connection
  useEffect(() => {
    if (!podcastId) return;
    
    // Determine WebSocket URL
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = backendUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '');
    const wsUrl = `${wsProtocol}//${wsHost}/api/ws/podcast/${podcastId}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    let ws = null;
    let reconnectTimer = null;
    
    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          setWsConnected(true);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);
            
            if (data.type === 'new_comment') {
              // Add new comment to list
              setComments(prev => [data.comment, ...prev]);
            } else if (data.type === 'comment_liked') {
              // Update comment likes
              setComments(prev => prev.map(c => 
                c.id === data.comment_id 
                  ? { ...c, likes_count: data.likes_count }
                  : c
              ));
            } else if (data.type === 'viewer_count') {
              // Could update viewer count if we show it
              console.log('Viewers:', data.count);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsConnected(false);
        };
        
        ws.onclose = () => {
          console.log('❌ WebSocket disconnected');
          setWsConnected(false);
          
          // Reconnect after 3 seconds
          reconnectTimer = setTimeout(() => {
            console.log('Reconnecting WebSocket...');
            connect();
          }, 3000);
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
      }
    };
    
    connect();
    
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [podcastId]);
  
  useEffect(() => {
    let mounted = true;
    
    const fetchPodcastData = async () => {
      try {
        setLoading(true);
        const [podcastRes, commentsRes, reactionsRes] = await Promise.all([
          axios.get(`${API}/podcasts/${podcastId}`),
          axios.get(`${API}/podcasts/${podcastId}/comments`),
          axios.get(`${API}/podcasts/${podcastId}/reactions`)
        ]);
        
        if (!mounted) return;
        
        setPodcast(podcastRes.data);
        setComments(commentsRes.data);
        setReactions(reactionsRes.data.reactions || {});
        setIsSaved(podcastRes.data.saves?.includes(currentUserId) || false);
        
        // Check access for private podcasts
        if (podcastRes.data.visibility === 'private') {
          try {
            setCheckingAccess(true);
            const accessRes = await axios.get(
              `${API}/podcasts/${podcastId}/access/check?user_id=${currentUserId}`
            );
            setHasAccess(accessRes.data.has_access);
          } catch (error) {
            console.error('Failed to check access:', error);
            setHasAccess(false);
          } finally {
            setCheckingAccess(false);
          }
        } else {
          setHasAccess(true);
        }
        
        // Fetch author
        try {
          const authorRes = await axios.get(`${API}/authors/${podcastRes.data.author_id}`);
          if (mounted) setAuthor(authorRes.data);
        } catch (e) {
          console.warn('Author not found');
        }
        
        // Check if following (optional)
        try {
          const followRes = await axios.get(`${API}/authors/${podcastRes.data.author_id}/is-following`, {
            params: { user_id: currentUserId }
          });
          if (mounted) setIsFollowing(followRes.data.is_following);
        } catch (e) {
          // Ignore
        }
        
        // Track view
        try {
          const formData = new FormData();
          formData.append('user_id', currentUserId);
          await axios.post(`${API}/podcasts/${podcastId}/view`, formData);
        } catch (e) {
          // Ignore tracking errors
        }
        
      } catch (error) {
        if (mounted) {
          console.error('Failed to fetch podcast:', error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    fetchPodcastData();
    
    return () => {
      mounted = false;
    };
  }, [podcastId, currentUserId]);
  
  // Helper to refresh podcast data
  const fetchPodcast = async () => {
    try {
      const response = await axios.get(`${API}/podcasts/${podcastId}`);
      setPodcast(response.data);
    } catch (error) {
      console.error('Failed to refresh podcast:', error);
    }
  };
  
  // Format duration in seconds to readable string
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleAddComment = async (text, parentId = null) => {
    if (!text || !text.trim()) return;
    
    try {
      const formData = new FormData();
      formData.append('user_id', currentUserId);
      formData.append('username', 'Demo User');
      formData.append('text', text);
      if (parentId) {
        formData.append('parent_id', parentId);
      }
      
      const response = await axios.post(`${API}/podcasts/${podcastId}/comments`, formData);
      
      if (parentId) {
        // Add reply to parent comment
        setComments(prev => prev.map(c => {
          if (c.id === parentId) {
            return { ...c, replies: [...(c.replies || []), response.data] };
          }
          return c;
        }));
      } else {
        setComments(prev => [response.data, ...prev]);
      }
      
      toast.success('Comment added!');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    }
  };
  
  const handleLikeComment = async (commentId) => {
    try {
      const formData = new FormData();
      formData.append('user_id', currentUserId);
      
      const response = await axios.post(`${API}/comments/${commentId}/like`, formData);
      
      // Update comment likes in state
      setComments(comments.map(c => {
        if (c.id === commentId) {
          return { 
            ...c, 
            likes_count: response.data.liked ? c.likes_count + 1 : c.likes_count - 1,
            liked_by: response.data.liked 
              ? [...(c.liked_by || []), currentUserId]
              : (c.liked_by || []).filter(id => id !== currentUserId)
          };
        }
        // Check replies
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map(r => {
              if (r.id === commentId) {
                return {
                  ...r,
                  likes_count: response.data.liked ? r.likes_count + 1 : r.likes_count - 1
                };
              }
              return r;
            })
          };
        }
        return c;
      }));
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };
  
  const handleReaction = async (reactionType) => {
    try {
      const formData = new FormData();
      formData.append('user_id', currentUserId);
      formData.append('reaction_type', reactionType);
      
      const response = await axios.post(`${API}/podcasts/${podcastId}/reactions`, formData);
      
      // Update reactions
      const reactionsRes = await axios.get(`${API}/podcasts/${podcastId}/reactions`);
      setReactions(reactionsRes.data.reactions || {});
      
      if (response.data.added) {
        setUserReactions([...userReactions, reactionType]);
        toast.success(`Added ${reactionType} reaction!`);
      } else {
        setUserReactions(userReactions.filter(r => r !== reactionType));
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };
  
  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append('user_id', currentUserId);
      
      const response = await axios.post(`${API}/podcasts/${podcastId}/save`, formData);
      setIsSaved(response.data.saved);
      
      // Update podcast saves count locally
      setPodcast(prev => ({
        ...prev,
        saves_count: response.data.saved 
          ? (prev.saves_count || 0) + 1 
          : Math.max(0, (prev.saves_count || 0) - 1)
      }));
      
      toast.success(response.data.saved ? 'Saved to library!' : 'Removed from library');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save');
    }
  };
  
  const handleFollow = async () => {
    try {
      const formData = new FormData();
      formData.append('user_id', currentUserId);
      
      if (isFollowing) {
        await axios.delete(`${API}/authors/${author.id}/follow`, { data: formData });
        toast.success('Unfollowed');
      } else {
        await axios.post(`${API}/authors/${author.id}/follow`, formData);
        toast.success('Following!');
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Failed to follow:', error);
    }
  };
  
  // Load user playlists when dialog opens
  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const response = await axios.get(`${API}/playlists/user/${currentUserId}`);
      setPlaylists(response.data || []);
    } catch (error) {
      console.error('Failed to load playlists:', error);
      setPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  };
  
  // Create new playlist and add current podcast
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    try {
      const response = await axios.post(`${API}/playlists`, {
        user_id: currentUserId,
        name: newPlaylistName,
        podcast_ids: [podcastId]
      });
      
      setPlaylists([response.data, ...playlists]);
      setNewPlaylistName('');
      toast.success(`Created playlist "${newPlaylistName}" and added podcast!`);
    } catch (error) {
      console.error('Failed to create playlist:', error);
      toast.error('Failed to create playlist');
    }
  };
  
  // Add podcast to existing playlist
  const handleAddToPlaylist = async (playlistId) => {
    try {
      await axios.post(`${API}/playlists/${playlistId}/add/${podcastId}`);
      toast.success('Added to playlist!');
      setShowPlaylistDialog(false);
    } catch (error) {
      if (error.response?.status === 400) {
        toast.info('Podcast already in this playlist');
      } else {
        console.error('Failed to add to playlist:', error);
        toast.error('Failed to add to playlist');
      }
    }
  };
  
  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-gray-500">Loading podcast...</p>
        </div>
      </div>
    );
  }
  
  if (!podcast) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Radio className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">Podcast not found</p>
        </div>
      </div>
    );
  }
  
  const audioUrl = podcast.audio_file_id 
    ? `${API}/podcasts/${podcastId}/audio`
    : null;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2" data-testid="podcast-detail">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-4xl font-bold text-gray-900">{podcast.title}</h1>
                {podcast.is_live && (
                  <Badge className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold px-3 py-1 animate-pulse">
                    <span className="w-2 h-2 bg-white rounded-full inline-block mr-2"></span>
                    LIVE
                  </Badge>
                )}
              </div>
              
              {/* Author Info with Follow */}
              {author && (
                <div className="flex items-center justify-between mb-6">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/author/${author.id}`)}
                  >
                    <Avatar className="w-12 h-12 border-2 border-emerald-100">
                      <AvatarImage src={author.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                        {author.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900">{author.name}</p>
                      <p className="text-sm text-gray-500">@{author.username}</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleFollow}
                    size="sm"
                    className={isFollowing 
                      ? 'bg-white text-gray-900 border-2 border-gray-200 hover:border-gray-300 rounded-xl' 
                      : 'bg-gray-900 hover:bg-gray-800 text-white rounded-xl'
                    }
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  
                  {/* Telegram Notifications */}
                  <TelegramNotifyButton
                    creatorId={author.id}
                    creatorName={author.name}
                    userId={currentUserId}
                    variant="icon"
                  />
                </div>
              )}
              
              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  {podcast.views_count} views
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(podcast.created_at).toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4" />
                  {comments.length} comments
                </div>
              </div>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {podcast.tags.map((tag, index) => (
                  <Badge 
                    key={index}
                    className="bg-emerald-50 text-emerald-700 border-emerald-100 rounded-full px-3 py-1 cursor-pointer hover:bg-emerald-100"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              
              {/* Reactions and Actions */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                {/* Emoji Reactions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReaction('fire')}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-50 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <span className="text-lg">🔥</span>
                    {reactions.fire > 0 && <span className="text-sm font-medium text-gray-700">{reactions.fire}</span>}
                  </button>
                  
                  <button
                    onClick={() => handleReaction('heart')}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-50 hover:bg-pink-50 rounded-xl transition-colors"
                  >
                    <span className="text-lg">❤️</span>
                    {reactions.heart > 0 && <span className="text-sm font-medium text-gray-700">{reactions.heart}</span>}
                  </button>
                  
                  <button
                    onClick={() => handleReaction('like')}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-50 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <span className="text-lg">👍</span>
                    {reactions.like > 0 && <span className="text-sm font-medium text-gray-700">{reactions.like}</span>}
                  </button>
                  
                  <button
                    onClick={() => handleReaction('mind_blown')}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-50 hover:bg-yellow-50 rounded-xl transition-colors"
                  >
                    <span className="text-lg">🤯</span>
                    {reactions.mind_blown > 0 && <span className="text-sm font-medium text-gray-700">{reactions.mind_blown}</span>}
                  </button>
                  
                  <button
                    onClick={() => handleReaction('clap')}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-50 hover:bg-green-50 rounded-xl transition-colors"
                  >
                    <span className="text-lg">👏</span>
                    {reactions.clap > 0 && <span className="text-sm font-medium text-gray-700">{reactions.clap}</span>}
                  </button>
                </div>
                
                {/* Share Button */}
                <div className="ml-auto">
                  <Button 
                    variant="outline" 
                    className="rounded-xl"
                    onClick={() => setShowShareDialog(true)}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Audio Player or Private Gate or Uploader */}
            {podcast.visibility === 'private' && !hasAccess ? (
              <div className="mb-8">
                <PrivatePodcastGate 
                  podcast={podcast}
                  currentUserId={currentUserId}
                  onAccessGranted={() => setHasAccess(true)}
                />
              </div>
            ) : audioUrl ? (
              <>
                {/* Quick Play Button */}
                <Card className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 mb-6 text-white">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => {
                        if (currentPodcast?.id === podcast.id && isPlaying) {
                          togglePlay();
                        } else {
                          playPodcast({...podcast, audio_url: audioUrl});
                        }
                      }}
                      className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                    >
                      {currentPodcast?.id === podcast.id && isPlaying ? (
                        <Pause className="w-8 h-8 text-emerald-600" />
                      ) : (
                        <Play className="w-8 h-8 text-emerald-600 ml-1" />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="text-lg font-bold mb-1">
                        {currentPodcast?.id === podcast.id && isPlaying ? 'Now Playing' : 'Ready to Play'}
                      </p>
                      <p className="text-emerald-100 text-sm">
                        {formatDuration(podcast.duration || 0)} • {podcast.listens_count || 0} listens
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={() => setShowShareDialog(true)}
                      >
                        <Share2 className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={handleSave}
                      >
                        {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>
                </Card>
                
                {/* Full Audio Player */}
                <AudioPlayer audioUrl={audioUrl} podcast={podcast} />
                
                {/* Timestamped Reactions & Smart Link */}
                <div className="flex items-center justify-between mt-4 mb-2">
                  <TimestampedReactions
                    podcastId={podcastId}
                    currentTime={currentTime || 0}
                    duration={podcast?.duration || 0}
                    userId={currentUserId}
                    onReactionAdded={() => toast.success('Reaction added!')}
                  />
                  <SmartLink
                    podcastId={podcastId}
                    podcastTitle={podcast?.title}
                    currentTime={currentTime || 0}
                    duration={podcast?.duration || 0}
                  />
                </div>
              </>
            ) : (
              /* No Audio - Show Uploader for Owner or Message for Others */
              podcast.author_id === currentUserId ? (
                <AudioUploader 
                  podcastId={podcastId} 
                  onUploadComplete={() => {
                    // Refresh podcast data
                    fetchPodcast();
                    toast.success('Audio uploaded! Refresh to play.');
                  }} 
                />
              ) : (
                <Card className="bg-white border border-gray-200 rounded-2xl p-8 text-center mb-8">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Music className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Audio Coming Soon</h3>
                  <p className="text-gray-500">The creator has not uploaded the audio yet. Check back later!</p>
                </Card>
              )
            )}
            
            {/* Reactions Bar */}
            <PodcastReactions
              reactions={reactions}
              userReactions={userReactions}
              onReact={handleReaction}
              variant="compact"
              reactionTypes={REACTIONS}
            />
            
            {/* Chapters / Topics */}
            <ChaptersSection 
              podcastId={podcastId}
              duration={podcast?.duration || 0}
              onSeek={seek}
              isAuthor={isAuthor}
            />
            
            {/* Guests Block */}
            <GuestsSection podcastId={podcastId} />
            
            {/* Description */}
            <Card className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {podcast.description || 'No description available'}
              </p>
            </Card>
            
            {/* Tags & Topics */}
            <TagsSection 
              tags={podcast.tags || []}
              categorizedTags={podcast.categorized_tags || {}}
              onTagClick={(tag) => {
                toast.info(`Searching for: ${tag}`);
                // Could navigate to search with tag
              }}
            />
            
            {/* AI Summary */}
            {podcast.ai_summary && (
              <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-gray-900">AI Summary</h2>
                </div>
                <p className="text-gray-600 leading-relaxed">{podcast.ai_summary}</p>
              </Card>
            )}
            
            {/* Transcript Search */}
            <TranscriptSearch
              podcastId={podcastId}
              hasTranscript={!!podcast.transcript}
              onSeek={seek}
              onGenerateTranscript={() => {
                toast.info('Generating transcript...');
                // Could trigger transcription
              }}
            />
            
            {/* Resources / Links */}
            <ResourcesSection podcastId={podcastId} onSeek={seek} />
            
            {/* Fact Check / Notes */}
            <FactsSection podcastId={podcastId} onSeek={seek} />
            
            {/* Featured Comments */}
            <FeaturedComments podcastId={podcastId} />
            
            {/* Social Layer - The "Room" */}
            <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-500" />
                  Community
                </h2>
                <p className="text-sm text-gray-500 mt-1">Join the conversation around this episode</p>
              </div>
              
              <Tabs value={socialTab} onValueChange={setSocialTab} className="w-full">
                <div className="px-6 pt-4">
                  <TabsList className="bg-gray-100 p-1 rounded-xl w-full grid grid-cols-4">
                    <TabsTrigger value="comments" className="rounded-lg text-sm">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Chat ({comments.length})
                    </TabsTrigger>
                    <TabsTrigger value="qa" className="rounded-lg text-sm">
                      <HelpCircle className="w-4 h-4 mr-1" />
                      Q&A
                    </TabsTrigger>
                    <TabsTrigger value="polls" className="rounded-lg text-sm">
                      <BarChart2 className="w-4 h-4 mr-1" />
                      Polls
                    </TabsTrigger>
                    <TabsTrigger value="clips" className="rounded-lg text-sm">
                      <Scissors className="w-4 h-4 mr-1" />
                      Clips
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="p-6">
                  <TabsContent value="comments" className="mt-0">
                    <PodcastCommentsSection
                      comments={comments}
                      currentUserId={currentUserId}
                      walletAddress={walletAddress}
                      isConnected={isConnected}
                      onAddComment={(text, parentId) => handleAddComment(text, parentId)}
                      onLikeComment={handleLikeComment}
                      initiallyOpen={true}
                    />
                  </TabsContent>
                  
                  <TabsContent value="qa" className="mt-0">
                    <QASection
                      podcastId={podcastId}
                      userId={currentUserId}
                      username={currentUsername}
                      currentTime={currentTime || 0}
                      isAuthor={isAuthor}
                      onSeek={seek}
                    />
                  </TabsContent>
                  
                  <TabsContent value="polls" className="mt-0">
                    <PollsSection
                      podcastId={podcastId}
                      userId={currentUserId}
                      isAuthor={isAuthor}
                    />
                  </TabsContent>
                  
                  <TabsContent value="clips" className="mt-0">
                    <ClipsSection
                      podcastId={podcastId}
                      userId={currentUserId}
                      username={currentUsername}
                      duration={podcast?.duration || 0}
                      currentTime={currentTime || 0}
                      onSeek={seek}
                      onPlayClip={(start, end) => {
                        if (podcast?.audio_url) {
                          playPodcast(podcast);
                          seek(start);
                          toast.success(`Playing clip from ${formatTime(start)}`);
                        }
                      }}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions Card */}
            <Card className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  className={`w-full justify-start gap-2 rounded-xl ${
                    isSaved 
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                  data-testid="save-button"
                >
                  {isSaved ? (
                    <BookmarkCheck className="w-5 h-5" />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
                  {isSaved ? 'Saved' : 'Save'} ({podcast.saves_count || 0})
                </Button>
                
                {/* Share Dialog */}
                <Button
                  onClick={() => setShowShareDialog(true)}
                  className="w-full justify-start gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl"
                  data-testid="share-button"
                >
                  <Share2 className="w-5 h-5" />
                  Share ({podcast.reposts_count || 0})
                </Button>
                
                {/* Add to Playlist */}
                <Dialog open={showPlaylistDialog} onOpenChange={(open) => {
                  setShowPlaylistDialog(open);
                  if (open) loadPlaylists();
                }}>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full justify-start gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl"
                      data-testid="playlist-button"
                    >
                      <ListPlus className="w-5 h-5" />
                      Add to Playlist
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white rounded-3xl border-gray-200">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-gray-900">Add to Playlist</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 mt-4">
                      {/* Create New Playlist */}
                      <div className="flex gap-2">
                        <Input
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          placeholder="New playlist name..."
                          className="bg-gray-50 border-gray-200 rounded-xl"
                          onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                        />
                        <Button
                          onClick={handleCreatePlaylist}
                          disabled={!newPlaylistName.trim()}
                          className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
                        >
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                      
                      {/* Existing Playlists */}
                      <div className="space-y-2">
                        {loadingPlaylists ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                          </div>
                        ) : playlists.length === 0 ? (
                          <p className="text-center text-gray-500 py-4">No playlists yet. Create one above!</p>
                        ) : (
                          playlists.map((playlist) => (
                            <button
                              key={playlist.id}
                              onClick={() => handleAddToPlaylist(playlist.id)}
                              className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl transition-colors text-left"
                            >
                              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <ListPlus className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{playlist.name}</p>
                                <p className="text-xs text-gray-500">{playlist.podcast_ids?.length || 0} podcasts</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
            
            {/* Extended Stats Card - Spotify Style */}
            <Card className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
                Podcast Analytics
              </h3>
              
              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <Headphones className="w-4 h-4" />
                    <span className="text-xs font-medium">Total Plays</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{podcast.listens_count || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Eye className="w-4 h-4" />
                    <span className="text-xs font-medium">Views</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{podcast.views_count || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Heart className="w-4 h-4" />
                    <span className="text-xs font-medium">Reactions</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{totalReactions}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Comments</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{comments.length}</p>
                </div>
              </div>
              
              {/* Detailed Stats */}
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Bookmark className="w-4 h-4" />
                    <span>Saved by</span>
                  </div>
                  <span className="font-semibold text-gray-900">{podcast.saves_count || 0} users</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Download className="w-4 h-4" />
                    <span>Downloads</span>
                  </div>
                  <span className="font-semibold text-gray-900">{podcast.downloads_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Duration</span>
                  </div>
                  <span className="font-semibold text-gray-900">{formatDuration(podcast.duration || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Published</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {new Date(podcast.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {/* Engagement Score */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Engagement Score</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {Math.min(100, Math.round(
                      ((podcast.listens_count || 0) * 2 + 
                       totalReactions * 5 + 
                       comments.length * 10 + 
                       (podcast.saves_count || 0) * 3) / 10
                    ))}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, Math.round(
                        ((podcast.listens_count || 0) * 2 + 
                         totalReactions * 5 + 
                         comments.length * 10 + 
                         (podcast.saves_count || 0) * 3) / 10
                      ))}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Based on plays, reactions, comments and saves
                </p>
              </div>
            </Card>
          </div>
        </div>
        
        {/* Similar Podcasts by Tags */}
        <div className="mt-8">
          <SimilarByTags 
            podcastId={podcastId}
            tags={podcast.tags || []}
            limit={4}
          />
        </div>
      </div>
      
      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        title={podcast.title}
        url={`${window.location.origin}/podcast/${podcastId}`}
        embedCode={`<iframe src="${window.location.origin}/embed/${podcastId}" width="100%" height="180"></iframe>`}
        showEmbed={true}
      />
    </div>
  );
};
