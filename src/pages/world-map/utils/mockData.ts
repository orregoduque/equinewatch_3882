import { DeviceLocation } from '../types';

const regions = ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania'];
const statuses: Array<'active' | 'warning' | 'offline'> = ['active', 'active', 'active', 'warning', 'offline'];

const locationNames = [
  'Kentucky Ranch', 'Texas Stables', 'California Farm', 'Florida Equestrian', 'New York Stud',
  'Buenos Aires Farm', 'São Paulo Ranch', 'Lima Stables', 'Santiago Equestrian', 'Montevideo Farm',
  'London Stables', 'Paris Ranch', 'Berlin Farm', 'Madrid Equestrian', 'Rome Stud',
  'Moscow Ranch', 'Amsterdam Farm', 'Vienna Stables', 'Dublin Equestrian', 'Stockholm Farm',
  'Tokyo Ranch', 'Beijing Stables', 'Mumbai Farm', 'Seoul Equestrian', 'Bangkok Stud',
  'Singapore Ranch', 'Dubai Farm', 'Hong Kong Stables', 'Shanghai Equestrian', 'Delhi Farm',
  'Cairo Ranch', 'Lagos Stables', 'Johannesburg Farm', 'Nairobi Equestrian', 'Casablanca Stud',
  'Sydney Ranch', 'Melbourne Farm', 'Auckland Stables', 'Brisbane Equestrian', 'Perth Farm',
];

const getRandomCoordinates = (region: string): [number, number] => {
  const coordinates: Record<string, { latRange: [number, number]; lngRange: [number, number] }> = {
    'North America': { latRange: [25, 60], lngRange: [-125, -60] },
    'South America': { latRange: [-55, 12], lngRange: [-80, -35] },
    'Europe': { latRange: [36, 70], lngRange: [-10, 40] },
    'Asia': { latRange: [10, 55], lngRange: [60, 145] },
    'Africa': { latRange: [-35, 35], lngRange: [-20, 50] },
    'Oceania': { latRange: [-45, -10], lngRange: [110, 180] },
  };

  const range = coordinates[region];
  const lat = Math.random() * (range.latRange[1] - range.latRange[0]) + range.latRange[0];
  const lng = Math.random() * (range.lngRange[1] - range.lngRange[0]) + range.lngRange[0];
  return [lat, lng];
};

const getRandomLastActivity = (): string => {
  const minutes = Math.floor(Math.random() * 120);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

export const generateMockDevices = (count: number = 100): DeviceLocation[] => {
  const devices: DeviceLocation[] = [];

  for (let i = 0; i < count; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    const [latitude, longitude] = getRandomCoordinates(region);
    const locationName = locationNames[Math.floor(Math.random() * locationNames.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    devices.push({
      id: `device-${i + 1}`,
      latitude,
      longitude,
      locationName: `${locationName} ${i + 1}`,
      horsesMonitored: Math.floor(Math.random() * 20) + 1,
      lastActivity: getRandomLastActivity(),
      status,
      region,
    });
  }

  return devices;
};