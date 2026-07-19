import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setOnUnauthorized, type Me } from '@renderer/api/client';

interface AuthState {
  me: Me | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore a session on launch: if a token is in the keychain, load the profile.
  useEffect(() => {
    void (async () => {
      const token = await window.shulepay.auth.getToken();
      if (token) {
        try {
          setMe(await api.me());
        } catch {
          await window.shulepay.auth.clear();
        }
      }
      setLoading(false);
    })();
  }, []);

  // On a 401 (e.g. the token expired), drop the session - the app returns to login.
  useEffect(() => {
    setOnUnauthorized(() => {
      void window.shulepay.auth.clear();
      setMe(null);
    });
    return () => setOnUnauthorized(null);
  }, []);

  const login = async (phone: string, password: string): Promise<void> => {
    const res = await api.login(phone, password);
    await window.shulepay.auth.setToken(res.accessToken);
    setMe(await api.me());
  };

  const logout = async (): Promise<void> => {
    await window.shulepay.auth.clear();
    setMe(null);
  };

  return <AuthContext.Provider value={{ me, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
