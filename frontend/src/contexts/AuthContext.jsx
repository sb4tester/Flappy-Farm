import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, onIdTokenChanged } from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      try {
        if (user) {
          const token = await user.getIdToken(true);
          try { localStorage.setItem('token', token); } catch {}
        } else {
          try { localStorage.removeItem('token'); } catch {}
        }
      } finally {
        setLoading(false);
      }
    });

    const unsubToken = onIdTokenChanged(auth, async (user) => {
      if (!user) return;
      try {
        const token = await user.getIdToken(true);
        try { localStorage.setItem('token', token); } catch {}
      } catch {}
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }, []);

  const value = {
    currentUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 
