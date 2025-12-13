export interface DeviceLocation {
  id: string;
  latitude: number;
  longitude: number;
  locationName: string;
  horsesMonitored: number;
  lastActivity: string;
  status: 'active' | 'warning' | 'offline';
  region: string;
}

export interface MapFilters {
  status: 'all' | 'active' | 'warning' | 'offline';
  region: 'all' | string;
}