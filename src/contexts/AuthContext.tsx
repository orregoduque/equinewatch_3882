import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase';

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

interface CreateUserResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  createUser: (data: CreateUserData) => Promise<CreateUserResult>;
  getCreatedUsers: () => StoredAccount[];
  isHorseOwner: boolean;
  isStableOwner: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const HARDCODED_USERS: StoredAccount[] = [
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

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check hardcoded users first
    const hardcoded = HARDCODED_USERS.find(
      (u) => u.email === normalizedEmail && u.password === password
    );
    if (hardcoded) {
      setUser(hardcoded.user);
      localStorage.setItem('stableEyeUser', JSON.stringify(hardcoded.user));
      return { success: true };
    }

    // 2. Check locally stored created users (fallback)
    const latest = loadCreatedUsers();
    const local = latest.find(
      (u) => u.email === normalizedEmail && u.password === password
    );
    if (local) {
      setUser(local.user);
      localStorage.setItem('stableEyeUser', JSON.stringify(local.user));
      return { success: true };
    }

    // 3. Try Supabase Auth for users created via Supabase
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!error && data.user) {
        const meta = data.user.user_metadata || {};
        const appUser: User = {
          id: data.user.id,
          email: data.user.email || normalizedEmail,
          name: meta.name || normalizedEmail,
          role: (meta.role as UserRole) || 'horse_owner',
          stableName: meta.stable_name || undefined,
        };
        setUser(appUser);
        localStorage.setItem('stableEyeUser', JSON.stringify(appUser));
        return { success: true };
      }
    } catch {
      // Supabase unavailable — continue to failure
    }

    return {
      success: false,
      error: 'Invalid credentials. Please check your email and password.',
    };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('stableEyeUser');
    supabase.auth.signOut().catch(() => {});
  };

  const createUser = async (data: CreateUserData): Promise<CreateUserResult> => {
    if (!data.name.trim() || !data.email.trim() || !data.password.trim()) {
      return { success: false, error: 'Name, email, and password are required.' };
    }
    if (data.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const normalizedEmail = data.email.trim().toLowerCase();

    // Check for duplicates in hardcoded + local lists
    const allLocal = [...HARDCODED_USERS, ...loadCreatedUsers()];
    if (allLocal.find((u) => u.email === normalizedEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Create user in Supabase Auth with role stored in metadata
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: data.password,
        options: {
          data: {
            name: data.name.trim(),
            role: data.role,
            stable_name: data.stableName?.trim() || null,
          },
        },
      });

      if (authError) {
        // Fall back to local storage if Supabase fails
        return saveLocalUser(data, normalizedEmail);
      }

      if (authData.user) {
        // Also save locally so login works immediately without email confirmation
        return saveLocalUser(data, normalizedEmail);
      }
    } catch {
      return saveLocalUser(data, normalizedEmail);
    }

    return saveLocalUser(data, normalizedEmail);
  };

  const saveLocalUser = (data: CreateUserData, normalizedEmail: string): CreateUserResult => {
    const newAccount: StoredAccount = {
      email: normalizedEmail,
      password: data.password,
      user: {
        id: `user-${Date.now()}`,
        email: normalizedEmail,
        name: data.name.trim(),
        role: data.role,
        stableName: data.stableName?.trim() || undefined,
      },
    };
    const updated = [...loadCreatedUsers(), newAccount];
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
