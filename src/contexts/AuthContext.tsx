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

interface StoredAccount {
  email: string;
  password: string;
  user: User;
}

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  stableName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  createUser: (data: CreateUserData) => { success: boolean; error?: string };
  getCreatedUsers: () => StoredAccount[];
  isHorseOwner: boolean;
  isStableOwner: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BASE_USERS: StoredAccount[] = [
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
    password: 'ycteam123',
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

const CREATED_USERS_KEY = 'stableEyeCreatedUsers';

const loadCreatedUsers = (): StoredAccount[] => {
  try {
    const stored = localStorage.getItem(CREATED_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCreatedUsers = (users: StoredAccount[]) => {
  localStorage.setItem(CREATED_USERS_KEY, JSON.stringify(users));
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [createdUsers, setCreatedUsers] = useState<StoredAccount[]>(loadCreatedUsers);

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

  const getAllAccounts = (): StoredAccount[] => [...BASE_USERS, ...createdUsers];

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const allAccounts = getAllAccounts();
    const foundUser = allAccounts.find(
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

  const createUser = (data: CreateUserData): { success: boolean; error?: string } => {
    const allAccounts = getAllAccounts();
    const emailExists = allAccounts.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (emailExists) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    if (!data.name.trim() || !data.email.trim() || !data.password.trim()) {
      return { success: false, error: 'Name, email, and password are required.' };
    }

    if (data.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const newAccount: StoredAccount = {
      email: data.email.toLowerCase().trim(),
      password: data.password,
      user: {
        id: `user-${Date.now()}`,
        email: data.email.toLowerCase().trim(),
        name: data.name.trim(),
        role: data.role,
        stableName: data.stableName?.trim() || undefined,
      },
    };

    const updated = [...createdUsers, newAccount];
    setCreatedUsers(updated);
    saveCreatedUsers(updated);

    return { success: true };
  };

  const getCreatedUsers = (): StoredAccount[] => createdUsers;

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    createUser,
    getCreatedUsers,
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
