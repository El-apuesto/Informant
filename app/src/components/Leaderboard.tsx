import { useEffect, useState } from 'react';
import { api, type GameScore } from '@/services/api';
import { Trophy, User } from 'lucide-react';

export function Leaderboard() {
  const [scores, setScores] = useState<GameScore[]>([]);
  const [myScores, setMyScores] = useState<GameScore[]>([]);
  const [activeTab, setActiveTab] = useState<'global' | 'personal'>('global');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    try {
      const [globalData, personalData] = await Promise.all([
        api.getLeaderboard(),
        api.getMyScores(),
      ]);
      setScores(globalData.scores);
      setMyScores(personalData.scores);
    } catch (e) {
      console.error('Failed to load scores:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-[#3c6e47] text-sm font-mono">LOADING INTELLIGENCE...</p>
      </div>
    );
  }

  const displayScores = activeTab === 'global' ? scores : myScores;

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('global')}
          className={`flex-1 py-2 text-xs font-mono ${
            activeTab === 'global'
              ? 'bg-[#ffd700] text-[#080a0f]'
              : 'border border-[#2a3b4f] text-[#3c6e47]'
          }`}
        >
          <Trophy className="w-3 h-3 inline mr-1" /> GLOBAL
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex-1 py-2 text-xs font-mono ${
            activeTab === 'personal'
              ? 'bg-[#ffd700] text-[#080a0f]'
              : 'border border-[#2a3b4f] text-[#3c6e47]'
          }`}
        >
          <User className="w-3 h-3 inline mr-1" /> MY SCORES
        </button>
      </div>

      {displayScores.length === 0 ? (
        <p className="text-[#3c6e47] text-center text-sm font-mono">
          {activeTab === 'global' ? 'NO DATA AVAILABLE' : 'NO ESCAPES RECORDED'}
        </p>
      ) : (
        <div className="space-y-1">
          {displayScores.map((score, index) => (
            <div
              key={score.id}
              className="flex items-center justify-between bg-[#080a0f] border border-[#2a3b4f] p-2"
            >
              <div className="flex items-center gap-2">
                <span className={`w-6 text-center font-audiowide ${
                  index === 0 ? 'text-[#ffd700]' :
                  index === 1 ? 'text-gray-400' :
                  index === 2 ? 'text-amber-700' :
                  'text-[#3c6e47]'
                }`}>
                  {index + 1}
                </span>
                <span className="text-[#e0ffe0] text-xs font-mono truncate max-w-[120px]">
                  {activeTab === 'global' 
                    ? (score.users?.email?.split('@')[0] || 'UNKNOWN')
                    : 'YOU'
                  }
                </span>
              </div>
              <div className="text-right">
                <p className="text-[#ffd700] font-mono text-sm">{score.score.toLocaleString()}</p>
                <p className="text-[#3c6e47] text-xs">{formatTime(score.survival_time)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
