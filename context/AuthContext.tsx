import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { api } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  googleAccessToken: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  googleAccessToken: null,
  loading: true,
  signOut: async () => {},
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  resetPassword: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = api.auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    setGoogleAccessToken(null);
    await api.auth.signOut();
  };

  const signInWithGoogle = async () => {
    const result = await api.auth.signInWithGoogle();
    if (result.accessToken) {
      setGoogleAccessToken(result.accessToken);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await api.auth.signIn(email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    await api.auth.signUp(email, pass, name);
  };

  const resetPassword = async (email: string) => {
    await api.auth.resetPassword(email);
  };

  return (
    <AuthContext.Provider value={{ user, googleAccessToken, loading, signOut, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};