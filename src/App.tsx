import { useState, useEffect } from "react";
import { FitnessTab } from "./components/FitnessTab";
import { ReportsTab } from "./components/ReportsTab";

function getInitialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('kinesight_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  // Default to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function App() {
  const [route, setRoute] = useState<'fitness' | 'reports'>('fitness');
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

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

  return (
    <div className="w-full min-h-screen bg-surface dark:bg-[#0F172A] text-on-surface dark:text-slate-100 transition-colors duration-300">
      {route === 'fitness' && <FitnessTab onOpenReports={() => setRoute('reports')} theme={theme} onToggleTheme={toggleTheme} />}
      {route === 'reports' && <ReportsTab onClose={() => setRoute('fitness')} theme={theme} onToggleTheme={toggleTheme} />}
    </div>
  );
}
