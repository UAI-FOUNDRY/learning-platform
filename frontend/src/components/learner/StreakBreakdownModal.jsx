import React from 'react';
import { Link } from 'react-router-dom';

export default function StreakBreakdownModal({ isOpen, onClose, streakDays = 12 }) {
  if (!isOpen) return null;

  const pastDays = [
    { day: 'Mon', date: 'Oct 14', completed: true, xp: 80 },
    { day: 'Tue', date: 'Oct 15', completed: true, xp: 60 },
    { day: 'Wed', date: 'Oct 16', completed: true, xp: 120 },
    { day: 'Thu', date: 'Oct 17', completed: true, xp: 95 },
    { day: 'Fri', date: 'Oct 18', completed: true, xp: 110 },
    { day: 'Sat', date: 'Oct 19', completed: true, xp: 45 },
    { day: 'Sun', date: 'Oct 20', completed: true, xp: 50 },
    { day: 'Mon', date: 'Oct 21', completed: true, xp: 130 },
    { day: 'Tue', date: 'Oct 22', completed: true, xp: 90, isToday: true },
    { day: 'Wed', date: 'Tomorrow', completed: false, xp: 0 },
    { day: 'Thu', date: 'Oct 24', completed: false, xp: 0 },
    { day: 'Fri', date: 'Oct 25', completed: false, xp: 0 }
  ];

  const milestones = [
    { days: 3, title: 'Starter Spark', icon: '⚡', unlocked: true },
    { days: 7, title: 'Week of Focus', icon: '🔥', unlocked: true },
    { days: 14, title: 'Habit Master', icon: '🛡️', unlocked: false, progress: '12 / 14 days' },
    { days: 30, title: 'Academic Elite', icon: '👑', unlocked: false, progress: '12 / 30 days' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 font-sans animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-white border-2 border-[#B6AA9A] rounded-3xl shadow-2xl p-6 sm:p-8 z-10 animate-scale-in space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 border border-orange-300 flex items-center justify-center text-3xl shadow-sm animate-flame">
              🔥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#211E1A]">
                  {streakDays}-Day Streak!
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-900 border border-orange-300">
                  1.2x XP Multiplier
                </span>
              </div>
              <p className="text-xs text-[#514940] mt-0.5">
                Consistency is key. You've studied consecutively for 12 days.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#71675D] hover:text-[#211E1A] hover:bg-[#EAE3DA] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Streak Calendar Matrix */}
        <div className="bg-[#EAE3DA]/60 border border-[#B6AA9A] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#211E1A]">
            <span>Recent Activity Streak:</span>
            <span className="text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              ✓ Today Completed
            </span>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {pastDays.slice(0, 6).map((d, i) => (
              <div
                key={i}
                className={`p-2 rounded-xl border text-center transition-all ${
                  d.completed
                    ? 'bg-white border-emerald-300 shadow-2xs'
                    : 'bg-white/40 border-stone-200 opacity-60'
                }`}
              >
                <span className="text-[10px] font-bold text-[#71675D] block">{d.day}</span>
                <div className={`w-6 h-6 rounded-full mx-auto my-1 flex items-center justify-center text-[10px] font-black ${
                  d.completed ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-400'
                }`}>
                  {d.completed ? '✓' : '—'}
                </div>
                <span className="text-[9px] font-mono text-[#514940] block">+{d.xp}xp</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-6 gap-2 pt-1">
            {pastDays.slice(6, 12).map((d, i) => (
              <div
                key={i}
                className={`p-2 rounded-xl border text-center transition-all ${
                  d.isToday
                    ? 'bg-orange-50 border-orange-400 shadow-xs ring-2 ring-orange-300'
                    : d.completed
                    ? 'bg-white border-emerald-300 shadow-2xs'
                    : 'bg-white/40 border-stone-200 opacity-60'
                }`}
              >
                <span className="text-[10px] font-bold text-[#71675D] block">{d.day}</span>
                <div className={`w-6 h-6 rounded-full mx-auto my-1 flex items-center justify-center text-[10px] font-black ${
                  d.isToday
                    ? 'bg-orange-600 text-white animate-pulse'
                    : d.completed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-200 text-stone-400'
                }`}>
                  {d.completed ? '✓' : '—'}
                </div>
                <span className="text-[9px] font-mono text-[#514940] block">
                  {d.isToday ? 'Today' : d.completed ? `+${d.xp}xp` : 'Upcoming'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Milestone Progression */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-[#211E1A] uppercase tracking-wider">
            Streak Achievements & Badges
          </h4>

          <div className="grid grid-cols-2 gap-3">
            {milestones.map((m) => (
              <div
                key={m.days}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                  m.unlocked
                    ? 'bg-white border-emerald-300 shadow-2xs'
                    : 'bg-[#EAE3DA]/40 border-[#B6AA9A]/60 opacity-80'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                  m.unlocked ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-400'
                }`}>
                  {m.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h5 className="font-bold text-xs text-[#211E1A] truncate">{m.title}</h5>
                    {m.unlocked && (
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#71675D]">
                    {m.unlocked ? `${m.days} days unlocked` : m.progress}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Streak Freeze Shield Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div>
              <p className="font-bold text-blue-900">Streak Freeze Protection Active</p>
              <p className="text-[11px] text-blue-700">If you miss a day, 1 automatic freeze will preserve your 12-day streak.</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-blue-200 text-blue-900 text-[10px] font-black shrink-0">
            1 Available
          </span>
        </div>

        {/* Modal CTA Buttons */}
        <div className="pt-2 border-t border-[#B6AA9A]/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#EAE3DA] hover:bg-[#D6D0C8] text-[#211E1A] text-xs font-bold transition-colors"
          >
            Close
          </button>

          <Link
            to="/learner/my-learning"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#211E1A] hover:bg-black text-white text-xs font-black transition-all hover:scale-102 shadow-md flex items-center gap-1.5"
          >
            <span>Continue Learning Today</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
