export interface Horse {
  id: string;
  name: string;
  image: string;
  alt: string;
  lastObservation: Date;
  status: 'normal' | 'suspicious' | 'inactive';
  ownerId: string;
  ownerName: string;
  temperatureC: number;
  notes: string;
}

export interface User {
  id: string;
  role: 'owner' | 'caretaker' | 'admin';
  name: string;
}

export interface HorseListProps {
  user: User;
}

export interface HorseCardProps {
  horse: Horse;
  onClick: (horseId: string) => void;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface StatusBadgeProps {
  status: 'normal' | 'suspicious' | 'inactive';
  lastObservation: Date;
}