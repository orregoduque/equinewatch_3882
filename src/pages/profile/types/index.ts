export interface UserProfile {
  id: string;
  name: string;
  email: string;
  memberSince: Date | null;
  horsesOwned: number;
  avatar?: string;
}

export interface ProfileStats {
  totalObservations: number;
  activeHorses: number;
  averageTemperature: number | null;
  lastObservation: Date | null;
}