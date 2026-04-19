import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getNextQuestion, submitAnswer } from '../api';

export default function Interview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, companyName, roleTitle } = location.state || {};
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(
    '"Tell me about a time you had to optimize a high-traffic API endpoint under significant load constraints."'
  );
  const [questionNumber, setQuestionNumber] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    // Try to fetch the first question from backend
    getNextQuestion(sessionId)
      .then((data) => {
        if (data.question) {
          setCurrentQuestion(`"${data.question}"`);
          setQuestionNumber(data.question_number || 1);
        }
      })
      .catch(() => {});

    // Timer
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [sessionId, navigate]);

  // Toggle speaking state for visual demo
  useEffect(() => {
    const interval = setInterval(() => {
      setAiSpeaking((prev) => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEndCall = () => {
    clearInterval(timerRef.current);
    navigate('/feedback', {
      state: { sessionId, companyName, roleTitle },
    });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const waveHeights = [16, 24, 32, 40, 48, 40, 32, 24, 16, 12, 8];
  const waveDelays = ['1.2s', '1.5s', '1.1s', '1.4s', '1.3s', '1.4s', '1.1s', '1.5s', '1.2s', '1.5s', '1.1s'];

  return (
    <>
      <main className="min-h-[calc(100vh-144px)] flex flex-col md:flex-row max-w-7xl mx-auto px-6 py-8 gap-8">
        {/* Left Column */}
        <div className="flex-none w-full md:w-80 flex flex-col gap-6">
          <section>
            <p className="text-on-surface-variant font-[Inter] text-xs uppercase tracking-[0.2em] mb-2">
              Current Session
            </p>
            <h1 className="text-3xl font-[Manrope] font-extrabold tracking-tight text-on-surface">
              Live Interview:{' '}
              <span className="text-primary capitalize">{companyName || 'Company'}</span>
            </h1>
          </section>

          {/* Persona Card */}
          <div className="bg-surface-container-low rounded-xl p-6 ghost-border">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 p-1 bg-surface flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-5xl">person</span>
                </div>
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary border-4 border-surface-container-low rounded-full"></div>
              </div>
              <h2 className="text-lg font-[Manrope] font-bold text-on-surface">
                Technical Recruiter
              </h2>
              <p className="text-sm text-on-surface-variant mb-4">AI Interviewer Persona</p>
              <div className="w-full h-[1px] bg-outline-variant/20 mb-4"></div>
              <p className="text-xs text-on-surface-variant leading-relaxed italic">
                "I'll be evaluating your system design approach and architectural
                decision-making today."
              </p>
            </div>
          </div>

          {/* Pro Tip */}
          <div className="bg-surface-container-high/40 p-4 rounded-lg ghost-border">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-tertiary text-lg">lightbulb</span>
              <div>
                <p className="text-xs font-bold text-on-surface mb-1">PRO TIP</p>
                <p className="text-[11px] text-on-surface-variant leading-normal">
                  Use STAR method when answering behavioral questions.
                </p>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="bg-surface-container-low rounded-xl p-4 ghost-border text-center">
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">
              Elapsed
            </p>
            <p className="text-2xl font-[Manrope] font-bold text-primary tabular-nums">
              {formatTime(elapsed)}
            </p>
          </div>
        </div>

        {/* Right Column: Visualizer */}
        <div className="flex-1 flex flex-col gap-6 min-h-[500px]">
          {/* Waveform Canvas */}
          <div className="flex-1 bg-surface-container-low rounded-2xl relative overflow-hidden flex items-center justify-center border border-outline-variant/10">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_#69f6b8,_transparent,_transparent)]"></div>

            {/* Waveform */}
            <div className="relative w-full h-64 flex items-center justify-center gap-2 px-12 z-0">
              {waveHeights.map((h, i) => (
                <div
                  key={i}
                  className="waveform-bar w-2"
                  style={{
                    height: `${paused ? 4 : h}px`,
                    opacity: paused ? 0.3 : i >= 9 ? 0.3 + (9 - i) * 0.2 : 1,
                    animation: paused
                      ? 'none'
                      : `wave ${waveDelays[i]} ease-in-out infinite`,
                  }}
                ></div>
              ))}
            </div>

            {/* Speaking Status */}
            <div className="absolute top-8 flex flex-col items-center gap-2 z-10">
              <div className="glass-hud px-6 py-2 rounded-full border border-primary/40 bg-surface-container-high/80 backdrop-blur-md shadow-lg">
                <span className="text-sm font-[Manrope] font-bold text-primary tracking-wide drop-shadow-[0_0_8px_rgba(105,246,184,0.6)]">
                  {paused ? 'Paused' : aiSpeaking ? 'AI is speaking...' : 'Listening...'}
                </span>
              </div>
            </div>

            {/* Transcript */}
            <div className="absolute bottom-12 left-8 right-8 text-center z-10 bg-surface-container-low/60 backdrop-blur-sm p-4 rounded-xl border border-outline-variant/10">
              <p className="text-xl md:text-2xl font-[Manrope] font-bold text-on-surface leading-relaxed max-w-2xl mx-auto">
                {currentQuestion}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="glass-hud p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-outline-variant/20">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setMuted(!muted)}
                className="flex flex-col items-center gap-2 group transition-all active:scale-95"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border border-outline-variant/30 transition-colors ${
                  muted ? 'bg-error-container' : 'bg-surface-container-highest group-hover:bg-surface-bright'
                }`}>
                  <span className="material-symbols-outlined text-2xl text-on-surface">
                    {muted ? 'mic_off' : 'mic'}
                  </span>
                </div>
                <span className="text-[10px] font-[Inter] font-bold uppercase tracking-widest text-on-surface-variant">
                  {muted ? 'Unmute' : 'Mute'}
                </span>
              </button>
              <button className="flex flex-col items-center gap-2 group transition-all active:scale-95">
                <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/30 group-hover:bg-surface-bright transition-colors">
                  <span className="material-symbols-outlined text-2xl text-on-surface">settings</span>
                </div>
                <span className="text-[10px] font-[Inter] font-bold uppercase tracking-widest text-on-surface-variant">
                  Settings
                </span>
              </button>
            </div>

            <div className="h-12 w-[1px] bg-outline-variant/20 hidden md:block"></div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <button
                onClick={handleEndCall}
                className="flex-1 md:flex-none px-8 py-4 bg-error-container text-error rounded-xl font-[Manrope] font-bold flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined">call_end</span>
                End Call
              </button>
              <button
                onClick={() => setPaused(!paused)}
                className="flex-1 md:flex-none px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary-container rounded-xl font-[Manrope] font-bold flex items-center justify-center gap-3 shadow-[0_4px_24px_rgba(105,246,184,0.15)] transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined">
                  {paused ? 'play_arrow' : 'pause'}
                </span>
                {paused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
