export interface Observation {
  id: string;
  horseId: string;
  horseName: string;
  imageUrl: string;
  thumbnailUrl?: string;
  imageVersion?: string;
  imageAlt: string;
  timestamp: Date;
  temperature: number;
  behaviorStatus: 'normal' | 'suspicious';
  notes: string;
  uploadedBy: string;
}

export interface Horse {
  id: string;
  name: string;
  breed: string;
  age: number;
  owner: string;
  lastObservation: Date;
  profileImage: string;
  profileImageAlt: string;
}

export interface DateFilterState {
  selectedDate: Date | null;
  isOpen: boolean;
}

export interface TimelineFilters {
  startDate: Date | null;
  endDate: Date | null;
  behaviorFilter: 'all' | 'normal' | 'suspicious';
}
export interface ObservationCardProps {
  observation: Observation;
}