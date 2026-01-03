import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { 
  User, Bell, Shield, Link as LinkIcon, Settings as SettingsIcon,
  Twitter, Youtube, Globe, MessageCircle, Wallet, Save, Loader2,
  Upload, CheckCircle, ImagePlus, LogOut, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { PushNotificationManager } from '../components/PushNotificationManager';
import { getRatingBorderClass } from '../utils/ratingUtils';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { TelegramConnect } from '../components/TelegramConnect';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ProfileSettings = () => {
  const fileInputRef = useRef(null);
  const { walletAddress, isConnected, disconnect } = useWallet();
  const { user, logout, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [authorId, setAuthorId] = useState(null);
  const [showTelegramConnect, setShowTelegramConnect] = useState(false);
  
  const [profile, setProfile] = useState({
    name: '',
    bio: '',
    short_bio: '',
    avatar: '',
    wallet_address: '',
    telegram_username: '',
    telegram_connected: false,
    rating: 0,
    activity_score: 0,
    social_links: {
      twitter: '',
      youtube: '',
      discord: '',
      telegram: '',
      website: ''
    }
  });
  
  const [notifications, setNotifications] = useState({
    notify_new_follower: true,
    notify_new_comment: true,
    notify_new_reaction: true,
    notify_new_episode: true,
    notify_mentions: true,
    email_notifications: false
  });
  
  const [privacy, setPrivacy] = useState({
    profile_visible: true,
    show_listening_history: true,
    allow_comments: true
  });
  
  const [playback, setPlayback] = useState({
    default_playback_speed: 1.0,
    auto_play_next: true,
    skip_silence: false
  });
  
  useEffect(() => {
    fetchSettings();
  }, [walletAddress]);
  
  const fetchSettings = async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Find author by wallet address
      const authorsRes = await axios.get(`${API}/authors`);
      const authors = authorsRes.data || [];
      const author = authors.find(a => a.wallet_address?.toLowerCase() === walletAddress?.toLowerCase());
      
      if (!author) {
        toast.error('Profile not found');
        setLoading(false);
        return;
      }
      
      setAuthorId(author.id);
      setProfile({
        name: author.name || '',
        bio: author.bio || '',
        short_bio: author.short_bio || '',
        avatar: author.avatar || '',
        wallet_address: author.wallet_address || walletAddress,
        telegram_username: author.telegram_username || '',
        telegram_connected: author.telegram_connected || false,
        rating: author.rating || 0,
        activity_score: author.activity_score || 0,
        social_links: author.social_links || {}
      });
      
      // Try to fetch settings
      try {
        const settingsRes = await axios.get(`${API}/settings/${author.id}`);
        const settings = settingsRes.data;
        
        setNotifications({
          notify_new_follower: settings.notify_new_follower ?? true,
          notify_new_comment: settings.notify_new_comment ?? true,
          notify_new_reaction: settings.notify_new_reaction ?? true,
          notify_new_episode: settings.notify_new_episode ?? true,
          notify_mentions: settings.notify_mentions ?? true,
          email_notifications: settings.email_notifications ?? false
        });
        
        setPrivacy({
          profile_visible: settings.profile_visible ?? true,
          show_listening_history: settings.show_listening_history ?? true,
          allow_comments: settings.allow_comments ?? true
        });
        
        setPlayback({
          default_playback_speed: settings.default_playback_speed ?? 1.0,
          auto_play_next: settings.auto_play_next ?? true,
          skip_silence: settings.skip_silence ?? false
        });
      } catch (settingsError) {
        // Settings not found - use defaults
        console.log('Using default settings');
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };
  
  const saveProfile = async () => {
    if (!authorId) {
      toast.error('No profile found');
      return;
    }
    
    try {
      setSaving(true);
      await axios.put(`${API}/authors/${authorId}`, {
        name: profile.name,
        bio: profile.bio,
        short_bio: profile.short_bio,
        avatar: profile.avatar,
        social_links: profile.social_links
      });
      toast.success('Profile updated!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDisconnectWallet = () => {
    logout();
    disconnect();
    toast.success('Wallet disconnected');
  };
  
  const handleTelegramConnected = (author) => {
    setProfile(prev => ({
      ...prev,
      telegram_connected: true,
      telegram_username: author.telegram_username
    }));
    setShowTelegramConnect(false);
    toast.success('Telegram connected!');
  };
  
  const saveSettings = async () => {
    try {
      setSaving(true);
      await axios.put(`${API}/settings/${authorId}`, {
        ...notifications,
        ...privacy,
        ...playback
      });
      toast.success('Settings saved!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image (JPG, PNG, WebP, or GIF)');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    
    try {
      setUploadingImage(true);
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfile({...profile, avatar: base64String});
        toast.success('Image uploaded! Click "Save Profile" to keep changes.');
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-32">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-6">
            <SettingsIcon className="w-4 h-4" />
            Account Settings
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">Settings</span>
          </h1>
          <p className="text-gray-600">Manage your profile, notifications, and preferences</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border border-gray-200 rounded-2xl p-1 mb-6 w-full grid grid-cols-4">
            <TabsTrigger 
              value="profile"
              className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="notifications"
              className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger 
              value="privacy"
              className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white"
            >
              <Shield className="w-4 h-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger 
              value="integrations"
              className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Links
            </TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="bg-white border border-gray-200 rounded-3xl p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>
              
              {/* Avatar */}
              <div className="flex items-start gap-6 mb-8">
                <Avatar className={`w-24 h-24 border-4 ${getRatingBorderClass(profile.rating)} flex-shrink-0`}>
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                    {profile.name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-4">
                  <div>
                    <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                      <ImagePlus className="w-4 h-4" />
                      Avatar Image
                    </Label>
                    <div className="flex items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        onClick={handleUploadClick}
                        disabled={uploadingImage}
                        variant="outline"
                        className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      >
                        {uploadingImage ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" /> Upload Image</>
                        )}
                      </Button>
                      <span className="text-xs text-gray-500">
                        JPG, PNG, WebP, GIF (max 5MB)
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Or use URL
                    </Label>
                    <Input
                      value={profile.avatar}
                      onChange={(e) => setProfile({...profile, avatar: e.target.value})}
                      placeholder="https://example.com/avatar.jpg"
                      className="bg-gray-50 border-gray-200 rounded-xl"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You can also paste a direct link to an image
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="text-gray-900 font-medium mb-2 block">Display Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    placeholder="Your name"
                    className="bg-gray-50 border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-gray-900 font-medium mb-2 block flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Telegram Username
                  </Label>
                  {profile.telegram_connected ? (
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                      <span className="font-medium text-blue-700">@{profile.telegram_username || 'Connected'}</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowTelegramConnect(true)}
                      variant="outline"
                      className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Connect Telegram
                    </Button>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Your username is synced from Telegram
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <Label className="text-gray-900 font-medium mb-2 block">Short Bio</Label>
                <Input
                  value={profile.short_bio}
                  onChange={(e) => setProfile({...profile, short_bio: e.target.value})}
                  placeholder="Brief description for your profile card (max 100 chars)"
                  maxLength={100}
                  className="bg-gray-50 border-gray-200 rounded-xl"
                />
                <p className="text-xs text-gray-500 mt-1">{profile.short_bio?.length || 0}/100 - Shown on profile cards</p>
              </div>
              
              <div className="mb-6">
                <Label className="text-gray-900 font-medium mb-2 block">Full Bio</Label>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="bg-gray-50 border-gray-200 rounded-xl"
                />
                <p className="text-xs text-gray-500 mt-1">Shown on your full profile page</p>
              </div>
              
              <div className="mb-8">
                <Label className="text-gray-900 font-medium mb-2 block flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Wallet Address
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    value={walletAddress || profile.wallet_address}
                    disabled
                    placeholder="Connect wallet to see address"
                    className="bg-gray-100 border-gray-200 rounded-xl font-mono flex-1"
                  />
                  {isConnected && walletAddress && (
                    <Button
                      onClick={handleDisconnectWallet}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {isConnected 
                    ? 'Your connected wallet address is your unique identifier'
                    : 'Please connect your wallet to access your profile'
                  }
                </p>
              </div>
              
              <Button
                onClick={saveProfile}
                disabled={saving}
                className="bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-2xl px-8"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Profile</>
                )}
              </Button>
            </Card>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications">
            {/* Push Notifications Section */}
            <div className="mb-6">
              <PushNotificationManager userId={authorId} />
            </div>
            
            <Card className="bg-white border border-gray-200 rounded-3xl p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-medium text-gray-900">New Followers</p>
                    <p className="text-sm text-gray-500">Get notified when someone follows you</p>
                  </div>
                  <Switch
                    checked={notifications.notify_new_follower}
                    onCheckedChange={(checked) => setNotifications({...notifications, notify_new_follower: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-medium text-gray-900">New Comments</p>
                    <p className="text-sm text-gray-500">Get notified when someone comments</p>
                  </div>
                  <Switch
                    checked={notifications.notify_new_comment}
                    onCheckedChange={(checked) => setNotifications({...notifications, notify_new_comment: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-medium text-gray-900">Reactions</p>
                    <p className="text-sm text-gray-500">Get notified when someone reacts</p>
                  </div>
                  <Switch
                    checked={notifications.notify_new_reaction}
                    onCheckedChange={(checked) => setNotifications({...notifications, notify_new_reaction: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-medium text-gray-900">New Episodes</p>
                    <p className="text-sm text-gray-500">Get notified about new episodes from subscriptions</p>
                  </div>
                  <Switch
                    checked={notifications.notify_new_episode}
                    onCheckedChange={(checked) => setNotifications({...notifications, notify_new_episode: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-medium text-gray-900">Mentions</p>
                    <p className="text-sm text-gray-500">Get notified when someone mentions you</p>
                  </div>
                  <Switch
                    checked={notifications.notify_mentions}
                    onCheckedChange={(checked) => setNotifications({...notifications, notify_mentions: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={notifications.email_notifications}
                    onCheckedChange={(checked) => setNotifications({...notifications, email_notifications: checked})}
                  />
                </div>
              </div>
              
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="mt-8 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-2xl px-8"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Save Preferences</>
                )}
              </Button>
            </Card>
          </TabsContent>
          
          {/* Privacy Tab */}
          <TabsContent value="privacy">
            <Card className="bg-white border border-gray-200 rounded-3xl p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Privacy Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-medium text-gray-900">Public Profile</p>
                    <p className="text-sm text-gray-500">Make your profile visible to everyone</p>
                  </div>
                  <Switch
                    checked={privacy.profile_visible}
                    onCheckedChange={(checked) => setPrivacy({...privacy, profile_visible: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-medium text-gray-900">Listening History</p>
                    <p className="text-sm text-gray-500">Show what you&apos;ve been listening to</p>
                  </div>
                  <Switch
                    checked={privacy.show_listening_history}
                    onCheckedChange={(checked) => setPrivacy({...privacy, show_listening_history: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-medium text-gray-900">Allow Comments</p>
                    <p className="text-sm text-gray-500">Let others comment on your podcasts</p>
                  </div>
                  <Switch
                    checked={privacy.allow_comments}
                    onCheckedChange={(checked) => setPrivacy({...privacy, allow_comments: checked})}
                  />
                </div>
              </div>
              
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="mt-8 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-2xl px-8"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Save Settings</>
                )}
              </Button>
            </Card>
          </TabsContent>
          
          {/* Integrations/Links Tab */}
          <TabsContent value="integrations">
            <Card className="bg-white border border-gray-200 rounded-3xl p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Social Links</h2>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                    <Twitter className="w-4 h-4" />
                    Twitter / X
                  </Label>
                  <Input
                    value={profile.social_links?.twitter || ''}
                    onChange={(e) => setProfile({
                      ...profile, 
                      social_links: {...profile.social_links, twitter: e.target.value}
                    })}
                    placeholder="https://twitter.com/username"
                    className="bg-gray-50 border-gray-200 rounded-xl"
                  />
                </div>
                
                <div>
                  <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                    <Youtube className="w-4 h-4" />
                    YouTube
                  </Label>
                  <Input
                    value={profile.social_links?.youtube || ''}
                    onChange={(e) => setProfile({
                      ...profile, 
                      social_links: {...profile.social_links, youtube: e.target.value}
                    })}
                    placeholder="https://youtube.com/@channel"
                    className="bg-gray-50 border-gray-200 rounded-xl"
                  />
                </div>
                
                <div>
                  <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Discord
                  </Label>
                  <Input
                    value={profile.social_links?.discord || ''}
                    onChange={(e) => setProfile({
                      ...profile, 
                      social_links: {...profile.social_links, discord: e.target.value}
                    })}
                    placeholder="https://discord.gg/invite"
                    className="bg-gray-50 border-gray-200 rounded-xl"
                  />
                </div>
                
                <div>
                  <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Telegram
                  </Label>
                  <Input
                    value={profile.social_links?.telegram || ''}
                    onChange={(e) => setProfile({
                      ...profile, 
                      social_links: {...profile.social_links, telegram: e.target.value}
                    })}
                    placeholder="https://t.me/username"
                    className="bg-gray-50 border-gray-200 rounded-xl"
                  />
                </div>
                
                <div>
                  <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website
                  </Label>
                  <Input
                    value={profile.social_links?.website || ''}
                    onChange={(e) => setProfile({
                      ...profile, 
                      social_links: {...profile.social_links, website: e.target.value}
                    })}
                    placeholder="https://yourwebsite.com"
                    className="bg-gray-50 border-gray-200 rounded-xl"
                  />
                </div>
              </div>
              
              <Button
                onClick={saveProfile}
                disabled={saving}
                className="mt-8 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-2xl px-8"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Links</>
                )}
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Telegram Connect Modal */}
      {showTelegramConnect && authorId && (
        <TelegramConnect
          isOpen={showTelegramConnect}
          onClose={() => setShowTelegramConnect(false)}
          authorId={authorId}
          onConnected={handleTelegramConnected}
        />
      )}
    </div>
  );
};
