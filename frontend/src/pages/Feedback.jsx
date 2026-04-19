import { useLocation, useNavigate } from 'react-router-dom';

export default function Feedback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, companyName, roleTitle, gradeResults, conversation } = location.state || {};

  // Use AI-generated results, or show a minimal fallback
  const data = gradeResults || {
    score: 0,
    strengths: [],
    weakAreas: [],
    transcripts: [],
  };

  const hasResults = gradeResults && gradeResults.score > 0;

  const scorePercent = (data.score / 100) * 552.92;
  const dashOffset = 552.92 - scorePercent;

  const candidateLabel =
    data.score >= 85 ? 'Strong Candidate' : data.score >= 70 ? 'Qualified Candidate' : data.score >= 50 ? 'Developing Candidate' : 'Needs Practice';

  return (
    <main className="max-w-7xl mx-auto px-6 pt-8 pb-32">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-6xl font-[Manrope] font-extrabold tracking-tight mb-2 text-on-surface">
          Interview Complete
        </h1>
        <p className="text-on-surface-variant text-lg max-w-2xl font-[Inter]">
          {hasResults
            ? `Great work. Here's your AI-generated feedback for the ${roleTitle || 'role'}${companyName ? ` at ${companyName}` : ''}.`
            : 'No interview data was captured. Try again and speak clearly during the interview.'}
        </p>
      </div>

      {!hasResults ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4">mic_off</span>
          <p className="text-on-surface-variant mb-6">No conversation was recorded during this session.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold py-3 px-8 rounded-md"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Score Ring */}
            <div className="lg:col-span-4 bg-surface-container-low rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #69f6b8 0%, transparent 70%)' }}
              ></div>
              <h3 className="text-on-surface-variant font-[Inter] uppercase tracking-widest text-xs mb-8 relative z-10">
                Overall Readiness
              </h3>
              <div className="relative w-48 h-48 flex items-center justify-center z-10">
                <svg className="w-full h-full transform -rotate-90">
                  <circle className="text-surface-container-high" cx="96" cy="96" r="88" fill="transparent" stroke="currentColor" strokeWidth="8" />
                  <circle
                    className="text-primary transition-all duration-1000"
                    cx="96" cy="96" r="88" fill="transparent"
                    stroke="currentColor" strokeWidth="8"
                    strokeDasharray="552.92"
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-extrabold text-primary">{data.score}</span>
                  <span className="text-on-surface-variant text-sm font-semibold">/ 100</span>
                </div>
              </div>
              <div className="mt-8 flex gap-2 items-center bg-surface-container-high px-4 py-2 rounded-full relative z-10">
                <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#69f6b8]"></span>
                <span className="text-primary text-sm font-bold uppercase tracking-tighter">
                  {candidateLabel}
                </span>
              </div>
              {conversation && (
                <p className="text-xs text-on-surface-variant mt-4 relative z-10 text-center">
                  Based on {conversation.length} conversation turns
                </p>
              )}
            </div>

            {/* Strengths + Weaknesses */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="bg-surface-container-low p-8 rounded-xl min-h-[300px]">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-primary">star</span>
                  <h2 className="text-xl font-bold tracking-tight font-[Manrope]">Key Strengths</h2>
                </div>
                {data.strengths.length === 0 ? (
                  <p className="text-on-surface-variant text-sm">No specific strengths identified.</p>
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

              {/* Weak Areas */}
              <div className="bg-surface-container-low p-8 rounded-xl min-h-[300px]">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-tertiary">lightbulb</span>
                  <h2 className="text-xl font-bold tracking-tight font-[Manrope]">Areas to Improve</h2>
                </div>
                {data.weakAreas.length === 0 ? (
                  <p className="text-on-surface-variant text-sm">No major weak areas identified. Great job!</p>
                ) : (
                  <div className="space-y-6">
                    {data.weakAreas.map((w, i) => (
                      <div key={i} className="p-4 bg-surface-container-high rounded-lg">
                        <p className="text-tertiary font-bold text-sm uppercase tracking-wide mb-1">{w.title}</p>
                        <p className="text-on-surface text-sm mb-3">{w.detail}</p>
                        {w.tip && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                            <span className="material-symbols-outlined text-xs">info</span>
                            Tip: {w.tip}
                          </div>
                        )}
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
                  <button
                    onClick={() => navigate('/')}
                    className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold py-3 px-8 rounded-md flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0"
                  >
                    <span className="material-symbols-outlined">refresh</span>
                    Practice Again
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Question-by-question breakdown */}
          {data.transcripts && data.transcripts.length > 0 && (
            <section className="mt-16">
              <h3 className="text-on-surface-variant font-[Inter] uppercase tracking-widest text-xs mb-8">
                Question-by-Question Breakdown
              </h3>
              <div className="space-y-4">
                {data.transcripts.map((t, i) => (
                  <div
                    key={i}
                    className="bg-surface-container-low p-6 rounded-lg hover:bg-surface-container transition-all border-l-2 border-transparent hover:border-primary"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-xs font-bold ${t.score >= 70 ? 'text-primary' : 'text-tertiary'}`}>
                        QUESTION {i + 1}
                      </span>
                      {t.score != null && (
                        <span className="text-xs text-on-surface-variant">Score: {t.score}%</span>
                      )}
                    </div>
                    <p className="text-on-surface italic">"{t.question}"</p>
                    {t.answer_summary && (
                      <p className="text-sm text-on-surface-variant mt-2">
                        <span className="font-semibold text-on-surface">Your answer: </span>
                        {t.answer_summary}
                      </p>
                    )}
                    <div className="mt-4 flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        t.score >= 70 ? 'bg-primary/20 text-primary' : 'bg-tertiary/20 text-tertiary'
                      }`}>
                        AI
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">{t.feedback}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
