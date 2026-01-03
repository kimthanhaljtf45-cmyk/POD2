import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Users, Radio, Play, Mic, ChevronRight, Bell, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { PodcastCard } from '../components/PodcastCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Live stream notification banner
const LiveNotification = ({ sessions, onClose }) => {
  if (!sessions || sessions.length === 0) return null;
  
  return (
    <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-3 rounded-lg mb-6 animate-pulse-slow" data-testid="live-notification">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 animate-pulse" />
            <span className="font-semibold">🔴 Live Now!</span>
          </div>
          <span className="text-white/90">
            {sessions.length === 1 
              ? `"${sessions[0].title}" is streaming now!` 
              : `${sessions.length} streams are live now!`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link to={sessions.length === 1 ? `/live/${sessions[0].id}` : '/lives'}>
            <Button size="sm" variant="secondary" className="bg-white text-red-600 hover:bg-gray-100">
              Join Now
            </Button>
          </Link>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const Home = () => {
  const [ownerPodcasts, setOwnerPodcasts] = useState([]);
  const [liveRooms, setLiveRooms] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [clubStats, setClubStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [clubSettings, setClubSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLiveNotification, setShowLiveNotification] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const settingsRes = await axios.get(`${API}/club/settings`);
      setClubSettings(settingsRes.data);

      const statsRes = await axios.get(`${API}/club/stats`);
      setClubStats(statsRes.data);

      const leaderboardRes = await axios.get(`${API}/xp/leaderboard?limit=10`);
      setLeaderboard(leaderboardRes.data?.leaderboard || []);

      if (settingsRes.data?.club_owner_wallet) {
        const usersRes = await axios.get(`${API}/users`);
        const owner = usersRes.data.find(u => u.wallet_address === settingsRes.data.club_owner_wallet);
        
        if (owner) {
          const podcastsRes = await axios.get(`${API}/podcasts`, {
            params: { author_id: owner.id }
          });
          setOwnerPodcasts(podcastsRes.data || []);
        }
      }

      // Fetch live sessions
      try {
        const sessionsRes = await axios.get(`${API}/live-sessions/sessions`);
        const activeSessions = (sessionsRes.data?.sessions || []).filter(s => s.status === 'live');
        setLiveSessions(activeSessions);
      } catch (e) {
        console.log('Live sessions fetch error:', e);
      }

      const liveRes = await axios.get(`${API}/live/active/all`);
      setLiveRooms(liveRes.data || []);

    } catch (error) {
      console.error('Failed to fetch home data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center" data-testid="home-loading">
        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12" data-testid="home-page">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2" data-testid="home-title">
            {clubSettings?.club_name || 'FOMO Voice Club'}
          </h1>
          <p className="text-gray-600">
            {clubSettings?.club_description || 'Private podcast club with reputation economy'}
          </p>
        </div>

        {/* Stats Row */}
        {clubStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="club-stats">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{clubStats.total_members}</div>
              <div className="text-sm text-gray-500">Members</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{clubStats.total_xp_earned?.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total XP</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{clubStats.total_speeches}</div>
              <div className="text-sm text-gray-500">Speeches</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{clubStats.total_badges_awarded}</div>
              <div className="text-sm text-gray-500">Badges</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Rooms */}
            {liveRooms.length > 0 && (
              <div data-testid="live-rooms-section">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <h2 className="text-lg font-semibold text-gray-900">Live Now</h2>
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                      {liveRooms.length}
                    </span>
                  </div>
                  <Link to="/lives" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {liveRooms.slice(0, 3).map((room) => (
                    <div
                      key={room.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer"
                      onClick={() => navigate(`/live/${room.id}`)}
                      data-testid={`live-room-${room.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <Radio className="w-5 h-5 text-red-500" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{room.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Users className="w-3 h-3" />
                              <span>{room.listener_count || 0} listening</span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white">
                          <Play className="w-3 h-3 mr-1" /> Join
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Episodes */}
            <div data-testid="episodes-section">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Latest Episodes</h2>
                <Link to="/library" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {ownerPodcasts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ownerPodcasts.slice(0, 6).map((podcast) => (
                    <PodcastCard key={podcast.id} podcast={podcast} />
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                  <Mic className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 mb-1">No episodes yet</h3>
                  <p className="text-sm text-gray-500">Check back soon for new content</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Top Members */}
            <div className="bg-white border border-gray-200 rounded-lg" data-testid="top-members-section">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Top Members</h3>
                <Link to="/leaderboard" className="text-sm text-gray-500 hover:text-gray-900">
                  View All
                </Link>
              </div>

              <div className="divide-y divide-gray-50">
                {leaderboard.slice(0, 10).map((entry, index) => (
                  <Link
                    key={entry.user_id}
                    to={`/author/${entry.user_id}`}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                    data-testid={`top-member-${index}`}
                  >
                    <div className="w-6 text-center">
                      {entry.rank <= 3 ? (
                        <span className={`text-sm font-bold ${
                          entry.rank === 1 ? 'text-yellow-600' :
                          entry.rank === 2 ? 'text-gray-500' :
                          'text-orange-600'
                        }`}>{entry.rank}</span>
                      ) : (
                        <span className="text-xs text-gray-400">#{entry.rank}</span>
                      )}
                    </div>
                    <img
                      src={entry.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=e5e7eb&color=374151`}
                      alt={entry.name}
                      className="w-8 h-8 rounded-full border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{entry.name}</div>
                      <div className="text-xs text-gray-500">{entry.xp_total.toLocaleString()} XP</div>
                    </div>
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded bg-gray-100 text-gray-700">
                      {entry.level}
                    </span>
                  </Link>
                ))}
              </div>

              {leaderboard.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No data yet
                </div>
              )}
            </div>

            {/* Club Activity */}
            {clubStats?.roles && (
              <div className="bg-white border border-gray-200 rounded-lg p-4" data-testid="club-activity">
                <h3 className="font-semibold text-gray-900 mb-3">Club Composition</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Admins', value: clubStats.roles.admin || 0 },
                    { label: 'Moderators', value: clubStats.roles.moderator || 0 },
                    { label: 'Speakers', value: clubStats.roles.speaker || 0 },
                    { label: 'Members', value: clubStats.roles.member || 0 },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
