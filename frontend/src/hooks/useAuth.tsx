import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import api from '../services/api';

// Define the shape of a User
interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'branch' | 'customer';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (on page refresh)
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user_data');

      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Function called when Login is successful
  const login = (data: any) => {
    // 1. Save tokens
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    
    // 2. Create user object from response
    const userData: User = {
      id: data.id,
      username: data.username,
      email: data.email,
      role: data.role
    };

    // 3. Save user data for persistence
    localStorage.setItem('user_data', JSON.stringify(userData));
    
    // 4. Update State
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    setUser(null);
    setIsAuthenticated(false);
    // Optional: Redirect to login page manually if needed
    window.location.href = '/auth'; 
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};