export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'owner' | 'caretaker' | 'admin';
  name: string;
}

export interface TrustBadge {
  id: string;
  icon: string;
  label: string;
  description: string;
}