import { useState, useEffect } from "react";
import { FitnessTab } from "./components/FitnessTab";
import { ReportsTab } from "./components/ReportsTab";
import { LoginScreen } from "./components/LoginScreen";
import { LandingPage } from "./components/LandingPage";
import { useAuth } from "./firebase/AuthContext";

function getInitialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('kinesight_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  // Default to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function App() {
  const [route, setRoute] = useState<'landing' | 'login' | 'fitness' | 'reports'>('landing');
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  const { user, loading, isGuest } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('kinesight_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // If already authenticated, skip login (but not landing — landing should always show first)
  useEffect(() => {
    if (!loading && (user || isGuest)) {
      if (route === 'login') {
        setRoute('fitness');
      }
    }
  }, [user, isGuest, loading, route]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-surface dark:bg-[#0F172A] flex items-center justify-center text-primary">
        <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
      </div>
    );
  }

  // Show landing page
  if (route === 'landing') {
    return <LandingPage onGetStarted={() => setRoute('login')} />;
  }

  // Show login page (accessed from landing page "Get Started" button)
  if (route === 'login' && !user && !isGuest) {
    return <LoginScreen />;
  }

  // If not authenticated at all, show login
  if (!user && !isGuest) {
    return <LoginScreen />;
  }

  return (
    <div className="w-full min-h-screen bg-surface dark:bg-[#0F172A] text-on-surface dark:text-slate-100 transition-colors duration-300">
      {route === 'fitness' && <FitnessTab onOpenReports={() => setRoute('reports')} theme={theme} onToggleTheme={toggleTheme} />}
      {route === 'reports' && <ReportsTab onClose={() => setRoute('fitness')} theme={theme} onToggleTheme={toggleTheme} />}
    </div>
  );
}
