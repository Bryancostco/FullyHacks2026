import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInsights } from '../api';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatPractice(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Insights() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInsights()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-center min-h-[60vh]">
        <p className="text-on-surface-variant">Loading insights...</p>
      </main>
    );
  }

  if (!data || data.total_sessions === 0) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant">insights</span>
        <p className="text-on-surface-variant text-lg">No insights yet. Complete an interview to see your analytics.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary text-on-primary rounded-full font-bold hover:opacity-90 transition-all">
          Start Practicing
        </button>
      </main>
    );
  }

  const skills = [
    { name: 'Technical Depth', icon: 'code', score: data.skill_technical },
    { name: 'Communication', icon: 'forum', score: data.skill_communication },
    { name: 'Clarity', icon: 'visibility', score: data.skill_clarity },
    { name: 'Confidence', icon: 'psychology', score: data.skill_confidence },
  ];

  const trend = data.score_trend || [];
  const scores = trend.map((t) => t.score);
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);
  const range = maxScore - minScore || 1;

  const toSvgY = (score) => 100 - ((score - minScore) / range) * 80 - 10;
  const toSvgX = (i) => scores.length === 1 ? 50 : (i / (scores.length - 1)) * 100;

  const linePath = scores.map((s, i) => `${i === 0 ? 'M' : 'L'}${toSvgX(i)},${toSvgY(s)}`).join(' ');
  const areaPath = scores.length
    ? `${linePath} L${toSvgX(scores.length - 1)},100 L${toSvgX(0)},100 Z`
    : '';

  const candidateLabel =
    data.overall_score >= 85 ? 'Top 10% Candidate' : data.overall_score >= 70 ? 'Strong Candidate' : 'Developing Candidate';

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-8 py-8 flex flex-col gap-10 pb-32">
      <section className="flex flex-col md:flex-row gap-8">
        {/* Score Card */}
        <div className="glass-panel rounded-xl p-8 flex-1 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-container/20 rounded-full blur-[64px] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-sm font-[Inter] uppercase tracking-widest text-on-surface-variant font-semibold">
                Overall Readiness
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/10 text-primary text-[10px] font-bold uppercase tracking-wide border border-primary/20">
                <span className="material-symbols-outlined text-[14px]">stars</span>
                {candidateLabel}
              </span>
            </div>
            <div className="flex items-end gap-4 mt-auto">
              <div className="text-7xl font-[Manrope] font-extrabold text-on-surface tracking-tighter">
                {data.overall_score}
              </div>
              <div className="text-on-surface-variant text-xl font-medium mb-2">/ 100</div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{data.total_sessions}</p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Sessions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{data.best_score}</p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Best</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{formatPractice(data.total_practice_seconds)}</p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Practice</p>
              </div>
            </div>
          </div>
        </div>

        {/* Score Trend Chart */}
        <div className="glass-panel rounded-xl p-8 flex-[1.5] flex flex-col relative overflow-hidden">
          <h2 className="text-sm font-[Inter] uppercase tracking-widest text-on-surface-variant font-semibold mb-6">
            Score Trend (Last {trend.length} Sessions)
          </h2>
          {trend.length < 2 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">
              Complete more interviews to see your trend.
            </div>
          ) : (
            <div className="flex-1 w-full relative min-h-40 flex items-end">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-full border-t border-outline-variant/10 h-0"></div>
                ))}
              </div>
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
                <path d={areaPath} fill="url(#areaGrad)" />
                <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                {scores.map((s, i) => (
                  <circle key={i} cx={toSvgX(i)} cy={toSvgY(s)} r={i === scores.length - 1 ? 5 : 4}
                    fill={i === scores.length - 1 ? '#06b77f' : '#060e20'}
                    stroke="#06b77f" strokeWidth="2" vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
              <div className="absolute bottom-0 left-0 w-full flex justify-between transform translate-y-8 text-[10px] font-[Inter] text-on-surface-variant/50 uppercase tracking-widest">
                {trend.map((t, i) => (
                  <span key={i} className={i === trend.length - 1 ? 'text-primary font-semibold' : ''}>{formatDate(t.date)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Skill Breakdown */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <h3 className="text-lg font-[Manrope] font-semibold text-on-surface mb-2">Skill Breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            {skills.map((skill) => (
              <div key={skill.name} className="bg-surface-container-low rounded-xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-xl">{skill.icon}</span>
                  <span className={`font-bold text-sm ${skill.score >= 80 ? 'text-primary' : 'text-tertiary'}`}>
                    {skill.score}%
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-on-surface">{skill.name}</h4>
                  <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${skill.score >= 80 ? 'bg-primary' : 'bg-tertiary'}`}
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
            <h3 className="text-lg font-[Manrope] font-semibold text-on-surface">Recent Sessions</h3>
            <button onClick={() => navigate('/history')} className="text-xs font-[Inter] uppercase tracking-widest text-primary hover:opacity-70 transition-opacity">
              View All
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {(data.recent_sessions || []).map((session, i) => (
              <div
                key={i}
                onClick={() => navigate('/feedback', {
                  state: {
                    sessionId: session.session_id,
                    companyName: session.company_name,
                    roleTitle: session.role_title,
                    answers: session.transcripts || [],
                  },
                })}
                className="bg-surface-container-low hover:bg-surface-container transition-colors duration-300 rounded-xl p-4 flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {(session.company_name || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-on-surface">{session.role_title}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {session.company_name} &bull; {formatDate(session.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-lg font-bold text-primary group-hover:scale-105 transition-transform">
                    {session.score}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Score</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
