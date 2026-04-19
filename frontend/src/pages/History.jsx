import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInterviews } from '../api';

function ScoreBadge({ score }) {
  const color =
    score >= 85 ? 'text-primary' : score >= 75 ? 'text-secondary' : 'text-tertiary';
  return <span className={`text-3xl font-[Manrope] font-extrabold ${color}`}>{score}</span>;
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getInterviews()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === 'all'
      ? sessions
      : filter === 'high'
        ? sessions.filter((s) => s.score >= 85)
        : sessions.filter((s) => s.score < 85);

  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((a, s) => a + (s.score || 0), 0) / sessions.length)
    : 0;
  const totalSeconds = sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);
  const totalMins = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMins / 60);
  const bestScore = sessions.length > 0 ? Math.max(...sessions.map((s) => s.score || 0)) : 0;

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <span className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></span>
          <span className="text-on-surface-variant">Loading history...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-8 py-8 pb-32 flex flex-col gap-10">
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
          <p className="text-xs font-[Inter] uppercase tracking-widest text-on-surface-variant mb-2">Total Sessions</p>
          <p className="text-3xl font-[Manrope] font-extrabold text-on-surface">{sessions.length}</p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-5 ghost-border">
          <p className="text-xs font-[Inter] uppercase tracking-widest text-on-surface-variant mb-2">Avg Score</p>
          <p className="text-3xl font-[Manrope] font-extrabold text-primary">{avgScore}</p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-5 ghost-border">
          <p className="text-xs font-[Inter] uppercase tracking-widest text-on-surface-variant mb-2">Total Practice</p>
          <p className="text-3xl font-[Manrope] font-extrabold text-on-surface">
            {totalHours > 0 ? `${totalHours}h ` : ''}{totalMins % 60}m
          </p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-5 ghost-border">
          <p className="text-xs font-[Inter] uppercase tracking-widest text-on-surface-variant mb-2">Best Score</p>
          <p className="text-3xl font-[Manrope] font-extrabold text-primary">{bestScore}</p>
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
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4">history</span>
          <p className="text-on-surface-variant">
            {sessions.length === 0 ? 'No interviews yet. Start your first practice!' : 'No sessions match this filter.'}
          </p>
          {sessions.length === 0 && (
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 bg-primary text-on-primary rounded-full font-bold text-sm"
            >
              Start Practice
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((session) => (
            <div
              key={session.id}
              onClick={() =>
                navigate('/feedback', {
                  state: {
                    sessionId: session.session_id,
                    companyName: session.company_name,
                    roleTitle: session.role_title,
                    gradeResults: {
                      score: session.score,
                      strengths: session.strengths || [],
                      weakAreas: session.weak_areas || [],
                      transcripts: session.transcripts || [],
                    },
                    conversation: session.conversation,
                  },
                })
              }
              className="bg-surface-container-low hover:bg-surface-container rounded-xl p-6 cursor-pointer transition-all group ghost-border"
            >
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
                    <span className="text-xl font-[Manrope] font-bold text-primary">
                      {(session.company_name || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-[Manrope] font-bold text-on-surface truncate">
                      {session.role_title || 'Interview'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
                      <span>{session.company_name}</span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                      <span>{formatDate(session.created_at)}</span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                      <span>{formatDuration(session.duration_seconds)}</span>
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {(session.strengths || []).slice(0, 2).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full">
                          {s.title}
                        </span>
                      ))}
                      {(session.weak_areas || []).slice(0, 2).map((w, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-tertiary/10 text-tertiary rounded-full">
                          {w.title}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <ScoreBadge score={session.score || 0} />
                  <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Score</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                  chevron_right
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
