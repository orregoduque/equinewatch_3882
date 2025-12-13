import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { Helmet } from 'react-helmet';
import 'leaflet/dist/leaflet.css';
import DeviceMarker from './components/DeviceMarker';
import MapControls from './components/MapControls';
import { MapFilters } from './types';
import { generateMockDevices } from './utils/mockData';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';

const WorldMap: React.FC = () => {
  const [filters, setFilters] = useState<MapFilters>({
    status: 'all',
    region: 'all',
  });

  const allDevices = useMemo(() => generateMockDevices(100), []);

  const filteredDevices = useMemo(() => {
    return allDevices.filter((device) => {
      const statusMatch = filters.status === 'all' || device.status === filters.status;
      const regionMatch = filters.region === 'all' || device.region === filters.region;
      return statusMatch && regionMatch;
    });
  }, [allDevices, filters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0f0f18]">
      <Helmet>
        <title>World Map - Stable Eye</title>
        <meta
          name="description"
          content="Global overview of all EquineWatch monitoring devices"
        />
      </Helmet>

      <Header />

      <main className="pt-16 pb-20 md:pb-4">
        <div className="h-[calc(100vh-4rem)] relative overflow-hidden">
          {/* Luxury background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f]/40 via-transparent to-[#c9a962]/10 pointer-events-none z-[1]" />
          
          {/* Premium glow effect */}
          <div className="absolute inset-0 bg-gradient-radial from-[#c9a962]/5 via-transparent to-transparent pointer-events-none z-[2]" />

          <MapContainer
            center={[30, 0]}
            zoom={2}
            minZoom={2}
            maxZoom={18}
            className="h-full w-full relative z-0"
            zoomControl={true}
            scrollWheelZoom={true}
            maxBounds={[[-90, -180], [90, 180]]}
            maxBoundsViscosity={1.0}
            style={{ background: '#0a1929' }}
          >
            {/* Free OpenStreetMap tile layer - no authentication required */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="map-tiles"
            />
            
            {filteredDevices.map((device) => (
              <DeviceMarker key={device.id} device={device} />
            ))}
          </MapContainer>

          <MapControls
            filters={filters}
            onFilterChange={setFilters}
            deviceCount={filteredDevices.length}
          />
        </div>
      </main>

      <MobileNavigation />

      <style>{`
        .leaflet-container {
          background: linear-gradient(135deg, #0a1929 0%, #1a2332 100%) !important;
          font-family: inherit;
        }

        .map-tiles {
          filter: brightness(0.6) contrast(1.2) saturate(0.8) invert(1) hue-rotate(180deg);
          opacity: 0.9;
        }

        /* Premium popup styling */
        .leaflet-popup-content-wrapper {
          background: rgba(10, 10, 15, 0.95);
          border-radius: 1.25rem;
          box-shadow: 
            0 0 0 1px rgba(201, 169, 98, 0.2),
            0 20px 60px rgba(0, 0, 0, 0.6),
            0 10px 30px rgba(201, 169, 98, 0.1);
          border: 1px solid rgba(201, 169, 98, 0.3);
          backdrop-filter: blur(20px);
          padding: 0.5rem;
        }

        .leaflet-popup-content {
          margin: 0;
          min-width: 220px;
        }

        .leaflet-popup-tip {
          background: rgba(10, 10, 15, 0.95);
          box-shadow: 0 0 15px rgba(201, 169, 98, 0.2);
        }

        /* Luxury zoom controls */
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 
            0 0 0 1px rgba(0, 240, 255, 0.2),
            0 15px 40px rgba(0, 0, 0, 0.3),
            0 5px 20px rgba(0, 240, 255, 0.1) !important;
        }

        .leaflet-control-zoom a {
          background: rgba(10, 10, 15, 0.8) !important;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(201, 169, 98, 0.3) !important;
          color: #c9a962 !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 600;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
        }

        .leaflet-control-zoom a:hover {
          background: rgba(201, 169, 98, 0.2) !important;
          transform: scale(1.08) translateY(-1px);
          box-shadow: 
            0 0 20px rgba(201, 169, 98, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          border-color: rgba(201, 169, 98, 0.5) !important;
        }

        .leaflet-control-zoom a:first-child {
          border-top-left-radius: 10px !important;
          border-top-right-radius: 10px !important;
        }

        .leaflet-control-zoom a:last-child {
          border-bottom-left-radius: 10px !important;
          border-bottom-right-radius: 10px !important;
        }

        .leaflet-bar {
          border: none !important;
        }

        /* Premium attribution */
        .leaflet-control-attribution {
          background: rgba(10, 10, 15, 0.8) !important;
          backdrop-filter: blur(15px);
          border: 1px solid rgba(201, 169, 98, 0.2);
          border-radius: 0.75rem;
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
          color: rgba(168, 168, 168, 0.8);
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .leaflet-control-attribution a {
          color: #c9a962 !important;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .leaflet-control-attribution a:hover {
          color: #d4b978 !important;
          text-shadow: 0 0 8px rgba(201, 169, 98, 0.4);
        }

        /* Smooth map loading */
        .leaflet-tile-container {
          transition: opacity 0.3s ease-in-out;
        }

        /* Premium gradient background */
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .leaflet-container {
          background: linear-gradient(135deg, #0a1929 0%, #1a2332 50%, #0f1a2a 100%) !important;
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default WorldMap;