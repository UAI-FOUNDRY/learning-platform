import React, { useState, useEffect } from 'react';
import { learnerService } from '../../services/learnerService';

export default function LearnerProfile() {
  const [profile, setProfile] = useState(() => learnerService.getProfile());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [headline, setHeadline] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');
  const [targetHours, setTargetHours] = useState(8);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [avatar, setAvatar] = useState('SC');
  const [reminderTime, setReminderTime] = useState('19:00');
  const [emailReminders, setEmailReminders] = useState(true);
  const [streakAlerts, setStreakAlerts] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setHeadline(profile.headline || '');
      setInstitution(profile.institution || '');
      setDepartment(profile.department || '');
      setTargetHours(profile.learningGoal?.weeklyTargetHours || 8);
      setSelectedInterests(profile.interests || ['Artificial Intelligence', 'Cloud Systems']);
      setAvatar(profile.avatar || 'SC');
    }
  }, [profile]);

  const allInterests = [
    'Artificial Intelligence',
    'Deep Learning',
    'Cloud Systems',
    'Software Architecture',
    'Accessibility & UX',
    'Rust & Systems',
    'Cybersecurity',
    'Data Science'
  ];

  const avatarChoices = ['SC', '🎓', '🔬', '💻', '🧠', '⚡', '📚'];

  const handleToggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else {
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updated = learnerService.updateProfile({
      name,
      email,
      headline,
      institution,
      department,
      avatar,
      learningGoal: {
        ...profile.learningGoal,
        weeklyTargetHours: Number(targetHours)
      },
      interests: selectedInterests
    });

    setProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* Page Header */}
      <div className="border-b border-[#B6AA9A]/60 pb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-[#211E1A] tracking-tight">
          Learner Profile & Study Goals
        </h1>
        <p className="text-xs sm:text-sm text-[#514940] mt-1">
          Manage your academic credentials, study goals, notifications, and earned achievements.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-[#B6AA9A]/50">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-[#211E1A] text-white flex items-center justify-center font-black text-2xl shadow-md">
                {avatar}
              </div>

              {/* Avatar Switcher */}
              <div className="flex items-center gap-1">
                {avatarChoices.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`w-6 h-6 rounded-md text-[11px] font-bold border transition-transform hover:scale-110 ${
                      avatar === av ? 'bg-[#D92D2D] text-white border-[#D92D2D]' : 'bg-[#EAE3DA] text-[#211E1A] border-[#B6AA9A]'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
              <h2 className="text-xl font-black text-[#211E1A]">{name || 'Sarah Chen'}</h2>
              <p className="text-xs text-[#514940] truncate">{headline || 'Computer Science Scholar'}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
                  {profile?.stats?.rankTitle || 'Advanced Scholar'}
                </span>
                <span className="text-xs text-[#71675D]">
                  🔥 {profile?.stats?.streakDays || 12}-Day Streak
                </span>
                <span className="text-xs text-[#D92D2D] font-bold">
                  ⭐ {profile?.stats?.totalPoints || 1450} XP
                </span>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-name" className="block text-xs font-bold text-[#211E1A] mb-1">
                Full Legal Name <span className="text-[#D92D2D]">*</span>
              </label>
              <input
                id="p-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            <div>
              <label htmlFor="p-email" className="block text-xs font-bold text-[#211E1A] mb-1">
                Email Address <span className="text-[#D92D2D]">*</span>
              </label>
              <input
                id="p-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            <div>
              <label htmlFor="p-inst" className="block text-xs font-bold text-[#211E1A] mb-1">
                University / Institution
              </label>
              <input
                id="p-inst"
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Stanford University"
                className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            <div>
              <label htmlFor="p-dept" className="block text-xs font-bold text-[#211E1A] mb-1">
                Department / Discipline
              </label>
              <input
                id="p-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="School of Engineering"
                className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="p-headline" className="block text-xs font-bold text-[#211E1A] mb-1">
                Academic Headline / Bio
              </label>
              <input
                id="p-headline"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Senior Computer Science Student @ Stanford University"
                className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>
          </div>
        </div>

        {/* Weekly Goals & Target Hours Slider */}
        <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-3">
            <div>
              <h3 className="text-base font-black text-[#211E1A]">Study Targets & Dedication</h3>
              <p className="text-xs text-[#514940]">Set weekly goals to maintain your streak and pace</p>
            </div>
            <span className="text-base sm:text-lg font-black text-[#D92D2D] bg-red-50 border border-red-200 px-3 py-1 rounded-xl">
              {targetHours} Hours / Week
            </span>
          </div>

          <div className="space-y-2">
            <input
              type="range"
              min="2"
              max="25"
              step="1"
              value={targetHours}
              onChange={(e) => setTargetHours(e.target.value)}
              className="w-full accent-[#D92D2D] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#71675D]">
              <span>Casual (2h/wk)</span>
              <span>Balanced (8h/wk)</span>
              <span>Intensive (25h/wk)</span>
            </div>
          </div>
        </div>

        {/* Interests & Topics of Focus */}
        <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <h3 className="text-base font-black text-[#211E1A] border-b border-[#B6AA9A]/50 pb-2">
            Learning Focus & Disciplines
          </h3>
          <p className="text-xs text-[#514940]">Select the topics you want prioritized on your dashboard and recommendations:</p>

          <div className="flex flex-wrap gap-2">
            {allInterests.map((interest) => {
              const isSelected = selectedInterests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => handleToggleInterest(interest)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:scale-102 ${
                    isSelected
                      ? 'bg-[#211E1A] text-white border-black shadow-xs'
                      : 'bg-[#EAE3DA]/60 hover:bg-[#EAE3DA] text-[#514940] border-[#B6AA9A]'
                  }`}
                >
                  {isSelected ? `✓ ${interest}` : `+ ${interest}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications & Study Reminders */}
        <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <h3 className="text-base font-black text-[#211E1A] border-b border-[#B6AA9A]/50 pb-2">
            Study Reminders & Streak Protection
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-[#EAE3DA]/40 rounded-xl border border-[#B6AA9A] cursor-pointer">
              <div>
                <p className="text-xs font-bold text-[#211E1A]">Daily Study Rhythm Reminder</p>
                <p className="text-[11px] text-[#71675D]">Alert if you haven't studied by scheduled hour</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="px-2 py-1 bg-white border border-[#B6AA9A] rounded text-xs font-mono"
                />
                <input
                  type="checkbox"
                  checked={streakAlerts}
                  onChange={(e) => setStreakAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#D92D2D] rounded"
                />
              </div>
            </label>

            <label className="flex items-center justify-between p-3 bg-[#EAE3DA]/40 rounded-xl border border-[#B6AA9A] cursor-pointer">
              <div>
                <p className="text-xs font-bold text-[#211E1A]">Assignment & Quiz Deadline Alerts</p>
                <p className="text-[11px] text-[#71675D]">Receive reminders 48 hours prior to deadline</p>
              </div>
              <input
                type="checkbox"
                checked={emailReminders}
                onChange={(e) => setEmailReminders(e.target.checked)}
                className="w-4 h-4 accent-[#D92D2D] rounded"
              />
            </label>
          </div>
        </div>

        {/* Save Actions Bar */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 animate-slide-up flex items-center gap-1.5">
              <span>✓</span>
              <span>Profile Preferences Saved Successfully!</span>
            </span>
          ) : (
            <span className="text-xs text-[#71675D]">All changes take effect across your portals immediately.</span>
          )}

          <button
            type="submit"
            className="px-6 py-3 bg-[#D92D2D] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-black transition-all shadow-md hover:scale-102 flex items-center gap-2"
          >
            <span>Save Profile & Goals</span>
            <span>✓</span>
          </button>
        </div>
      </form>
    </div>
  );
}
