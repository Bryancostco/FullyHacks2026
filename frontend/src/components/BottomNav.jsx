import { Link, useLocation } from 'react-router-dom';

const items = [
  { label: 'Practice', icon: 'play_circle', path: '/' },
  { label: 'History', icon: 'history', path: '/history' },
  { label: 'Insights', icon: 'analytics', path: '/insights' },
  { label: 'Profile', icon: 'person', path: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-surface-container-low/80 backdrop-blur-xl shadow-[0_-4px_40px_rgba(0,0,0,0.4)] border-t border-outline-variant/20">
      {items.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center transition-all ${
              active
                ? 'text-primary scale-110'
                : 'text-on-surface-variant opacity-70 hover:opacity-100'
            }`}
          >
            <span
              className={`material-symbols-outlined mb-1 ${active ? 'fill' : ''}`}
            >
              {item.icon}
            </span>
            <span className="font-[Inter] text-[11px] font-medium uppercase tracking-wider">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
