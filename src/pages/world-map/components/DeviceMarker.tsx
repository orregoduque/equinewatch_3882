import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { DeviceLocation } from '../types';

interface DeviceMarkerProps {
  device: DeviceLocation;
}

const DeviceMarker: React.FC<DeviceMarkerProps> = ({ device }) => {
  const getMarkerColor = () => {
    switch (device.status) {
      case 'active':
        return '#00f0ff';
      case 'warning':
        return '#fbbf24';
      case 'offline':
        return '#ef4444';
      default:
        return '#00f0ff';
    }
  };

  const markerIcon = new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${getMarkerColor()}">
        <circle cx="12" cy="12" r="8" opacity="0.3">
          <animate attributeName="r" from="8" to="12" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="12" cy="12" r="6" fill="${getMarkerColor()}"/>
      </svg>
    `)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

  return (
    <Marker position={[device.latitude, device.longitude]} icon={markerIcon}>
      <Popup className="device-popup">
        <div className="p-3 min-w-[200px]">
          <h3 className="text-base font-semibold text-primary-900 dark:text-white mb-2">
            {device.locationName}
          </h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Horses:</span>
              <span className="font-medium text-primary-900 dark:text-white">
                {device.horsesMonitored}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span
                className={`font-medium capitalize ${
                  device.status === 'active' ?'text-accent'
                    : device.status === 'warning' ?'text-yellow-500' :'text-red-500'
                }`}
              >
                {device.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Last Activity:</span>
              <span className="font-medium text-primary-900 dark:text-white">
                {device.lastActivity}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Region:</span>
              <span className="font-medium text-primary-900 dark:text-white">
                {device.region}
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

export default DeviceMarker;