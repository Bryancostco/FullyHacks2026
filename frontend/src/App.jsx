import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Onboarding from './pages/Onboarding';
import Researching from './pages/Researching';
import Interview from './pages/Interview';
import Feedback from './pages/Feedback';
import Insights from './pages/Insights';
import History from './pages/History';
import Profile from './pages/Profile';

export default function App() {
  const location = useLocation();
  const isInterview = location.pathname === '/interview';
  const isResearching = location.pathname === '/researching';

  return (
    <div className="min-h-screen bg-surface text-on-surface font-[Inter]">
      <Header live={isInterview} />
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/researching" element={<Researching />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      {!isResearching && <BottomNav />}
    </div>
  );
}
