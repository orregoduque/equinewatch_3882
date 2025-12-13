export interface UserProfile {
  id: string;
  name: string;
  email: string;
  memberSince: Date;
  horsesOwned: number;
  avatar?: string;
}

export interface ProfileStats {
  totalObservations: number;
  activeHorses: number;
  averageTemperature: number;
  lastObservation: Date;
}