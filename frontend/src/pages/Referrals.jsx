import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Users, Gift, Copy, Check, Share2, Award, 
  Loader2, UserPlus, TrendingUp, Crown, ExternalLink 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Get or create user ID
const getUserId = () => {
  let userId = localStorage.getItem('live_user_id');
  if (!userId) {
    userId = `user_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('live_user_id', userId);
  }
  return userId;
};

const getUsername = () => {
  return localStorage.getItem('live_username') || 'Anonymous';
};

export const Referrals = () => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [referralCode, setReferralCode] = useState(null);
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState({
    total_invites: 0,
    successful_invites: 0,
    total_xp_earned: 0,
    invites: []
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState(null);
  
  const userId = getUserId();
  const username = getUsername();

  const loadReferralData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load stats
      const statsRes = await axios.get(`${API}/referrals/stats/${userId}`);
      setStats(statsRes.data);
      
      if (statsRes.data.has_referral_code) {
        setReferralCode(statsRes.data.referral_code);
        setReferralLink(`${window.location.origin}/join?ref=${statsRes.data.referral_code}`);
      }
      
      // Load leaderboard
      const leaderboardRes = await axios.get(`${API}/referrals/leaderboard`);
      setLeaderboard(leaderboardRes.data.leaderboard || []);
      
      // Load history
      const historyRes = await axios.get(`${API}/referrals/history/${userId}`);
      setHistory(historyRes.data);
      
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  const generateReferralCode = async () => {
    try {
      setGenerating(true);
      const response = await axios.post(`${API}/referrals/generate`, {
        user_id: userId,
        user_name: username
      });
      
      setReferralCode(response.data.referral_code);
      setReferralLink(`${window.location.origin}/join?ref=${response.data.referral_code}`);
      toast.success('Referral code generated!');
      
      // Reload stats
      loadReferralData();
    } catch (error) {
      toast.error('Failed to generate referral code');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join FOMO Voice Club!',
          text: `Join me on FOMO Voice Club and get bonus XP! Use my referral code: ${referralCode}`,
          url: referralLink
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyToClipboard(referralLink);
        }
      }
    } else {
      copyToClipboard(referralLink);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Gift className="w-8 h-8 text-purple-600" />
            Invite Friends
          </h1>
          <p className="text-gray-600 mt-2">
            Share your referral code and earn XP when friends join!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.successful_invites}
                  </div>
                  <div className="text-sm text-gray-500">Friends Invited</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.total_xp_earned}
                  </div>
                  <div className="text-sm text-gray-500">XP Earned</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    +100 XP
                  </div>
                  <div className="text-sm text-gray-500">Per Referral</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Referral Code</CardTitle>
            <CardDescription>
              Share this code with friends. They get +50 XP bonus, you get +100 XP!
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referralCode ? (
              <div className="space-y-4">
                {/* Code Display */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-lg p-4 font-mono text-2xl text-center tracking-widest font-bold text-purple-600">
                    {referralCode}
                  </div>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => copyToClipboard(referralCode)}
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>

                {/* Link Display */}
                <div className="flex items-center gap-2">
                  <Input
                    value={referralLink}
                    readOnly
                    className="font-mono text-sm bg-gray-50"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => copyToClipboard(referralLink)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                {/* Share Button */}
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={shareReferral}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Invite Link
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  Generate your unique referral code to start inviting friends!
                </p>
                <Button 
                  onClick={generateReferralCode}
                  disabled={generating}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      Generate Referral Code
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Invited Friends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Your Invites
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.invites && stats.invites.length > 0 ? (
                <div className="space-y-3">
                  {stats.invites.map((invite, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                          {invite.invitee_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-medium">{invite.invitee_name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(invite.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-600 font-semibold">+{invite.xp_earned} XP</div>
                        <div className={`text-xs ${invite.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
                          {invite.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No invites yet</p>
                  <p className="text-sm">Share your code to start earning XP!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Top Referrers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((user, idx) => (
                    <div 
                      key={user.user_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-600' :
                          idx === 1 ? 'bg-gray-200 text-gray-600' :
                          idx === 2 ? 'bg-orange-100 text-orange-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="font-medium">{user.user_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{user.total_invites} invites</div>
                        <div className="text-xs text-gray-500">+{user.total_xp} XP</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No referrals yet</p>
                  <p className="text-sm">Be the first to invite friends!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How Referrals Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">1. Share Your Code</h3>
                <p className="text-sm text-gray-500">
                  Copy your unique referral code or share the invite link
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">2. Friend Joins</h3>
                <p className="text-sm text-gray-500">
                  Your friend signs up using your referral code
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="font-semibold mb-2">3. Both Earn XP</h3>
                <p className="text-sm text-gray-500">
                  You get +100 XP, your friend gets +50 XP bonus!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
