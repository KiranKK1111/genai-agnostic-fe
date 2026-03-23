import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loginUser, registerUser, TokenResponse } from '../api';

interface AuthContextType {
  /** Whether the user is currently authenticated. */
  isAuthenticated: boolean;
  /** The JWT token returned by the backend. */
  token: string | null;
  /** Login a user using their credentials. Returns true on success. */
  login: (username: string, password: string) => Promise<boolean>;
  /** Register a new user. Returns true on success. */
  register: (username: string, password: string) => Promise<boolean>;
  /** Log the user out and clear any stored credentials. */
  logout: () => void;
  /** The username of the logged in user. */
  username: string;
  /** Any error message from auth operations. */
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // On mount, restore any saved credentials from localStorage. This allows
  // the user to remain logged in across page reloads.
  useEffect(() => {
    const savedToken = localStorage.getItem('sdm_token');
    const savedUser = localStorage.getItem('sdm_username');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUsername(savedUser);
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setError(null);
      const res: TokenResponse = await loginUser(username, password);
      setIsAuthenticated(true);
      setUsername(username);
      setToken(res.access_token);
      // Persist token and username so that the user stays logged in on refresh
      localStorage.setItem('sdm_token', res.access_token);
      localStorage.setItem('sdm_username', username);
      return true;
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Login failed';
      setError(errorMsg);
      return false;
    }
  };

  const register = async (username: string, password: string) => {
    try {
      setError(null);
      await registerUser(username, password);
      // Auto-login after successful registration
      return login(username, password);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Registration failed';
      setError(errorMsg);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setToken(null);
    setError(null);
    localStorage.removeItem('sdm_token');
    localStorage.removeItem('sdm_username');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        login,
        register,
        logout,
        username,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

