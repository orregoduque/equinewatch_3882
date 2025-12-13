export interface Observation {
  id: string;
  horseId: string;
  horseName: string;
  imageUrl: string;
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
function ObservationCardProps(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: ObservationCardProps is not implemented yet.', args);
  return null;
}

export { ObservationCardProps };