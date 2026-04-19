import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VoiceMentor from '../components/VoiceMentor';
import { generateFeedback } from '../api';

export default function Interview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, companyName, roleTitle, realtimeSession } = location.state || {};

  const [voiceStatus, setVoiceStatus] = useState({ isActive: false, isAiSpeaking: false });
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);
  const timerRef = useRef(null);
  const turnsRef = useRef([]);
  const stopVoiceRef = useRef(null);

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [sessionId, navigate]);

  const handleTurnAdded = (turn) => { turnsRef.current.push(turn); };

  const handleEndCall = async () => {
    clearInterval(timerRef.current);
    setEnding(true);
    let answers = null;
    try {
      if (turnsRef.current.length > 0) {
        const result = await generateFeedback(sessionId, turnsRef.current);
        answers = result.answers;
      }
    } catch (e) {
      console.warn('Feedback generation failed:', e);
    }
    navigate('/feedback', { state: { sessionId, companyName, roleTitle, answers } });
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <main className="min-h-[calc(100vh-144px)] flex flex-col md:flex-row max-w-7xl mx-auto px-6 py-8 gap-8">
      {/* Left sidebar */}
      <div className="flex-none w-full md:w-72 flex flex-col gap-5">
        <div>
          <p className="text-on-surface-variant text-xs uppercase tracking-widest mb-1">Current Session</p>
          <h1 className="text-2xl font-[Manrope] font-extrabold text-on-surface">
            Live Interview: <span className="text-primary capitalize">{companyName || 'Company'}</span>
          </h1>
        </div>

        <div className="bg-surface-container-low rounded-xl p-5 flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-2 border-primary/30 bg-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-4xl">person</span>
            </div>
            <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-surface-container-low ${voiceStatus.isActive ? 'bg-primary' : 'bg-outline-variant'}`} />
          </div>
          <div>
            <p className="font-bold font-[Manrope]">Technical Recruiter</p>
            <p className="text-xs text-on-surface-variant">AI Interviewer</p>
          </div>
          <p className="text-xs text-on-surface-variant italic">
            "I'll be evaluating your fit for the {roleTitle || 'role'} today."
          </p>
        </div>

        <div className="bg-surface-container-low rounded-xl p-4 text-center">
          <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Elapsed</p>
          <p className="text-2xl font-[Manrope] font-bold text-primary tabular-nums">{fmt(elapsed)}</p>
        </div>

        <div className="bg-surface-container-high/40 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-tertiary text-lg">lightbulb</span>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Use the STAR method. The AI is grounded in real {companyName || 'company'} data.
            </p>
          </div>
        </div>
      </div>

      {/* Main voice area */}
      <div className="flex-1 flex flex-col gap-5">
        <div className="flex-1 bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6 flex flex-col items-center justify-between min-h-[400px]">
          {/* Status pill */}
          <div className="px-6 py-2 rounded-full border border-primary/40 bg-surface-container-high/80 backdrop-blur-md">
            <span className="text-sm font-[Manrope] font-bold text-primary">
              {!voiceStatus.isActive
                ? 'Connecting to interviewer...'
                : voiceStatus.isAiSpeaking
                  ? 'Interviewer is speaking...'
                  : 'Your turn — speak your answer'}
            </span>
          </div>

          {/* Waveform bars */}
          <div className="flex items-center justify-center gap-1.5 h-16">
            {[16, 24, 32, 40, 48, 40, 32, 24, 16, 12, 8].map((h, i) => (
              <div key={i} className="w-2 rounded-full bg-primary"
                style={{
                  height: voiceStatus.isAiSpeaking ? `${h}px` : '4px',
                  opacity: voiceStatus.isAiSpeaking ? 1 : 0.2,
                  transition: 'height 0.15s ease',
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* VoiceMentor */}
          <div className="w-full">
            <VoiceMentor
              sessionId={sessionId}
              realtimeSession={realtimeSession}
              autoStart
              onStatusChange={setVoiceStatus}
              onStop={handleEndCall}
              onTurnAdded={handleTurnAdded}
              stopRef={stopVoiceRef}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="bg-surface-container-low p-5 rounded-2xl flex items-center justify-end border border-outline-variant/20">
          <button
            onClick={() => stopVoiceRef.current ? stopVoiceRef.current() : handleEndCall()}
            disabled={ending}
            className="px-8 py-4 bg-error-container text-error rounded-xl font-[Manrope] font-bold flex items-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {ending ? (
              <><span className="animate-spin h-5 w-5 border-2 border-error border-t-transparent rounded-full" />Generating Report...</>
            ) : (
              <><span className="material-symbols-outlined">call_end</span>End Call & See Results</>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
