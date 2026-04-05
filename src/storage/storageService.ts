export interface WorkoutRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  date: number; // timestamp
  durationSec: number;
  correctReps: number;
  incorrectReps: number;
  plankHoldTime?: number;
}

export interface UserProfile {
  totalWorkouts: number;
  totalCorrectReps: number;
  totalIncorrectReps: number;
  bestPerfectRepStreak: number;
}

const HISTORY_KEY = 'kinesight_workout_history';
const PROFILE_KEY = 'kinesight_profile';

export const storageService = {
  getWorkoutHistory: (): WorkoutRecord[] => {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveWorkoutRecord: (record: Omit<WorkoutRecord, 'id'>) => {
    try {
      const history = storageService.getWorkoutHistory();
      const newRecord: WorkoutRecord = {
        ...record,
        id: crypto.randomUUID()
      };
      
      // Save record
      history.push(newRecord);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

      // Update profile stats
      const profile = storageService.getUserProfile();
      profile.totalWorkouts += 1;
      profile.totalCorrectReps += record.correctReps;
      profile.totalIncorrectReps += record.incorrectReps;
      storageService.saveUserProfile(profile);

    } catch (err) {
      console.warn("Failed to save workout record", err);
    }
  },

  getUserProfile: (): UserProfile => {
    try {
      const data = localStorage.getItem(PROFILE_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // Ignore
    }
    return {
      totalWorkouts: 0,
      totalCorrectReps: 0,
      totalIncorrectReps: 0,
      bestPerfectRepStreak: 0,
    };
  },

  saveUserProfile: (profile: UserProfile) => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (err) {
      console.warn("Failed to save profile", err);
    }
  },

  updateBestStreak: (streak: number) => {
    const profile = storageService.getUserProfile();
    if (streak > profile.bestPerfectRepStreak) {
      profile.bestPerfectRepStreak = streak;
      storageService.saveUserProfile(profile);
    }
  },

  clearAllData: () => {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(PROFILE_KEY);
  }
};
