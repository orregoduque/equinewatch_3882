export interface ObservationFormData {
  horseId: string;
  horseName: string;
  image: File | null;
  imagePreview: string;
  temperature: string;
  behavior: 'normal' | 'suspicious';
  notes: string;
  timestamp: Date;
}

export interface ValidationErrors {
  image?: string;
  temperature?: string;
  notes?: string;
}

export interface Horse {
  id: string;
  name: string;
  image: string;
  alt: string;
}