import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { authService } from './authService';

interface AuthContextState {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  setGuestMode: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextState>({
  user: null,
  loading: true,
  isGuest: false,
  setGuestMode: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check local storage for guest state on mount
    const guestState = localStorage.getItem('kinesight_is_guest');
    if (guestState === 'true') {
      setIsGuest(true);
    }

    let unsubscribe: (() => void) | undefined;

    // Process potential redirect result from Google SignIn before listening to auth state
    authService.handleRedirectResult().catch(console.error).finally(() => {
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          setIsGuest(false);
          localStorage.removeItem('kinesight_is_guest');
        }
        setLoading(false);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const setGuestMode = (val: boolean) => {
    setIsGuest(val);
    if (val) {
      localStorage.setItem('kinesight_is_guest', 'true');
    } else {
      localStorage.removeItem('kinesight_is_guest');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, setGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
};
