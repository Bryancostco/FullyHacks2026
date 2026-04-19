import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInsights } from '../api';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        <div className="flex items-center gap-3">
          <span className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></span>
          <span className="text-on-surface-variant">Loading insights...</span>
        </div>
      </main>
    );
  }

  if (!data || data.total_sessions === 0) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">analytics</span>
        <h2 className="text-2xl font-[Manrope] font-bold text-on-surface mb-2">No insights yet</h2>
        <p className="text-on-surface-variant mb-6">Complete your first interview to see your performance analytics.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-primary text-on-primary rounded-full font-bold"
        >
          Start Practice
        </button>
      </main>
    );
  }

  const candidateLabel =
    data.avg_score >= 85 ? 'Top 5% in Industry' : data.avg_score >= 70 ? 'Above Average' : 'Building Skills';

  // Build SVG chart points from score trend
  const scores = data.scores || [];
  const chartPoints = scores.map((s, i) => {
    const x = scores.length === 1 ? 50 : (i / (scores.length - 1)) * 100;
    const y = 100 - s.score; // invert for SVG coords
    return { x, y, ...s };
  });
  const linePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = linePath + ` L100,100 L0,100 Z`;

  const totalMins = Math.floor((data.total_practice_seconds || 0) / 60);
  const totalHours = Math.floor(totalMins / 60);

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-8 py-8 flex flex-col gap-10 pb-32">
      {/* Readiness Score + Chart */}
      <section className="flex flex-col md:flex-row gap-8">
        <div className="glass-panel rounded-xl p-8 flex-1 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-container/20 rounded-full blur-[64px] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-sm font-[Inter] uppercase tracking-widest text-on-surface-variant font-semibold">
                Overall Readiness
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/10 text-primary-container text-[10px] font-bold uppercase tracking-wide border border-primary-container/20">
                <span className="material-symbols-outlined text-[14px]">stars</span>
                {candidateLabel}
              </span>
            </div>
            <div className="flex items-end gap-4 mt-auto">
              <div className="text-7xl font-[Manrope] font-extrabold text-on-surface tracking-tighter">
                {data.avg_score}
              </div>
              <div className="text-on-surface-variant text-xl font-medium mb-2">/ 100</div>
            </div>
            <p className="text-sm text-on-surface-variant mt-4 max-w-sm">
              Based on {data.total_sessions} interview session{data.total_sessions !== 1 ? 's' : ''} totaling {totalHours > 0 ? `${totalHours}h ` : ''}{totalMins % 60}m of practice.
            </p>
          </div>
        </div>

        {/* Score Trend Chart */}
        <div className="glass-panel rounded-xl p-8 flex-[1.5] flex flex-col relative overflow-hidden">
          <h2 className="text-sm font-[Inter] uppercase tracking-widest text-on-surface-variant font-semibold mb-6">
            Score Trend (Last {scores.length} Sessions)
          </h2>
          <div className="flex-1 w-full relative min-h-[160px] flex items-end">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-full border-t border-outline-variant/10 h-0"></div>
              ))}
            </div>
            {scores.length > 0 && (
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
                {chartPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={i === chartPoints.length - 1 ? 5 : 4}
                    fill={i === chartPoints.length - 1 ? '#06b77f' : '#060e20'}
                    stroke="#06b77f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
            )}
            <div className="absolute bottom-0 left-0 w-full flex justify-between transform translate-y-8 text-[10px] font-[Inter] text-on-surface-variant/50 uppercase tracking-widest">
              {scores.length > 0 ? (
                <>
                  <span>{formatDate(scores[0]?.date)}</span>
                  {scores.length > 2 && <span>{formatDate(scores[Math.floor(scores.length / 2)]?.date)}</span>}
                  <span className="text-primary-container font-semibold">{formatDate(scores[scores.length - 1]?.date)}</span>
                </>
              ) : (
                <span>No data yet</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Strengths/Weaknesses + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Skill Breakdown */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <h3 className="text-lg font-[Manrope] font-semibold text-on-surface mb-2">Top Strengths</h3>
          <div className="grid grid-cols-1 gap-3">
            {(data.top_strengths || []).length === 0 ? (
              <p className="text-on-surface-variant text-sm">Complete more interviews to see patterns.</p>
            ) : (
              data.top_strengths.map(([name, count]) => (
                <div key={name} className="bg-surface-container-low rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">star</span>
                    <span className="text-sm font-medium text-on-surface">{name}</span>
                  </div>
                  <span className="text-xs text-on-surface-variant">{count}x</span>
                </div>
              ))
            )}
          </div>

          <h3 className="text-lg font-[Manrope] font-semibold text-on-surface mb-2 mt-4">Areas to Improve</h3>
          <div className="grid grid-cols-1 gap-3">
            {(data.top_weak_areas || []).length === 0 ? (
              <p className="text-on-surface-variant text-sm">No weak areas identified yet.</p>
            ) : (
              data.top_weak_areas.map(([name, count]) => (
                <div key={name} className="bg-surface-container-low rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tertiary">lightbulb</span>
                    <span className="text-sm font-medium text-on-surface">{name}</span>
                  </div>
                  <span className="text-xs text-on-surface-variant">{count}x</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Sessions */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-[Manrope] font-semibold text-on-surface">Recent Sessions</h3>
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-[Inter] uppercase tracking-widest text-primary-container hover:text-primary transition-colors"
            >
              View All
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {(data.recent || []).map((session) => (
              <div
                key={session.id}
                className="bg-surface-container-low hover:bg-surface-container transition-colors duration-300 rounded-xl p-4 flex items-center justify-between group cursor-pointer"
                onClick={() => navigate('/history')}
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
