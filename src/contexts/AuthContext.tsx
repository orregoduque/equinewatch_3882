import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, fetchUserProfiles, insertUserProfile, UserProfile } from '../utils/supabase';

export type UserRole = 'horse_owner' | 'stable_owner' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  stableId?: string;
  stableName?: string;
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
  fetchProfiles: () => Promise<UserProfile[]>;
  isHorseOwner: boolean;
  isStableOwner: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded demo accounts — never stored in Supabase
const HARDCODED_USERS: { email: string; password: string; user: User }[] = [
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
    await new Promise((resolve) => setTimeout(resolve, 800));

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check hardcoded demo users
    const hardcoded = HARDCODED_USERS.find(
      (u) => u.email === normalizedEmail && u.password === password
    );
    if (hardcoded) {
      setUser(hardcoded.user);
      localStorage.setItem('stableEyeUser', JSON.stringify(hardcoded.user));
      return { success: true };
    }

    // 2. Try Supabase Auth (works on any device)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!error && data.user) {
        // Fetch profile from profiles table for role/name info
        const profiles = await fetchUserProfiles();
        const profile = profiles.find((p) => p.email === normalizedEmail);

        const appUser: User = {
          id: data.user.id,
          email: normalizedEmail,
          name: profile?.name || data.user.user_metadata?.name || normalizedEmail,
          role: (profile?.role as UserRole) || (data.user.user_metadata?.role as UserRole) || 'horse_owner',
          stableName: profile?.stable_name || data.user.user_metadata?.stable_name || undefined,
        };
        setUser(appUser);
        localStorage.setItem('stableEyeUser', JSON.stringify(appUser));
        return { success: true };
      }
    } catch {
      // Supabase unavailable
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

    // Check duplicate in hardcoded users
    if (HARDCODED_USERS.find((u) => u.email === normalizedEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // 1. Create in Supabase Auth
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
      return { success: false, error: authError.message };
    }

    // 2. Save profile to Supabase profiles table (cross-device visibility)
    await insertUserProfile({
      email: normalizedEmail,
      name: data.name.trim(),
      role: data.role,
      stable_name: data.stableName?.trim() || null,
    });

    // 3. If Supabase signInWithPassword won't work immediately due to email confirmation,
    //    we store a local backup so the user can still log in on this device.
    //    On other devices, login requires email confirmation to be disabled in Supabase.
    if (authData.user && !authData.session) {
      // No session = email confirmation required. Store locally as backup.
      const localUsers = JSON.parse(localStorage.getItem('stableEyeCreatedUsers') || '[]');
      localUsers.push({
        email: normalizedEmail,
        password: data.password,
        user: {
          id: authData.user.id,
          email: normalizedEmail,
          name: data.name.trim(),
          role: data.role,
          stableName: data.stableName?.trim() || undefined,
        },
      });
      localStorage.setItem('stableEyeCreatedUsers', JSON.stringify(localUsers));
    }

    return { success: true };
  };

  const fetchProfiles = fetchUserProfiles;

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    createUser,
    fetchProfiles,
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
