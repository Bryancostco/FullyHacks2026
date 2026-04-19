import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pollStatus, getRealtimeSession } from '../api';

export default function Researching() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, companyName, roleTitle } = location.state || {};

  const [status, setStatus] = useState('queued');
  const [progress, setProgress] = useState(5);
  const [error, setError] = useState(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }

    // Slow nudge so bar never looks frozen (caps at 40 until crawl finishes)
    const nudge = setInterval(() => {
      if (!doneRef.current) setProgress(p => Math.min(p + 1, 40));
    }, 1500);

    // Poll backend every 4s
    const poll = setInterval(async () => {
      if (doneRef.current) return;
      try {
        const data = await pollStatus(sessionId);
        setStatus(data.status);

        if (data.status === 'running') setProgress(p => Math.min(p + 5, 75));

        if (data.ready || data.status === 'completed') {
          doneRef.current = true;
          clearInterval(poll);
          clearInterval(nudge);
          setStatus('completed');

          // Animate bar to 90% then fetch realtime token
          setProgress(90);
          try {
            const realtimeSession = await getRealtimeSession(sessionId);
            setProgress(100);
            setTimeout(() => {
              navigate('/interview', {
                state: { sessionId, companyName, roleTitle, realtimeSession },
              });
            }, 600);
          } catch (e) {
            console.warn('Realtime prefetch failed, navigating anyway:', e);
            setProgress(100);
            setTimeout(() => {
              navigate('/interview', {
                state: { sessionId, companyName, roleTitle, realtimeSession: null },
              });
            }, 600);
          }
        }

        if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(poll);
          clearInterval(nudge);
          setError(`Crawl ${data.status} — try a different URL.`);
        }
      } catch {
        // keep polling on network hiccup
      }
    }, 4000);

    return () => { clearInterval(poll); clearInterval(nudge); };
  }, [sessionId, navigate, companyName, roleTitle]);

  const statusText = {
    queued: 'Starting website crawl...',
    running: 'Scraping and analyzing company pages...',
    completed: 'Research complete — connecting your interviewer...',
  }[status] ?? 'Gathering company data...';

  return (
    <main className="flex-grow flex flex-col items-center justify-center relative px-6 min-h-screen">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -left-1/4 w-[80vw] h-[80vw] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[60vw] h-[60vw] bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 flex flex-col items-center max-w-xl w-full text-center gap-10">
        {/* Orb */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-container rounded-full animate-pulse z-20 flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-container text-3xl">hub</span>
          </div>
          <div className="absolute w-full h-full border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
          <div className="absolute w-4/5 h-4/5 border border-secondary/10 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
        </div>

        <div className="space-y-3">
          <h2 className="font-[Manrope] text-3xl font-bold text-on-surface">
            Researching <span className="text-primary italic">{companyName || 'Company'}</span>
          </h2>
          <p className="text-on-surface-variant font-[Inter]">{statusText}</p>
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-error">
              <span className="material-symbols-outlined">error</span>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-primary text-on-primary rounded-full text-sm font-bold"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex justify-between text-xs text-on-surface-variant mb-2">
              <span className="uppercase tracking-widest">{status === 'completed' ? 'Complete' : 'Crawling'}</span>
              <span className="font-bold text-primary text-lg">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary-fixed-dim rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
