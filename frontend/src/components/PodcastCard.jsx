import React, { useState } from 'react';
import { Play, Pause, Heart, Share2, Eye, Clock, Bookmark, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import axios from 'axios';
import { toast } from 'sonner';
import { usePlayer } from './GlobalPlayer';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Hardcoded demo user (replace with actual auth)
const DEMO_USER_ID = 'demo-user-123';

export const PodcastCard = ({ podcast, onClick }) => {
  const { currentPodcast, isPlaying, playPodcast, pausePodcast, currentTime, duration, seekTo, skip } = usePlayer();
  
  const [isLiked, setIsLiked] = useState(podcast.likes?.includes(DEMO_USER_ID) || false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(podcast.reactions_count || 0);
  const [savesCount, setSavesCount] = useState(podcast.saves_count || 0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [localVolume, setLocalVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Check if this podcast is currently playing
  const isThisPodcastPlaying = currentPodcast?.id === podcast.id && isPlaying;
  const isThisPodcastActive = currentPodcast?.id === podcast.id;

  const formatDuration = (dur) => {
    if (typeof dur === 'string' && dur.includes(':')) return dur;
    const seconds = parseInt(dur) || 0;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const formData = new FormData();
      formData.append('user_id', DEMO_USER_ID);
      formData.append('emoji', '❤️');
      await axios.post(`${API}/podcasts/${podcast.id}/reaction`, formData);
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
      toast.success(isLiked ? 'Removed from favorites' : 'Added to favorites!');
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update');
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    try {
      const formData = new FormData();
      formData.append('user_id', DEMO_USER_ID);
      formData.append('podcast_id', podcast.id);
      if (isSaved) {
        await axios.delete(`${API}/library/saved/${podcast.id}`, { data: formData });
      } else {
        await axios.post(`${API}/library/save`, formData);
      }
      setIsSaved(!isSaved);
      setSavesCount(prev => isSaved ? prev - 1 : prev + 1);
      toast.success(isSaved ? 'Removed from library' : 'Saved to library!');
    } catch (error) {
      setIsSaved(!isSaved);
      setSavesCount(prev => isSaved ? prev - 1 : prev + 1);
      toast.success(isSaved ? 'Removed from library' : 'Saved to library!');
    }
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (isThisPodcastPlaying) {
      pausePodcast();
    } else {
      playPodcast(podcast);
    }
  };

  const handleProgressClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * duration;
    seekTo(time);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  return (
    <Card 
      className={`bg-white border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl ${
        isThisPodcastActive ? 'border-emerald-400 shadow-lg ring-2 ring-emerald-100' : 'border-gray-200 hover:border-gray-300 hover:-translate-y-1'
      }`}
      onClick={onClick}
      data-testid={`podcast-card-${podcast.id}`}
    >
      <div className="p-6">
        <div className="flex gap-5">
          {/* Cover Image */}
          <div className="flex-shrink-0 relative">
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-lg">
              {podcast.cover_image ? (
                <img 
                  src={podcast.cover_image} 
                  alt={podcast.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-10 h-10 text-white" />
                </div>
              )}
            </div>
            {/* Live Badge */}
            {podcast.is_live && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                LIVE
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                  {podcast.title}
                </h3>
                {podcast.is_live && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-semibold text-red-600">LIVE NOW</span>
                  </div>
                )}
              </div>
              {/* Enhanced Play Button */}
              <button
                onClick={handlePlayClick}
                className={`flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 shadow-lg ${
                  isThisPodcastPlaying 
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700' 
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
                data-testid="play-button"
              >
                {isThisPodcastPlaying ? (
                  <Pause className="w-6 h-6 text-white" fill="white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-1" fill="white" />
                )}
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
              {podcast.description || 'No description available'}
            </p>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {podcast.tags?.slice(0, 3).map((tag, index) => (
                <Badge 
                  key={index} 
                  className="bg-emerald-50 text-emerald-700 border-emerald-100 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-5 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(podcast.duration)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>{podcast.views_count}</span>
              </div>
              
              {/* Like Button */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 transition-colors ${
                  isLiked ? 'text-red-500 hover:text-red-600' : 'text-gray-500 hover:text-red-500'
                }`}
                data-testid="like-button"
              >
                <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
                <span>{likesCount}</span>
              </button>

              {/* Save Button */}
              <button
                onClick={handleSave}
                className={`flex items-center gap-1.5 transition-colors ${
                  isSaved ? 'text-emerald-500 hover:text-emerald-600' : 'text-gray-500 hover:text-emerald-500'
                }`}
                data-testid="save-button"
              >
                <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                <span>{savesCount}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <Share2 className="w-4 h-4" />
                <span>{podcast.reposts_count}</span>
              </div>
              <span className="ml-auto text-gray-400">{formatDate(podcast.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Player - shows when this podcast is active */}
      {isThisPodcastActive && (
        <div 
          className="px-6 pb-4 pt-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-t border-emerald-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress Bar */}
          <div 
            className="h-2 bg-emerald-100 rounded-full overflow-hidden cursor-pointer mb-3 group"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all relative"
              style={{ width: `${progress}%` }}
            >
              {/* Progress handle */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            {/* Time */}
            <span className="text-xs text-gray-600 font-medium min-w-[45px]">
              {formatDuration(currentTime)}
            </span>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); skip(-15); }}
                className="p-2 hover:bg-emerald-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                title="Back 15s"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={handlePlayClick}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                {isThisPodcastPlaying ? (
                  <Pause className="w-5 h-5" fill="white" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" fill="white" />
                )}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); skip(30); }}
                className="p-2 hover:bg-emerald-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                title="Forward 30s"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Duration */}
            <span className="text-xs text-gray-600 font-medium min-w-[45px] text-right">
              {formatDuration(duration)}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};
