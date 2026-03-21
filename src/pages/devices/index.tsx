import React from 'react';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import Icon from '../../components/AppIcon';

interface Device {
  id: string;
  name: string;
  location: string;
  batteryLevel: number;
  status: 'active' | 'inactive' | 'maintenance';
  lastSync: Date;
  horseName?: string;
}

const Devices: React.FC = () => {
  const mockDevices: Device[] = [
    {
      id: 'dev-1',
      name: 'Camera Unit A1',
      location: 'Stall 1 - Thunder',
      batteryLevel: 92,
      status: 'active',
      lastSync: new Date(Date.now() - 300000),
      horseName: 'Thunder',
    },
    {
      id: 'dev-2',
      name: 'Camera Unit A2',
      location: 'Stall 2 - Midnight Star',
      batteryLevel: 78,
      status: 'active',
      lastSync: new Date(Date.now() - 600000),
      horseName: 'Midnight Star',
    },
    {
      id: 'dev-3',
      name: 'Camera Unit A3',
      location: 'Stall 3 - Golden Dawn',
      batteryLevel: 45,
      status: 'active',
      lastSync: new Date(Date.now() - 1200000),
      horseName: 'Golden Dawn',
    },
    {
      id: 'dev-4',
      name: 'Camera Unit B1',
      location: 'Stall 4 - Storm Chaser',
      batteryLevel: 15,
      status: 'maintenance',
      lastSync: new Date(Date.now() - 7200000),
      horseName: 'Storm Chaser',
    },
    {
      id: 'dev-5',
      name: 'Camera Unit B2',
      location: 'Stall 5 - Copper Belle',
      batteryLevel: 88,
      status: 'active',
      lastSync: new Date(Date.now() - 900000),
      horseName: 'Copper Belle',
    },
    {
      id: 'dev-6',
      name: 'Camera Unit B3',
      location: 'Stall 6 - Silver Shadow',
      batteryLevel: 0,
      status: 'inactive',
      lastSync: new Date(Date.now() - 86400000),
      horseName: 'Silver Shadow',
    },
  ];

  const getBatteryColor = (level: number) => {
    if (level >= 60) return 'text-[#4a9d6b]';
    if (level >= 30) return 'text-[#c9a962]';
    return 'text-[#c75050]';
  };

  const getBatteryBg = (level: number) => {
    if (level >= 60) return 'bg-[#4a9d6b]';
    if (level >= 30) return 'bg-[#c9a962]';
    return 'bg-[#c75050]';
  };

  const getStatusColor = (status: Device['status']) => {
    switch (status) {
      case 'active':
        return 'bg-[#4a9d6b]/20 text-[#4a9d6b] border-[#4a9d6b]/30';
      case 'inactive':
        return 'bg-[#c75050]/20 text-[#c75050] border-[#c75050]/30';
      case 'maintenance':
        return 'bg-[#c9a962]/20 text-[#c9a962] border-[#c9a962]/30';
    }
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  const activeCount = mockDevices.filter(d => d.status === 'active').length;
  const needsAttention = mockDevices.filter(d => d.batteryLevel < 30 || d.status !== 'active').length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F6F2' }}>
      <Header />
      
      <main className="pt-24 pb-24 md:pb-12 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-8 animate-slide-up">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-12 rounded-full" style={{ backgroundColor: '#40352C' }} />
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
                    Hardware Devices
                  </h1>
                  <p className="text-base mt-2" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>
                    Monitor and manage your stable's camera units
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.06)', border: '1px solid rgba(64,53,44,0.12)' }}>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium" style={{ color: 'rgba(64,53,44,0.7)' }}>{activeCount} Active</span>
                </div>
                {needsAttention > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200">
                    <Icon name="AlertTriangle" size={14} className="text-red-500" />
                    <span className="text-sm font-medium text-red-600">{needsAttention} Need Attention</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.04)', border: '1px solid rgba(64,53,44,0.1)' }}>
                  <span className="text-sm font-medium" style={{ color: 'rgba(64,53,44,0.6)' }}>{mockDevices.length} Total Devices</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockDevices.map((device) => (
                <div
                  key={device.id}
                  className="rounded-xl p-6 transition-all duration-300 hover:shadow-md"
                  style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.07)', border: '1px solid rgba(64,53,44,0.12)' }}>
                        <Icon name="Camera" size={20} style={{ color: '#40352C' }} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{device.name}</h3>
                        <p className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>{device.location}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(device.status)}`}>
                      {device.status}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>Battery Level</span>
                      <div className="flex items-center gap-2">
                        <Icon name="Battery" size={16} className={getBatteryColor(device.batteryLevel)} />
                        <span className={`text-sm font-medium ${getBatteryColor(device.batteryLevel)}`}>
                          {device.batteryLevel}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(64,53,44,0.08)' }}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getBatteryBg(device.batteryLevel)}`}
                        style={{ width: `${device.batteryLevel}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(64,53,44,0.08)' }}>
                      <span className="text-sm" style={{ color: 'rgba(64,53,44,0.4)' }}>Last Sync</span>
                      <span className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>{formatLastSync(device.lastSync)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <MobileNavigation />
    </div>
  );
};

export default Devices;
