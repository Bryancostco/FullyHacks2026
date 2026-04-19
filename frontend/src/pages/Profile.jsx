import { useState } from 'react';

export default function Profile() {
  const [name, setName] = useState('Yadid Alamilla');
  const [email, setEmail] = useState('yadid@example.com');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [experience, setExperience] = useState('Junior (0-2 years)');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="max-w-3xl mx-auto px-6 md:px-8 py-8 pb-32 flex flex-col gap-10">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-[Manrope] font-extrabold tracking-tight text-on-surface mb-2">
          Profile
        </h1>
        <p className="text-on-surface-variant text-lg font-[Inter]">
          Manage your account and interview preferences.
        </p>
      </div>

      {/* Avatar + Name Card */}
      <div className="bg-surface-container-low rounded-xl p-8 ghost-border flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shrink-0">
          <span className="text-3xl font-[Manrope] font-extrabold text-on-primary-container">
            {name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()}
          </span>
        </div>
        <div>
          <h2 className="text-2xl font-[Manrope] font-bold text-on-surface">{name}</h2>
          <p className="text-on-surface-variant text-sm mt-1">{email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#69f6b8]"></span>
            <span className="text-xs text-primary font-bold uppercase tracking-wider">
              Active Member
            </span>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <section className="flex flex-col gap-6">
        <h3 className="text-lg font-[Manrope] font-bold text-on-surface flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">person</span>
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-[11px] font-medium uppercase tracking-widest text-on-surface-variant">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-highest border-0 border-b-2 border-outline-variant/30 rounded-sm px-0 py-3 text-on-surface focus:ring-0 focus:border-primary focus:bg-surface-bright transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[11px] font-medium uppercase tracking-widest text-on-surface-variant">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-highest border-0 border-b-2 border-outline-variant/30 rounded-sm px-0 py-3 text-on-surface focus:ring-0 focus:border-primary focus:bg-surface-bright transition-all outline-none"
            />
          </div>
        </div>
      </section>

      {/* Interview Preferences */}
      <section className="flex flex-col gap-6">
        <h3 className="text-lg font-[Manrope] font-bold text-on-surface flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">tune</span>
          Interview Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-[11px] font-medium uppercase tracking-widest text-on-surface-variant">
              Target Role
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full bg-surface-container-highest border-0 border-b-2 border-outline-variant/30 rounded-sm px-0 py-3 text-on-surface focus:ring-0 focus:border-primary focus:bg-surface-bright transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[11px] font-medium uppercase tracking-widest text-on-surface-variant">
              Experience Level
            </label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full bg-surface-container-highest border-0 border-b-2 border-outline-variant/30 rounded-sm px-0 py-3 text-on-surface focus:ring-0 focus:border-primary focus:bg-surface-bright transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="Junior (0-2 years)">Junior (0-2 years)</option>
              <option value="Mid-Level (2-5 years)">Mid-Level (2-5 years)</option>
              <option value="Senior (5-10 years)">Senior (5-10 years)</option>
              <option value="Staff+ (10+ years)">Staff+ (10+ years)</option>
            </select>
          </div>
        </div>

        {/* Focus Areas */}
        <div className="space-y-3">
          <label className="block text-[11px] font-medium uppercase tracking-widest text-on-surface-variant">
            Focus Areas
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              'System Design',
              'Behavioral',
              'Data Structures',
              'APIs',
              'Frontend',
              'Backend',
              'Machine Learning',
              'Product Sense',
            ].map((area) => (
              <button
                key={area}
                className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-surface-container-highest text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all border border-outline-variant/20 hover:border-primary/30"
              >
                {area}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Settings */}
      <section className="flex flex-col gap-6">
        <h3 className="text-lg font-[Manrope] font-bold text-on-surface flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">settings</span>
          Settings
        </h3>
        <div className="flex flex-col gap-4">
          {/* Notification Toggle */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-5 ghost-border">
            <div>
              <p className="text-on-surface font-medium">Practice Reminders</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Get notified to keep your interview skills sharp
              </p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-7 rounded-full transition-all relative ${
                notifications ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${
                  notifications ? 'left-6' : 'left-1'
                }`}
              ></div>
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-5 ghost-border">
            <div>
              <p className="text-on-surface font-medium">Dark Mode</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Optimized for low-light environments
              </p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-12 h-7 rounded-full transition-all relative ${
                darkMode ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${
                  darkMode ? 'left-6' : 'left-1'
                }`}
              ></div>
            </button>
          </div>

          {/* Audio Settings */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-5 ghost-border">
            <div>
              <p className="text-on-surface font-medium">Audio Input</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Default microphone for voice interviews
              </p>
            </div>
            <span className="text-xs text-on-surface-variant font-medium">
              System Default
            </span>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-[Manrope] font-bold py-4 rounded-md hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10"
      >
        {saved ? (
          <span className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">check_circle</span>
            Saved!
          </span>
        ) : (
          'Save Changes'
        )}
      </button>

      {/* Danger Zone */}
      <section className="flex flex-col gap-4 pt-4 border-t border-outline-variant/10">
        <h3 className="text-sm font-[Inter] font-medium uppercase tracking-widest text-error">
          Danger Zone
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="px-6 py-3 rounded-md border border-outline-variant/20 text-on-surface-variant text-sm font-medium hover:bg-surface-container-high transition-colors">
            Export All Data
          </button>
          <button className="px-6 py-3 rounded-md border border-error/20 text-error text-sm font-medium hover:bg-error-container/20 transition-colors">
            Delete Account
          </button>
        </div>
      </section>
    </main>
  );
}
