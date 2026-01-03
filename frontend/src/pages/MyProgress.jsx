import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Award, Clock, Mic, ThumbsUp, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const MyProgress = () => {
  const { user } = useAuth();
  const { walletAddress } = useWallet();
  const [progress, setProgress] = useState(null);
  const [badges, setBadges] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current user ID based on test mode or actual user
  const testMode = localStorage.getItem('testMode') || 'user';
  const testUserId = testMode === 'admin' ? 'demo-admin-002' : 'demo-user-003';
  
  const possibleUserIds = [
    user?.id,
    walletAddress,
    testUserId,
    'demo-owner-001'
  ].filter(Boolean);

  useEffect(() => {
    fetchProgressWithFallback();
  }, [user?.id, walletAddress]);

  const fetchProgressWithFallback = async () => {
    setLoading(true);
    setError(null);
    
    for (const userId of possibleUserIds) {
      try {
        const [progressRes, badgesRes] = await Promise.all([
          axios.get(`${API}/xp/${userId}/progress`),
          axios.get(`${API}/users/${userId}/badges`)
        ]);
        
        setProgress(progressRes.data);
        setBadges(badgesRes.data);
        setLoading(false);
        return;
      } catch (err) {
        continue;
      }
    }
    
    setError('Could not load progress. Please connect your wallet.');
    setLoading(false);
  };

  const getLevelName = (level) => {
    const names = { 1: 'Observer', 2: 'Active', 3: 'Contributor', 4: 'Speaker', 5: 'Core Voice' };
    return names[level] || 'Observer';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20" data-testid="progress-loading">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading your progress...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <TrendingUp className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">{error || 'Connect wallet to see your progress'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20" data-testid="progress-page">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">My Progress</h1>
          <p className="text-sm text-gray-500">Track your journey in the club</p>
        </div>

        {/* Level Card - Strict Style */}
        <div className="bg-gray-900 text-white rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current Level</div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-white text-gray-900 font-bold text-2xl">
                  {progress.current_level}
                </span>
                <div>
                  <div className="text-xl font-semibold">{getLevelName(progress.current_level)}</div>
                  <div className="text-sm text-gray-400">{progress.xp_total.toLocaleString()} XP total</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{progress.progress_percent}%</div>
              <div className="text-xs text-gray-400">to Level {progress.next_level}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${progress.progress_percent}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {progress.xp_to_next_level} XP needed for {progress.next_level_name}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">Engagement</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{progress.engagement_score.toFixed(1)}</div>
            <div className="text-xs text-gray-400">out of 100</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">Priority Score</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{progress.priority_score.toFixed(1)}</div>
            <div className="text-xs text-gray-400">hand raise queue</div>
          </div>
        </div>

        {/* XP Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg mb-6">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">XP Breakdown</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { icon: Clock, label: 'Listening Time', value: progress.xp_breakdown.listening_time },
              { icon: Mic, label: 'Live Attendance', value: progress.xp_breakdown.live_attendance },
              { label: 'Hand Raises', value: progress.xp_breakdown.hand_raises, emoji: '✋' },
              { label: 'Speeches Given', value: progress.xp_breakdown.speeches_given, emoji: '🎤' },
              { icon: ThumbsUp, label: 'Support Received', value: progress.xp_breakdown.support_received },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {item.icon ? (
                    <item.icon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <span className="text-sm">{item.emoji}</span>
                  )}
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value} XP</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        {badges && badges.total_badges > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Badges</h3>
              </div>
              <span className="text-sm text-gray-500">{badges.total_badges} earned</span>
            </div>
            
            <div className="p-4 flex flex-wrap gap-3">
              {['participation', 'contribution', 'authority'].map((category) => (
                badges.badges[category]?.map((badge, idx) => (
                  <div
                    key={`${category}-${idx}`}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                    title={badge.description}
                  >
                    <span className="text-lg">{badge.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{badge.name}</span>
                  </div>
                ))
              ))}
            </div>
          </div>
        )}

        {/* Empty Badges State */}
        {(!badges || badges.total_badges === 0) && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No badges yet</h3>
            <p className="text-sm text-gray-500">Participate in the club to earn badges</p>
          </div>
        )}
      </div>
    </div>
  );
};
