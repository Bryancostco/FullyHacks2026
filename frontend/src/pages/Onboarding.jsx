import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setupSession, uploadResume } from '../api';

export default function Onboarding() {
  const navigate = useNavigate();
  const [companyUrl, setCompanyUrl] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyUrl || !roleTitle) return;
    setLoading(true);
    try {
      const companyName = new URL(
        companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`
      ).hostname.replace('www.', '').split('.')[0];

      const data = await setupSession(companyUrl, companyName, roleTitle);
      const sessionId = data.session_id;

      if (file && sessionId) {
        await uploadResume(sessionId, file).catch(() => {});
      }

      navigate('/researching', {
        state: { sessionId, companyName, roleTitle },
      });
    } catch (err) {
      console.error('Setup failed:', err);
      // For demo: navigate anyway with a fake session
      const companyName = companyUrl.replace(/https?:\/\//, '').replace('www.', '').split('.')[0];
      navigate('/researching', {
        state: { sessionId: 'demo_session', companyName, roleTitle },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen pt-12 pb-32 px-6 overflow-x-hidden">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left: Hero */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <h1 className="font-[Manrope] font-extrabold text-5xl md:text-6xl text-on-surface tracking-tight leading-tight">
              Ready for your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                next big role?
              </span>
            </h1>
            <p className="font-[Inter] text-xl text-on-surface-variant max-w-xl leading-relaxed">
              Setup your AI-powered phone screen in seconds. Our Cinematic Mentor
              analyzes your background to simulate high-stakes interviews.
            </p>
          </div>

          <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl group">
            <div className="w-full h-full bg-gradient-to-br from-surface-container-high to-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-primary/30 text-[120px]">
                desktop_windows
              </span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
            <div className="absolute bottom-6 left-6 flex items-center gap-3 glass-panel px-4 py-2 rounded-lg border border-outline-variant/20">
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(105,246,184,0.8)] animate-pulse"></span>
              <span className="text-xs font-[Inter] uppercase tracking-widest text-primary">
                System Ready
              </span>
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="lg:col-span-5">
          <div className="bg-surface-container-low p-8 md:p-10 rounded-xl border border-outline-variant/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[80px] -mr-16 -mt-16 rounded-full"></div>
            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-on-surface-variant">
                    Company URL
                  </label>
                  <input
                    type="text"
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    className="w-full bg-surface-container-highest border-0 border-b-2 border-outline-variant/30 rounded-sm px-0 py-3 text-on-surface focus:ring-0 focus:border-primary focus:bg-surface-bright transition-all placeholder:text-outline/50 outline-none"
                    placeholder="e.g., google.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-on-surface-variant">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full bg-surface-container-highest border-0 border-b-2 border-outline-variant/30 rounded-sm px-0 py-3 text-on-surface focus:ring-0 focus:border-primary focus:bg-surface-bright transition-all placeholder:text-outline/50 outline-none"
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-on-surface-variant">
                    Upload Resume
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="mt-2 border-2 border-dashed border-outline-variant/30 rounded-lg p-8 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                  >
                    <span className="material-symbols-outlined text-4xl text-outline mb-3 group-hover:text-primary">
                      cloud_upload
                    </span>
                    <p className="text-sm text-on-surface-variant text-center">
                      {file ? (
                        <span className="text-primary">{file.name}</span>
                      ) : (
                        <>
                          Drop your PDF or Docx here
                          <br />
                          <span className="text-xs opacity-60">Max size: 5MB</span>
                        </>
                      )}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files[0])}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !companyUrl || !roleTitle}
                className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-[Manrope] font-bold py-4 rounded-md hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Starting...' : 'Start Research'}
              </button>

              <p className="text-center text-[10px] text-on-surface-variant/60 font-[Inter] tracking-tight">
                By clicking start, you agree to our Terms of AI Simulation.
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
