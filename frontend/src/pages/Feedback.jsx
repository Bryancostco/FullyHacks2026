import { useLocation, useNavigate } from 'react-router-dom';

function buildFromAnswers(answers) {
  if (!answers || answers.length === 0) return null;
  const scored = answers.filter((a) => a.score != null);
  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length * 10)
    : 0;
  const strengths = scored.filter((a) => a.score >= 7).map((a) => ({
    title: `Question ${a.question_number}`,
    detail: a.feedback,
  }));
  const weakAreas = scored.filter((a) => a.score < 7 && a.weak_area).map((a) => ({
    title: a.weak_area,
    detail: a.feedback,
    tip: 'Review this topic and practice with specific examples.',
  }));
  const transcripts = answers.map((a) => ({
    number: a.question_number,
    score: a.score != null ? a.score * 10 : null,
    question: `"${a.question}"`,
    feedback: a.feedback || 'No feedback recorded.',
    good: a.score >= 7,
  }));
  return { score: avgScore, strengths, weakAreas, transcripts };
}

export default function Feedback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { companyName, roleTitle, answers } = location.state || {};
  const data = buildFromAnswers(answers);

  if (!data) {
    return (
      <main className="max-w-3xl mx-auto px-6 pt-24 pb-32 text-center">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-6 block">sentiment_neutral</span>
        <h1 className="text-3xl font-[Manrope] font-extrabold text-on-surface mb-4">No Interview Data</h1>
        <p className="text-on-surface-variant mb-8">
          The interview ended before any answers were captured. Complete at least one full Q&amp;A to see your report.
        </p>
        <button onClick={() => navigate('/')} className="px-8 py-3 bg-primary text-on-primary rounded-full font-bold hover:opacity-90 transition-all">
          Try Again
        </button>
      </main>
    );
  }

  const dashOffset = 552.92 - (data.score / 100) * 552.92;
  const candidateLabel = data.score >= 85 ? 'Strong Candidate' : data.score >= 70 ? 'Qualified Candidate' : 'Developing Candidate';

  return (
    <main className="max-w-7xl mx-auto px-6 pt-8 pb-32">
      <div className="mb-12">
        <h1 className="text-4xl md:text-6xl font-[Manrope] font-extrabold tracking-tight mb-2 text-on-surface">Interview Complete</h1>
        <p className="text-on-surface-variant text-lg max-w-2xl font-[Inter]">
          Great work. You completed the <span className="text-primary">{roleTitle || 'role'}</span> simulation{companyName ? ` for ${companyName}` : ''}.
        </p>
        <p className="text-xs text-primary/60 mt-1 font-[Inter]">
          Based on {answers.length} question{answers.length !== 1 ? 's' : ''} from your live session.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Score Ring */}
        <div className="lg:col-span-4 bg-surface-container-low rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #69f6b8 0%, transparent 70%)' }}></div>
          <h3 className="text-on-surface-variant font-[Inter] uppercase tracking-widest text-xs mb-8 relative z-10">Overall Readiness</h3>
          <div className="relative w-48 h-48 flex items-center justify-center z-10">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-surface-container-high" cx="96" cy="96" r="88" fill="transparent" stroke="currentColor" strokeWidth="8" />
              <circle className="text-primary transition-all duration-1000" cx="96" cy="96" r="88" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray="552.92" strokeDashoffset={dashOffset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-extrabold text-primary">{data.score}</span>
              <span className="text-on-surface-variant text-sm font-semibold">/ 100</span>
            </div>
          </div>
          <div className="mt-8 flex gap-2 items-center bg-surface-container-high px-4 py-2 rounded-full relative z-10">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#69f6b8]"></span>
            <span className="text-primary text-sm font-bold uppercase tracking-tighter">{candidateLabel}</span>
          </div>
        </div>

        {/* Strengths + Weak Areas */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-container-low p-8 rounded-xl min-h-[300px]">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">star</span>
              <h2 className="text-xl font-bold tracking-tight font-[Manrope]">Key Strengths</h2>
            </div>
            {data.strengths.length === 0 ? (
              <p className="text-on-surface-variant text-sm">Keep practicing — strong answers will appear here.</p>
            ) : (
              <ul className="space-y-6">
                {data.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="text-primary mt-1">&#9679;</span>
                    <div>
                      <p className="text-on-surface font-semibold">{s.title}</p>
                      <p className="text-on-surface-variant text-sm mt-1">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-surface-container-low p-8 rounded-xl min-h-[300px]">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-tertiary">lightbulb</span>
              <h2 className="text-xl font-bold tracking-tight font-[Manrope]">Weak Areas</h2>
            </div>
            {data.weakAreas.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No major weak areas — great performance!</p>
            ) : (
              <div className="space-y-4">
                {data.weakAreas.map((w, i) => (
                  <div key={i} className="p-4 bg-surface-container-high rounded-lg">
                    <p className="text-tertiary font-bold text-sm uppercase tracking-wide mb-1">{w.title}</p>
                    <p className="text-on-surface text-sm mb-2">{w.detail}</p>
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-xs">info</span>
                      Tip: {w.tip}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next Steps */}
          <div className="md:col-span-2 bg-surface-container-high p-8 rounded-xl border-l-4 border-primary shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-primary">rocket_launch</span>
                  <h2 className="text-2xl font-bold tracking-tight font-[Manrope]">Next Steps</h2>
                </div>
                <p className="text-on-surface-variant">
                  {data.weakAreas.length > 0
                    ? `Focus on improving ${data.weakAreas.map((w) => w.title).join(', ')} to push into the top 5% of candidates.`
                    : 'Your performance is strong. Keep practicing to maintain your edge.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                <button onClick={() => navigate('/')} className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold py-3 px-8 rounded-md flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <span className="material-symbols-outlined">refresh</span>
                  Practice Again
                </button>
                <button className="border border-outline-variant/20 text-primary font-bold py-3 px-8 rounded-md flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors active:scale-95">
                  <span className="material-symbols-outlined">share</span>
                  Share Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript */}
      <section className="mt-16">
        <h3 className="text-on-surface-variant font-[Inter] uppercase tracking-widest text-xs mb-8">Your Interview Transcript</h3>
        <div className="space-y-4">
          {data.transcripts.map((t, i) => (
            <div key={i} className="bg-surface-container-low p-6 rounded-lg border-l-2 border-transparent hover:border-primary hover:bg-surface-container transition-all">
              <div className="flex justify-between items-center mb-2">
                <span className={`text-xs font-bold ${t.good ? 'text-primary' : 'text-tertiary'}`}>QUESTION {t.number}</span>
                {t.score != null && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${t.good ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'}`}>
                    {t.score}%
                  </span>
                )}
              </div>
              <p className="text-on-surface italic mb-4">{t.question}</p>
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${t.good ? 'bg-primary/20 text-primary' : 'bg-tertiary/20 text-tertiary'}`}>AI</div>
                <p className="text-sm text-on-surface-variant leading-relaxed">{t.feedback}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
