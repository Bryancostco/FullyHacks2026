import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const sessions = [
  {
    id: 1,
    role: 'Senior Frontend Engineer',
    company: 'Google',
    date: 'Apr 18, 2026',
    duration: '24:32',
    score: 89,
    status: 'completed',
    questions: 8,
    strengths: ['System Design', 'React Architecture'],
    weakAreas: ['Testing Strategy'],
  },
  {
    id: 2,
    role: 'UI Architect',
    company: 'Stripe',
    date: 'Apr 15, 2026',
    duration: '31:10',
    score: 85,
    status: 'completed',
    questions: 10,
    strengths: ['Component Design', 'CSS Architecture'],
    weakAreas: ['Performance Optimization'],
  },
  {
    id: 3,
    role: 'Product Engineer',
    company: 'Meta',
    date: 'Apr 12, 2026',
    duration: '18:45',
    score: 78,
    status: 'completed',
    questions: 6,
    strengths: ['Problem Solving'],
    weakAreas: ['Metric Definition', 'Data Storytelling'],
  },
  {
    id: 4,
    role: 'Full Stack Developer',
    company: 'Netflix',
    date: 'Apr 08, 2026',
    duration: '27:15',
    score: 91,
    status: 'completed',
    questions: 9,
    strengths: ['API Design', 'Database Modeling', 'Communication'],
    weakAreas: [],
  },
  {
    id: 5,
    role: 'Backend Engineer',
    company: 'Airbnb',
    date: 'Apr 03, 2026',
    duration: '22:50',
    score: 72,
    status: 'completed',
    questions: 7,
    strengths: ['Python Proficiency'],
    weakAreas: ['Concurrency', 'System Scale'],
  },
];

function ScoreBadge({ score }) {
  const color =
    score >= 85 ? 'text-primary' : score >= 75 ? 'text-secondary' : 'text-tertiary';
  return <span className={`text-3xl font-[Manrope] font-extrabold ${color}`}>{score}</span>;
}

export default function History() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const filtered =
    filter === 'all'
      ? sessions
      : filter === 'high'
        ? sessions.filter((s) => s.score >= 85)
        : sessions.filter((s) => s.score < 85);

  const avgScore = Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length);
  const totalTime = sessions.reduce((a, s) => {
    const [m, sec] = s.duration.split(':').map(Number);
    return a + m * 60 + sec;
  }, 0);
  const totalHours = Math.floor(totalTime / 3600);
  const totalMins = Math.floor((totalTime % 3600) / 60);

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-8 py-8 pb-32 flex flex-col gap-10">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-[Manrope] font-extrabold tracking-tight text-on-surface mb-2">
          Session History
        </h1>
        <p className="text-on-surface-variant text-lg font-[Inter]">
          Review your past interviews and track your growth over time.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-low rounded-xl p-5 ghost-border">
          <p className="text-xs font-[Inter] uppercase tracking-widest text-on-surface-variant mb-2">
            Total Sessions
          </p>
          <p className="text-3xl font-[Manrope] font-extrabold text-on-surface">
            {sessions.length}
          </p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-5 ghost-border">
          <p className="text-xs font-[Inter] uppercase tracking-widest text-on-surface-variant mb-2">
            Avg Score
          </p>
          <p className="text-3xl font-[Manrope] font-extrabold text-primary">{avgScore}</p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-5 ghost-border">
          <p className="text-xs font-[Inter] uppercase tracking-widest text-on-surface-variant mb-2">
            Total Practice
          </p>
          <p className="text-3xl font-[Manrope] font-extrabold text-on-surface">
            {totalHours > 0 ? `${totalHours}h ` : ''}{totalMins}m
          </p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-5 ghost-border">
          <p className="text-xs font-[Inter] uppercase tracking-widest text-on-surface-variant mb-2">
            Best Score
          </p>
          <p className="text-3xl font-[Manrope] font-extrabold text-primary">
            {Math.max(...sessions.map((s) => s.score))}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All Sessions' },
          { key: 'high', label: 'Score 85+' },
          { key: 'low', label: 'Needs Work' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-full text-xs font-[Inter] font-bold uppercase tracking-wider transition-all ${
              filter === tab.key
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Session List */}
      <div className="flex flex-col gap-4">
        {filtered.map((session) => (
          <div
            key={session.id}
            onClick={() =>
              navigate('/feedback', {
                state: {
                  sessionId: `demo_${session.id}`,
                  companyName: session.company,
                  roleTitle: session.role,
                },
              })
            }
            className="bg-surface-container-low hover:bg-surface-container rounded-xl p-6 cursor-pointer transition-all group ghost-border"
          >
            <div className="flex items-center justify-between gap-6">
              {/* Left: Info */}
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
                  <span className="text-xl font-[Manrope] font-bold text-primary">
                    {session.company[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-[Manrope] font-bold text-on-surface truncate">
                    {session.role}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
                    <span>{session.company}</span>
                    <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                    <span>{session.date}</span>
                    <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                    <span>{session.duration}</span>
                    <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                    <span>{session.questions} questions</span>
                  </div>
                  {/* Tags */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {session.strengths.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                    {session.weakAreas.map((w) => (
                      <span
                        key={w}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-tertiary/10 text-tertiary rounded-full"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Score */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <ScoreBadge score={session.score} />
                <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                  Score
                </span>
              </div>

              {/* Arrow */}
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                chevron_right
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
