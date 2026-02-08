import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'horse_owner' | 'stable_owner' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  stableId?: string;
  stableName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isHorseOwner: boolean;
  isStableOwner: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUsers: { email: string; password: string; user: User }[] = [
  {
    email: 'owner@equinewatch.com',
    password: 'owner123',
    user: {
      id: '1',
      email: 'owner@equinewatch.com',
      name: 'Alexandra Sterling',
      role: 'horse_owner',
      stableId: 'stable-1',
      stableName: 'Sterling Stables',
    },
  },
  {
    email: 'stable@equinewatch.com',
    password: 'stable123',
    user: {
      id: '2',
      email: 'stable@equinewatch.com',
      name: 'Victoria Ashford',
      role: 'stable_owner',
      stableId: 'stable-2',
      stableName: 'Ashford Equestrian',
    },
  },
  {
    email: 'admin@equinewatch.com',
    password: 'admin123',
    user: {
      id: '3',
      email: 'admin@equinewatch.com',
      name: 'James Hartley',
      role: 'admin',
    },
  },
  {
    email: 'yc_team@stableeye.co',
    password: 'yc123',
    user: {
      id: '4',
      email: 'yc_team@stableeye.co',
      name: 'YC Team',
      role: 'admin',
      stableId: 'stable-1',
      stableName: 'Stable Eye HQ',
    },
  },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('stableEyeUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('stableEyeUser');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const foundUser = mockUsers.find(
      (u) => u.email === email && u.password === password
    );

    if (foundUser) {
      setUser(foundUser.user);
      localStorage.setItem('stableEyeUser', JSON.stringify(foundUser.user));
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid credentials. Please check your email and password.',
    };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('stableEyeUser');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isHorseOwner: user?.role === 'horse_owner',
    isStableOwner: user?.role === 'stable_owner',
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
