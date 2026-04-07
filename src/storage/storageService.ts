import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, writeBatch } from "firebase/firestore";

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
  age?: number;
  weight?: number;
  gender?: string;
  email?: string;
}

const HISTORY_KEY = 'kinesight_workout_history';
const PROFILE_KEY = 'kinesight_profile';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function pruneLocalStorageHistory(history: WorkoutRecord[]) {
  const now = Date.now();
  const isGuest = localStorage.getItem('kinesight_is_guest') === 'true';
  const isLoggedIn = !!auth.currentUser;
  
  if (isGuest || !isLoggedIn) {
     return history;
  }
  
  return history.filter(record => (now - record.date) <= THREE_DAYS_MS);
}

export const storageService = {
  getWorkoutHistory: (): WorkoutRecord[] => {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      const parsed = data ? JSON.parse(data) : [];
      return pruneLocalStorageHistory(parsed);
    } catch {
      return [];
    }
  },

  getCloudWorkoutHistory: async (): Promise<WorkoutRecord[]> => {
    const user = auth.currentUser;
    if (!user) return storageService.getWorkoutHistory();
    
    try {
      const q = query(collection(db, `users/${user.uid}/workouts`), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      const records: WorkoutRecord[] = [];
      snapshot.forEach(doc => records.push(doc.data() as WorkoutRecord));
      return records;
    } catch (err) {
      console.warn("Failed to fetch cloud history", err);
      return storageService.getWorkoutHistory();
    }
  },

  saveWorkoutRecord: async (record: Omit<WorkoutRecord, 'id'>) => {
    try {
      const history = storageService.getWorkoutHistory();
      const newRecord: WorkoutRecord = {
        ...record,
        id: crypto.randomUUID()
      };
      
      // Save locally
      history.push(newRecord);
      const prunedHistory = pruneLocalStorageHistory(history);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(prunedHistory));

      // Update local profile stats
      const profile = await storageService.getUserProfile();
      profile.totalWorkouts += 1;
      profile.totalCorrectReps += record.correctReps;
      profile.totalIncorrectReps += record.incorrectReps;
      await storageService.saveUserProfile(profile);

      // Cloud Sync
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, `users/${user.uid}/workouts`, newRecord.id), newRecord);
      }
    } catch (err) {
      console.warn("Failed to save workout record", err);
    }
  },

  getUserProfile: async (): Promise<UserProfile> => {
    const user = auth.currentUser;
    let localProfile: UserProfile = {
      totalWorkouts: 0,
      totalCorrectReps: 0,
      totalIncorrectReps: 0,
      bestPerfectRepStreak: 0,
    };

    try {
      const data = localStorage.getItem(PROFILE_KEY);
      if (data) localProfile = JSON.parse(data);
    } catch { /* Ignore */ }

    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const cloudProfile = userDoc.data().profile as UserProfile;
          // Sync cloud to local
          localStorage.setItem(PROFILE_KEY, JSON.stringify(cloudProfile));
          return cloudProfile;
        }
      } catch (err) {
        console.warn("Failed to fetch cloud profile", err);
      }
    }

    return localProfile;
  },

  saveUserProfile: async (profile: UserProfile) => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, "users", user.uid), { profile }, { merge: true });
      }
    } catch (err) {
      console.warn("Failed to save profile", err);
    }
  },

  updateBestStreak: async (streak: number) => {
    const profile = await storageService.getUserProfile();
    if (streak > profile.bestPerfectRepStreak) {
      profile.bestPerfectRepStreak = streak;
      await storageService.saveUserProfile(profile);
    }
  },

  clearAllData: () => {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(PROFILE_KEY);
  },

  syncLocalToCloud: async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const localHistory = storageService.getWorkoutHistory();
        const localProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");

        if (localHistory.length > 0) {
            const batch = writeBatch(db);
            localHistory.forEach(record => {
                const docRef = doc(db, `users/${user.uid}/workouts`, record.id);
                batch.set(docRef, record);
            });
            await batch.commit();
        }

        if (localProfile) {
            await setDoc(doc(db, "users", user.uid), { profile: localProfile }, { merge: true });
        }
        
        // After syncing, prune local storage to 3 days
        const pruned = pruneLocalStorageHistory(localHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(pruned));

    } catch (err) {
        console.warn("Failed to sync local data to cloud", err);
    }
  }
};
