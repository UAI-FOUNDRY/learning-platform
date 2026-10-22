import React from 'react';

export default function LeaderboardModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const scholars = [
    { rank: 1, name: 'Alex Rivera', avatar: 'AR', university: 'MIT EECS', streak: 28, points: 2850, badge: '🏆 Legend' },
    { rank: 2, name: 'Priya Sharma', avatar: 'PS', university: 'Carnegie Mellon', streak: 24, points: 2420, badge: '⚡ Master' },
    { rank: 3, name: 'Marcus Sterling', avatar: 'MS', university: 'UC Berkeley', streak: 19, points: 1980, badge: '🔥 Veteran' },
    { rank: 4, name: 'Sarah Chen (You)', avatar: 'SC', university: 'Stanford University', streak: 12, points: 1450, badge: '⭐ Advanced' },
    { rank: 5, name: 'Liam Davies', avatar: 'LD', university: 'Oxford Computing', streak: 11, points: 1390, badge: '💡 Scholar' },
    { rank: 6, name: 'Elena Zhou', avatar: 'EZ', university: 'Harvard SEAS', streak: 9, points: 1210, badge: '🎯 Scholar' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-in my-8">
        <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <div>
              <h2 className="text-lg font-black text-[#211E1A]">
                Global Scholar Leaderboard
              </h2>
              <p className="text-[11px] text-[#71675D]">Weekly XP points & consistent study streaks</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#71675D] hover:text-[#211E1A] text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Podium Top 3 Spotlight */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          {/* Rank 2 */}
          <div className="p-3 bg-[#EAE3DA]/60 border border-[#B6AA9A] rounded-2xl space-y-1">
            <span className="text-xl">🥈</span>
            <p className="text-xs font-black text-[#211E1A] truncate">{scholars[1].name}</p>
            <p className="text-[10px] text-[#71675D] font-mono">{scholars[1].points} XP</p>
          </div>

          {/* Rank 1 */}
          <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-1 transform -translate-y-2 shadow-xs">
            <span className="text-2xl">🥇</span>
            <p className="text-xs font-black text-[#211E1A] truncate">{scholars[0].name}</p>
            <p className="text-[10px] font-bold text-amber-900 font-mono">{scholars[0].points} XP</p>
          </div>

          {/* Rank 3 */}
          <div className="p-3 bg-[#EAE3DA]/60 border border-[#B6AA9A] rounded-2xl space-y-1">
            <span className="text-xl">🥉</span>
            <p className="text-xs font-black text-[#211E1A] truncate">{scholars[2].name}</p>
            <p className="text-[10px] text-[#71675D] font-mono">{scholars[2].points} XP</p>
          </div>
        </div>

        {/* Leaderboard Table List */}
        <div className="space-y-1.5 pt-2 max-h-64 overflow-y-auto">
          {scholars.map((s) => {
            const isUser = s.name.includes('(You)');
            return (
              <div
                key={s.rank}
                className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
                  isUser
                    ? 'bg-[#EAE3DA] border-[#D92D2D] shadow-xs'
                    : 'bg-white border-[#B6AA9A]/70 hover:bg-[#EAE3DA]/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-5 font-black text-center ${isUser ? 'text-[#D92D2D]' : 'text-[#71675D]'}`}>
                    #{s.rank}
                  </span>

                  <div className="w-7 h-7 rounded-lg bg-[#211E1A] text-white flex items-center justify-center font-bold text-[11px]">
                    {s.avatar}
                  </div>

                  <div>
                    <p className={`font-black ${isUser ? 'text-[#D92D2D]' : 'text-[#211E1A]'}`}>
                      {s.name}
                    </p>
                    <p className="text-[10px] text-[#71675D]">{s.university}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono font-black text-[#211E1A]">{s.points} XP</p>
                  <p className="text-[10px] text-[#71675D]">🔥 {s.streak}d streak</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[#211E1A] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
        >
          Keep Climbing
        </button>
      </div>
    </div>
  );
}
