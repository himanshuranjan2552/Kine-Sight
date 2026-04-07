import { auth, db } from "./firebaseConfig";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithRedirect, 
  getRedirectResult,
  GoogleAuthProvider, 
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserProfile } from "../storage/storageService";

export interface ExtendedUserProfile extends UserProfile {
  age?: number;
  weight?: number;
  gender?: string;
  email?: string;
}

const defaultProfile: UserProfile = {
  totalWorkouts: 0,
  totalCorrectReps: 0,
  totalIncorrectReps: 0,
  bestPerfectRepStreak: 0
};

export const authService = {
  signUpWithEmail: async (email: string, password: string, additionalData: { age?: number; weight?: number; gender?: string }) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const profile: ExtendedUserProfile = {
      ...defaultProfile,
      ...additionalData,
      email: user.email || undefined
    };
    
    await setDoc(doc(db, "users", user.uid), { profile });
    return user;
  },

  loginWithEmail: async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  signInWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  },

  handleRedirectResult: async () => {
    try {
      const userCredential = await getRedirectResult(auth);
      if (userCredential && userCredential.user) {
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          const profile: ExtendedUserProfile = {
            ...defaultProfile,
            email: user.email || undefined
          };
          await setDoc(doc(db, "users", user.uid), { profile });
        }
        return user;
      }
    } catch (err: any) {
      console.error("Redirect sign in error", err);
      throw err;
    }
    return null;
  },

  signOut: () => signOut(auth),
  
  getUserProfile: async (uid: string): Promise<ExtendedUserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return userDoc.data().profile as ExtendedUserProfile;
      }
    } catch {
      console.warn("Failed to fetch cloud profile");
    }
    return null;
  }
};
