import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pollStatus } from '../api';

const steps = [
  { label: 'Crawling Site', icon: 'language', description: 'Scraping pages' },
  { label: 'Analyzing Content', icon: 'frame_inspect', description: 'Chunking & embedding' },
  { label: 'Ready', icon: 'check_circle', description: 'Interview prepared' },
];

export default function Researching() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, companyName, roleTitle } = location.state || {};
  const [progress, setProgress] = useState(5);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('queued');
  const [error, setError] = useState(null);
  const crawlDone = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    // Poll the actual backend status — this drives everything
    const pollTimer = setInterval(async () => {
      try {
        const data = await pollStatus(sessionId);
        setStatus(data.status);

        if (data.status === 'running') {
          setCurrentStep(1);
          // Slowly increment progress while running, but cap at 85
          setProgress((prev) => Math.min(prev + 3, 85));
        }

        if (data.ready || data.status === 'completed') {
          crawlDone.current = true;
          setCurrentStep(2);
          setProgress(100);
          clearInterval(pollTimer);
        }

        if (data.status === 'failed' || data.status === 'cancelled') {
          setError(`Crawl ${data.status}. Try a different URL.`);
          clearInterval(pollTimer);
        }
      } catch {
        // Backend not reachable — keep polling
      }
    }, 3000);

    // Small progress bump so it doesn't look frozen while queued
    const nudgeTimer = setInterval(() => {
      if (!crawlDone.current) {
        setProgress((prev) => Math.min(prev + 1, 20));
      }
    }, 2000);

    return () => {
      clearInterval(pollTimer);
      clearInterval(nudgeTimer);
    };
  }, [sessionId, navigate]);

  // Only navigate to interview when crawl is actually done
  useEffect(() => {
    if (progress >= 100 && crawlDone.current) {
      const timeout = setTimeout(() => {
        navigate('/interview', {
          state: { sessionId, companyName, roleTitle },
        });
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [progress, navigate, sessionId, companyName, roleTitle]);

  return (
    <main className="flex-grow flex flex-col items-center justify-center relative px-6 min-h-screen">
      {/* Background ambient */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -left-1/4 w-[80vw] h-[80vw] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-1/2 -right-1/4 w-[60vw] h-[60vw] bg-secondary/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="z-10 flex flex-col items-center max-w-2xl w-full text-center">
        {/* Animated Orb */}
        <div className="relative w-48 h-48 mb-16 flex items-center justify-center">
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary-container rounded-full animate-pulse-emerald z-20 flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-container text-4xl">hub</span>
          </div>
          <div className="absolute w-full h-full border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
          <div className="absolute w-4/5 h-4/5 border border-secondary/10 rounded-full animate-[spin_6s_linear_infinite_reverse]"></div>
          <div className="absolute w-32 h-32 overflow-hidden rounded-full border border-primary/40 backdrop-blur-sm">
            <div className="scanner-line"></div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-6 w-full">
          <div className="space-y-2">
            <h2 className="font-[Manrope] text-3xl font-bold tracking-tight text-on-surface">
              Researching <span className="text-primary italic">{companyName || 'Company'}</span>...
            </h2>
            <p className="font-[Inter] text-on-surface-variant text-lg max-w-md mx-auto">
              {status === 'queued' && 'Starting website crawl...'}
              {status === 'running' && 'Scraping and analyzing company pages...'}
              {status === 'completed' && 'Research complete — preparing your interview!'}
              {(status === 'failed' || status === 'cancelled') && error}
              {!['queued', 'running', 'completed', 'failed', 'cancelled'].includes(status) &&
                'Gathering recent engineering benchmarks and culture signals.'}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-12">
            {steps.map((step, i) => {
              const completed = i < currentStep;
              const active = i === currentStep;
              return (
                <div
                  key={step.label}
                  className={`p-5 rounded-xl flex items-start gap-4 text-left transition-all ${
                    completed
                      ? 'bg-surface-container-low border-l-2 border-primary'
                      : active
                        ? 'bg-surface-container-high border-l-2 border-primary/40 relative overflow-hidden'
                        : 'bg-surface-container-low border-l-2 border-outline-variant/20 opacity-50'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      completed
                        ? 'text-primary fill'
                        : active
                          ? 'text-primary animate-pulse'
                          : 'text-on-surface-variant'
                    }`}
                  >
                    {completed ? 'check_circle' : step.icon}
                  </span>
                  <div className="relative z-10">
                    <p
                      className={`text-xs font-[Inter] uppercase tracking-widest mb-1 ${
                        active ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-sm font-medium text-on-surface">
                      {completed
                        ? `${step.description} ${companyName || ''}`
                        : step.description}
                    </p>
                  </div>
                  {active && (
                    <div className="absolute inset-0 bg-primary/5 opacity-50"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Error with retry */}
          {error && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="material-symbols-outlined text-error">error</span>
              <p className="text-sm text-error">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold hover:opacity-90 transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Progress Bar */}
          <div className="w-full max-w-lg mx-auto pt-8">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-[Inter] text-on-surface-variant uppercase tracking-tighter">
                {status === 'completed' ? 'Complete' : 'Crawling Website'}
              </span>
              <span className="text-2xl font-[Manrope] font-extrabold text-primary">
                {Math.min(progress, 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary-fixed-dim rounded-full shadow-[0_0_10px_rgba(105,246,184,0.5)] transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
