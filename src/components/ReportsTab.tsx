import { useState, useEffect } from "react";
import { storageService, WorkoutRecord, UserProfile } from "../storage/storageService";
import { useAuth } from "../firebase/AuthContext";

interface ReportsTabProps {
  onClose: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function ReportsTab({ onClose, theme, onToggleTheme }: ReportsTabProps) {
  const { isGuest } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<WorkoutRecord[]>([]);

  useEffect(() => {
    storageService.getUserProfile().then(setProfile);
    storageService.getCloudWorkoutHistory().then(hist => {
      setHistory(hist.sort((a, b) => b.date - a.date));
    });
  }, []);

  const totalReps = profile ? profile.totalCorrectReps + profile.totalIncorrectReps : 0;
  const overallAccuracy = totalReps > 0 ? Math.round((profile!.totalCorrectReps / totalReps) * 100) : 0;

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen pb-24">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm dark:shadow-none h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-on-surface dark:text-white hover:text-primary transition-colors flex items-center">
            <span className="material-symbols-outlined text-2xl" data-icon="arrow_back">arrow_back</span>
          </button>
          <span className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase">
            Performance Reports
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!isGuest && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-secondary uppercase bg-surface-container py-1 px-2 rounded-lg">
              <span className="material-symbols-outlined text-sm text-green-500">cloud_done</span>
              Synced
            </div>
          )}
          <button onClick={onToggleTheme} className="text-primary hover:text-primary-hover transition-colors" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            <span className="material-symbols-outlined text-2xl" data-icon={theme === 'dark' ? 'light_mode' : 'dark_mode'}>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      <main className="pt-24 px-4 md:px-8 max-w-5xl mx-auto space-y-10">
        
        {/* High Level Stats */}
        <section>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">All-Time Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/20">
              <div className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Total Workouts</div>
              <div className="text-4xl font-black italic text-primary">{profile?.totalWorkouts || 0}</div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/20">
              <div className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Total Reps</div>
              <div className="text-4xl font-black italic">{totalReps}</div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/20">
              <div className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Overall Accuracy</div>
              <div className="text-4xl font-black italic">{overallAccuracy}%</div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/20 bg-gradient-to-tr from-surface-container-lowest to-primary/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Best Perfect Streak</div>
              <div className="text-4xl font-black italic text-[#FC5200] flex items-center gap-2">
                {profile?.bestPerfectRepStreak || 0}
                <span className="material-symbols-outlined text-2xl" data-icon="local_fire_department">local_fire_department</span>
              </div>
            </div>
          </div>
        </section>

        {/* History Log */}
        <section>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Session Log</h2>
          {history.length === 0 ? (
            <div className="bg-surface-container-low p-10 rounded-xl text-center text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50" data-icon="history">history</span>
              <p className="font-medium">No workouts recorded yet. Get moving!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map(record => {
                const dateObj = new Date(record.date);
                const isPlank = record.exerciseId === 'plank';
                const recTotal = record.correctReps + record.incorrectReps;
                const recAcc = recTotal > 0 ? Math.round((record.correctReps / recTotal) * 100) : 0;
                
                return (
                  <div key={record.id} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/20 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-primary/30">
                    <div>
                      <h4 className="text-lg font-black uppercase tracking-tight">{record.exerciseName}</h4>
                      <div className="text-xs font-medium text-secondary mt-1">
                        {dateObj.toLocaleDateString()} at {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {Math.floor(record.durationSec / 60)}m {Math.floor(record.durationSec % 60)}s
                      </div>
                    </div>
                    
                    <div className="flex gap-6 items-center">
                      {isPlank ? (
                        <div className="text-right">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-secondary">Hold Time</div>
                          <div className="text-xl font-black italic">{record.plankHoldTime}s</div>
                        </div>
                      ) : (
                        <>
                          <div className="text-right">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-secondary">Reps</div>
                            <div className="text-xl font-black italic">{recTotal}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-secondary">Accuracy</div>
                            <div className={`text-xl font-black italic ${recAcc > 80 ? 'text-green-500' : 'text-orange-500'}`}>{recAcc}%</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
