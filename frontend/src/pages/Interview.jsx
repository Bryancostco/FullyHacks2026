import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VoiceMentor from '../components/VoiceMentor';
import { gradeInterview } from '../api';

export default function Interview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, companyName, roleTitle } = location.state || {};

  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState({ isActive: false, isAiSpeaking: false });
  const [elapsed, setElapsed] = useState(0);
  const [grading, setGrading] = useState(false);
  const timerRef = useRef(null);
  const conversationRef = useRef([]);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
  }, [sessionId, navigate]);

  const handleStart = () => {
    setStarted(true);
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
  };

  const handleTranscriptUpdate = (conversation) => {
    conversationRef.current = conversation;
  };

  const handleEndCall = async (conversation) => {
    clearInterval(timerRef.current);
    // Use conversation from stopSession callback, or fall back to ref
    const convo = conversation || conversationRef.current;

    if (convo && convo.length > 0) {
      setGrading(true);
      try {
        const results = await gradeInterview(sessionId, convo, roleTitle, companyName);
        navigate('/feedback', {
          state: {
            sessionId,
            companyName,
            roleTitle,
            gradeResults: results,
            conversation: convo,
          },
        });
      } catch (err) {
        console.error('Grading failed:', err);
        // Navigate anyway with the raw conversation
        navigate('/feedback', {
          state: { sessionId, companyName, roleTitle, conversation: convo },
        });
      }
    } else {
      navigate('/feedback', {
        state: { sessionId, companyName, roleTitle },
      });
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const waveHeights = [16, 24, 32, 40, 48, 40, 32, 24, 16, 12, 8];
  const waveDelays = ['1.2s', '1.5s', '1.1s', '1.4s', '1.3s', '1.4s', '1.1s', '1.5s', '1.2s', '1.5s', '1.1s'];

  // Grading screen
  if (grading) {
    return (
      <main className="min-h-[calc(100vh-144px)] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <span className="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></span>
          </div>
          <h2 className="text-2xl font-[Manrope] font-extrabold text-on-surface">
            Analyzing your interview...
          </h2>
          <p className="text-on-surface-variant font-[Inter]">
            Our AI is reviewing your conversation and generating personalized feedback.
          </p>
        </div>
      </main>
    );
  }

  // Pre-start screen
  if (!started) {
    return (
      <main className="min-h-[calc(100vh-144px)] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
            <span className="material-symbols-outlined text-primary text-6xl">mic</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-[Manrope] font-extrabold text-on-surface">
              Ready to interview with{' '}
              <span className="text-primary capitalize">{companyName || 'Company'}</span>?
            </h1>
            <p className="text-on-surface-variant font-[Inter]">
              You'll speak with an AI interviewer who has researched {companyName || 'the company'}.
              Make sure your microphone is ready.
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-on-surface-variant uppercase tracking-widest">Role</p>
            <p className="text-lg font-[Manrope] font-bold text-primary">{roleTitle || 'Software Engineer'}</p>
          </div>
          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-[Manrope] font-bold text-lg rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined">call</span>
            Start Interview
          </button>
          <p className="text-[11px] text-on-surface-variant/60">
            Your browser will ask for microphone access when you click start.
          </p>
        </div>
      </main>
    );
  }

  return (
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

        <div className="bg-surface-container-low rounded-xl p-6 ghost-border">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 p-1 bg-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-5xl">person</span>
              </div>
              <div className={`absolute bottom-1 right-1 w-5 h-5 border-4 border-surface-container-low rounded-full ${voiceStatus.isActive ? 'bg-primary' : 'bg-outline-variant'}`}></div>
            </div>
            <h2 className="text-lg font-[Manrope] font-bold text-on-surface">Technical Recruiter</h2>
            <p className="text-sm text-on-surface-variant mb-4">AI Interviewer Persona</p>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl p-4 ghost-border text-center">
          <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Elapsed</p>
          <p className="text-2xl font-[Manrope] font-bold text-primary tabular-nums">
            {formatTime(elapsed)}
          </p>
        </div>

        {/* Conversation count */}
        <div className="bg-surface-container-low rounded-xl p-4 ghost-border text-center">
          <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">Turns</p>
          <p className="text-2xl font-[Manrope] font-bold text-primary tabular-nums">
            {conversationRef.current.length}
          </p>
        </div>
      </div>

      {/* Right Column */}
      <div className="flex-1 flex flex-col gap-6 min-h-[500px]">
        <div className="flex-1 bg-surface-container-low rounded-2xl relative overflow-hidden flex flex-col items-center justify-between border border-outline-variant/10 p-6">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_#69f6b8,_transparent,_transparent)]"></div>

          <div className="relative z-10 flex justify-center">
            <div className="glass-hud px-6 py-2 rounded-full border border-primary/40 bg-surface-container-high/80 backdrop-blur-md shadow-lg">
              <span className="text-sm font-[Manrope] font-bold text-primary tracking-wide">
                {!voiceStatus.isActive
                  ? 'Connecting to interviewer...'
                  : voiceStatus.isAiSpeaking
                    ? 'Interviewer is speaking...'
                    : 'Your turn — speak your answer'}
              </span>
            </div>
          </div>

          <div className="relative w-full h-32 flex items-center justify-center gap-2 px-12 z-0">
            {waveHeights.map((h, i) => (
              <div
                key={i}
                className="waveform-bar w-2"
                style={{
                  height: `${!voiceStatus.isAiSpeaking ? 4 : h}px`,
                  opacity: !voiceStatus.isAiSpeaking ? 0.2 : i >= 9 ? 0.3 + (9 - i) * 0.2 : 1,
                  animation: !voiceStatus.isAiSpeaking ? 'none' : `wave ${waveDelays[i]} ease-in-out infinite`,
                }}
              ></div>
            ))}
          </div>

          <div className="relative z-10 w-full">
            <VoiceMentor
              sessionId={sessionId}
              autoStart
              onStatusChange={setVoiceStatus}
              onStop={handleEndCall}
              onTranscriptUpdate={handleTranscriptUpdate}
            />
          </div>
        </div>

        <div className="glass-hud p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-outline-variant/20">
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
          </div>

          <div className="h-12 w-[1px] bg-outline-variant/20 hidden md:block"></div>

          <button
            onClick={() => handleEndCall(conversationRef.current)}
            className="flex-1 md:flex-none px-8 py-4 bg-error-container text-error rounded-xl font-[Manrope] font-bold flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">call_end</span>
            End Call & See Results
          </button>
        </div>
      </div>
    </main>
  );
}
