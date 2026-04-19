import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pollStatus } from '../api';

const steps = [
  { label: 'Company Data', icon: 'check_circle', description: 'Analyzed' },
  { label: 'Analyzing Role', icon: 'frame_inspect', description: 'Mapping Tech Stack' },
  { label: 'AI Persona', icon: 'face', description: 'Crafting Recruiter' },
];

export default function Researching() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, companyName, roleTitle } = location.state || {};
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('queued');

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    // Simulate progress for demo, poll backend in parallel
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return prev + 2;
      });
    }, 200);

    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, 2));
    }, 4000);

    // Actual polling
    const pollTimer = setInterval(async () => {
      try {
        const data = await pollStatus(sessionId);
        setStatus(data.status);
        if (data.ready || data.status === 'completed') {
          clearInterval(pollTimer);
          setProgress(100);
          setCurrentStep(2);
        }
      } catch {
        // Backend may not be running, continue with demo mode
      }
    }, 3000);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
      clearInterval(pollTimer);
    };
  }, [sessionId, navigate]);

  // Navigate to interview when progress completes
  useEffect(() => {
    if (progress >= 100) {
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
              Gathering recent engineering benchmarks and culture signals.
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

          {/* Progress Bar */}
          <div className="w-full max-w-lg mx-auto pt-8">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-[Inter] text-on-surface-variant uppercase tracking-tighter">
                System Initialization
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
