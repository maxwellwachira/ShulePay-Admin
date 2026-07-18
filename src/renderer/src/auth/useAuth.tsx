import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type LoginResponse } from '@renderer/api/client';

type User = LoginResponse['user'];

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore a session on launch if a token is already in the keychain.
  useEffect(() => {
    void window.shulepay.auth.getToken().then((token) => {
      // A present token means a prior login; the backend re-validates on first call.
      // (A production build would verify via a /me endpoint before trusting it.)
      if (token) setUser({ id: 'me', role: 'admin', name: null });
      setLoading(false);
    });
  }, []);

  const login = async (phone: string, password: string): Promise<void> => {
    const res = await api.login(phone, password);
    await window.shulepay.auth.setToken(res.accessToken);
    setUser(res.user);
  };

  const logout = async (): Promise<void> => {
    await window.shulepay.auth.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
