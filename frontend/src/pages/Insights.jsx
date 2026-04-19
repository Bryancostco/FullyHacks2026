const skills = [
  { name: 'Technical Depth', icon: 'code', score: 92, color: 'primary' },
  { name: 'Communication', icon: 'forum', score: 85, color: 'primary' },
  { name: 'Clarity', icon: 'visibility', score: 88, color: 'primary' },
  { name: 'Confidence', icon: 'psychology', score: 74, color: 'tertiary' },
];

const sessions = [
  { role: 'Senior Frontend Engineer', company: 'Google Prep', date: 'Oct 05, 2023', score: 89, logo: 'G', logoColor: 'text-primary' },
  { role: 'UI Architect', company: 'Stripe Prep', date: 'Sep 28, 2023', score: 85, logo: 'S', logoColor: 'text-[#635BFF]' },
  { role: 'Product Engineer', company: 'Meta Prep', date: 'Sep 15, 2023', score: 78, logo: 'M', logoColor: 'text-[#0668E1]' },
];

export default function Insights() {
  return (
    <main className="max-w-7xl mx-auto px-6 md:px-8 py-8 flex flex-col gap-10 pb-32">
      {/* Readiness Score */}
      <section className="flex flex-col md:flex-row gap-8">
        {/* Score Card */}
        <div className="glass-panel rounded-xl p-8 flex-1 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-container/20 rounded-full blur-[64px] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-sm font-[Inter] uppercase tracking-widest text-on-surface-variant font-semibold">
                Overall Readiness
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/10 text-primary-container text-[10px] font-bold uppercase tracking-wide border border-primary-container/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                <span className="material-symbols-outlined text-[14px]">stars</span>
                Top 5% in Industry
              </span>
            </div>
            <div className="flex items-end gap-4 mt-auto">
              <div className="text-7xl font-[Manrope] font-extrabold text-on-surface tracking-tighter drop-shadow-[0_0_24px_rgba(16,185,129,0.2)]">
                87
              </div>
              <div className="text-on-surface-variant text-xl font-medium mb-2">/ 100</div>
            </div>
            <p className="text-sm text-on-surface-variant mt-4 max-w-sm">
              Your technical depth and communication metrics have stabilized at a senior
              engineering level.
            </p>
          </div>
        </div>

        {/* Score Trend Chart */}
        <div className="glass-panel rounded-xl p-8 flex-[1.5] flex flex-col relative overflow-hidden">
          <h2 className="text-sm font-[Inter] uppercase tracking-widest text-on-surface-variant font-semibold mb-6">
            Score Trend (Last 5 Sessions)
          </h2>
          <div className="flex-1 w-full relative min-h-[160px] flex items-end">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-full border-t border-outline-variant/10 h-0"></div>
              ))}
            </div>
            {/* SVG Chart */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#69f6b8" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#06b77f" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#06b77f" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#06b77f" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,80 L25,60 L50,65 L75,30 L100,20 L100,100 L0,100 Z" fill="url(#areaGrad)" />
              <path d="M0,80 L25,60 L50,65 L75,30 L100,20" fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <circle cx="25" cy="60" r="4" fill="#060e20" stroke="#06b77f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <circle cx="50" cy="65" r="4" fill="#060e20" stroke="#06b77f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <circle cx="75" cy="30" r="4" fill="#060e20" stroke="#06b77f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <circle cx="100" cy="20" r="5" fill="#06b77f" filter="drop-shadow(0px 0px 8px rgba(105,246,184,0.8))" />
            </svg>
            {/* X-Axis */}
            <div className="absolute bottom-0 left-0 w-full flex justify-between transform translate-y-8 text-[10px] font-[Inter] text-on-surface-variant/50 uppercase tracking-widest">
              <span>Sep 12</span>
              <span>Sep 18</span>
              <span>Sep 24</span>
              <span>Oct 02</span>
              <span className="text-primary-container font-semibold">Today</span>
            </div>
          </div>
        </div>
      </section>

      {/* Skills + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Skill Breakdown */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <h3 className="text-lg font-[Manrope] font-semibold text-on-surface mb-2">
            Skill Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {skills.map((skill) => (
              <div key={skill.name} className="bg-surface-container-low rounded-xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-xl">
                    {skill.icon}
                  </span>
                  <span className={`text-${skill.color} font-bold text-sm`}>
                    {skill.score}%
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-on-surface">{skill.name}</h4>
                  <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`bg-${skill.color} h-full rounded-full transition-all duration-1000`}
                      style={{ width: `${skill.score}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Sessions */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-[Manrope] font-semibold text-on-surface">
              Recent Sessions
            </h3>
            <button className="text-xs font-[Inter] uppercase tracking-widest text-primary-container hover:text-primary transition-colors">
              View All
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {sessions.map((session, i) => (
              <div
                key={i}
                className="bg-surface-container-low hover:bg-surface-container transition-colors duration-300 rounded-xl p-4 flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center">
                    <span className={`text-xl font-bold ${session.logoColor}`}>
                      {session.logo}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-on-surface">{session.role}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {session.company} &bull; {session.date}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-lg font-bold text-primary group-hover:scale-105 transition-transform">
                    {session.score}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Score
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
