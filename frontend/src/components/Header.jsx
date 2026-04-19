import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Practice', path: '/' },
  { label: 'History', path: '/history' },
  { label: 'Insights', path: '/insights' },
  { label: 'Profile', path: '/profile' },
];

export default function Header({ live }) {
  const location = useLocation();

  return (
    <header className="w-full top-0 sticky z-50 bg-surface-container-low">
      <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="PrepPilot" className="h-24 w-24 object-contain" />
          <span className="font-[Manrope] font-bold tracking-tighter text-xl text-primary">PrepPilot</span>
        </Link>

        <nav className="hidden md:flex gap-8 items-center">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`font-[Inter] text-[11px] font-medium uppercase tracking-wider transition-colors ${
                location.pathname === item.path
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {live && (
          <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
