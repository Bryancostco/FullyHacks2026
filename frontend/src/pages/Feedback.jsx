import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMemory } from '../api';

// Fallback demo data — only used if no real answers exist
const demoData = {
  score: 84,
  strengths: [
    {
      title: 'Technical Articulation',
      detail: 'You explained the trade-offs between SQL and NoSQL databases clearly, demonstrating deep architecture knowledge.',
    },
    {
      title: 'Stakeholder Management',
      detail: 'Exceptional handling of the "difficult engineer" scenario with empathy and clear prioritization logic.',
    },
  ],
  weakAreas: [
    {
      title: 'Metric Definition',
      detail: 'Your KPIs for product success were slightly vague. Aim for S.M.A.R.T goals.',
      tip: 'Use the "North Star" metric framework for your next answer.',
      icon: 'info',
    },
    {
      title: 'Pacing',
      detail: 'You tended to rush through your reasoning in the final five minutes.',
      tip: 'Practice pausing for 2 seconds after each major point.',
      icon: 'timer',
    },
  ],
  transcripts: [
    {
      category: 'SYSTEM DESIGN',
      number: 4,
      score: 92,
      question: '"Explain how you would handle a sudden traffic spike of 100x during a Black Friday sale."',
      feedback: "Excellent response. You mentioned auto-scaling groups and horizontal sharding, which showed real-world infrastructure awareness.",
      color: 'primary',
    },
    {
      category: 'ANALYTICS',
      number: 7,
      score: 68,
      question: '"How would you measure the success of the new \'Buy Now\' button feature?"',
      feedback: "Your answer focused solely on conversion rates. A more comprehensive answer would include retention impact and cannibalization of other purchase paths.",
      color: 'tertiary',
    },
  ],
};

// Build display data from real Q&A answers returned by /quiz/answer
function buildFromAnswers(answers) {
  if (!answers || answers.length === 0) return null;

  const scoredAnswers = answers.filter((a) => a.score !== null && a.score !== undefined);
  const avgScore = scoredAnswers.length > 0
    ? Math.round(scoredAnswers.reduce((sum, a) => sum + a.score, 0) / scoredAnswers.length * 10)
    : 75; // fallback if no scores

  const strengths = scoredAnswers
    .filter((a) => a.score >= 7)
    .map((a) => ({
      title: `Question ${a.question_number}`,
      detail: a.feedback || `Strong answer on: "${a.question}"`,
    }));

  const weakAreas = scoredAnswers
    .filter((a) => a.score < 7 && a.weak_area)
    .map((a) => ({
      title: a.weak_area,
      detail: a.feedback || `Needs improvement: "${a.question}"`,
      tip: 'Review this topic and practice with more specific examples.',
      icon: 'info',
    }));

  const transcripts = answers.map((a, i) => ({
    category: `Q${a.question_number || i + 1}`,
    number: a.question_number || i + 1,
    score: a.score !== null ? a.score * 10 : null, // backend returns 1-10, display as %
    question: `"${a.question}"`,
    feedback: a.feedback || 'No feedback recorded.',
    color: a.score !== null && a.score >= 7 ? 'primary' : 'tertiary',
  }));

  return {
    score: avgScore,
    strengths: strengths.length > 0 ? strengths : [{ title: 'Session Completed', detail: 'You completed the full interview session.' }],
    weakAreas,
    transcripts,
  };
}

export default function Feedback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, companyName, roleTitle, answers } = location.state || {};

  // Build from real answers if available, otherwise fall back to demo
  const realData = buildFromAnswers(answers);
  const [data, setData] = useState(realData || demoData);
  const [loadingMemory, setLoadingMemory] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    // Also fetch /memory/{session_id} to supplement with HD memory content
    setLoadingMemory(true);
    getMemory(sessionId)
      .then((result) => {
        // If backend returned structured memory data, merge it in
        if (result && result.score) {
          setData((prev) => ({
            ...prev,
            score: result.score ?? prev.score,
            weakAreas: result.weak_areas?.length ? result.weak_areas.map((w) => ({
              title: w,
              detail: `This was identified as a weak area during your session.`,
              tip: 'Focus on this topic in your next practice session.',
              icon: 'info',
            })) : prev.weakAreas,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMemory(false));
  }, [sessionId]);

  const scorePercent = (data.score / 100) * 552.92;
  const dashOffset = 552.92 - scorePercent;

  const candidateLabel =
    data.score >= 85 ? 'Strong Candidate' : data.score >= 70 ? 'Qualified Candidate' : 'Developing Candidate';

  return (
    <main className="max-w-7xl mx-auto px-6 pt-8 pb-32">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-6xl font-[Manrope] font-extrabold tracking-tight mb-2 text-on-surface">
          Interview Complete
        </h1>
        <p className="text-on-surface-variant text-lg max-w-2xl font-[Inter]">
          Great work. You've completed the {roleTitle || 'Product Manager'} technical
          simulation{companyName ? ` for ${companyName}` : ''}. Here is your AI-generated feedback report.
        </p>
        {!realData && (
          <p className="text-xs text-on-surface-variant/60 mt-2 font-[Inter]">
            Showing sample data — connect the backend to see your real results.
          </p>
        )}
      </div>

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
          {answers && answers.length > 0 && (
            <p className="text-xs text-on-surface-variant mt-4 relative z-10 text-center">
              Based on {answers.length} answered question{answers.length !== 1 ? 's' : ''}
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
          </div>

          {/* Weak Areas */}
          <div className="bg-surface-container-low p-8 rounded-xl min-h-[300px]">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-tertiary">lightbulb</span>
              <h2 className="text-xl font-bold tracking-tight font-[Manrope]">Weak Areas</h2>
            </div>
            {data.weakAreas.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No major weak areas identified. Great job!</p>
            ) : (
              <div className="space-y-6">
                {data.weakAreas.map((w, i) => (
                  <div key={i} className="p-4 bg-surface-container-high rounded-lg">
                    <p className="text-tertiary font-bold text-sm uppercase tracking-wide mb-1">{w.title}</p>
                    <p className="text-on-surface text-sm mb-3">{w.detail}</p>
                    <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                      <span className="material-symbols-outlined text-xs">{w.icon}</span>
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
                    : 'Your performance is strong. Keep practicing to maintain your edge and tackle harder questions.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                <button
                  onClick={() => navigate('/')}
                  className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold py-3 px-8 rounded-md flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
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

      {/* Transcript Snippets */}
      <section className="mt-16">
        <h3 className="text-on-surface-variant font-[Inter] uppercase tracking-widest text-xs mb-8">
          {realData ? 'Your Interview Transcript' : 'AI Transcript Snippets'}
        </h3>
        <div className="space-y-4">
          {data.transcripts.map((t, i) => (
            <div
              key={i}
              className="bg-surface-container-low p-6 rounded-lg hover:bg-surface-container transition-all border-l-2 border-transparent hover:border-primary"
            >
              <div className="flex justify-between items-center mb-2">
                <span className={`text-xs font-bold ${t.color === 'primary' ? 'text-primary' : 'text-tertiary'}`}>
                  QUESTION {t.number} {t.category !== `Q${t.number}` ? `• ${t.category}` : ''}
                </span>
                {t.score !== null && (
                  <span className="text-xs text-on-surface-variant">Score: {t.score}%</span>
                )}
              </div>
              <p className="text-on-surface italic">{t.question}</p>
              <div className="mt-4 flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  t.color === 'primary' ? 'bg-primary/20 text-primary' : 'bg-tertiary/20 text-tertiary'
                }`}>
                  AI
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">{t.feedback}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
