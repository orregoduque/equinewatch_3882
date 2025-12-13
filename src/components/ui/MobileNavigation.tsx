import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';
import { useAuth } from '../../contexts/AuthContext';

const MobileNavigation: React.FC = () => {
  const location = useLocation();
  const { isStableOwner, isAdmin } = useAuth();

  const baseNavItems = [
    { icon: 'Home', label: 'Horses', path: '/horse-list' },
    { icon: 'Clock', label: 'Timeline', path: '/horse-timeline' },
    { icon: 'BarChart3', label: 'Insights', path: '/daily-summary' },
  ];

  const stableOwnerItems = [
    { icon: 'Camera', label: 'Devices', path: '/devices' },
    { icon: 'CreditCard', label: 'Bills', path: '/bills' },
  ];

  const adminItems = [
    { icon: 'Shield', label: 'Admin', path: '/admin' },
    { icon: 'Building', label: 'Stables', path: '/admin/stables' },
    { icon: 'Globe', label: 'Map', path: '/world-map' },
  ];

  const getNavItems = () => {
    let items = [...baseNavItems];
    if (isStableOwner || isAdmin) {
      items = [...items, ...stableOwnerItems];
    }
    if (isAdmin) {
      items = [...items, ...adminItems];
    }
    items.push({ icon: 'User', label: 'Profile', path: '/profile' });
    return items;
  };

  const navItems = getNavItems();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100]">
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#c9a962]/30 to-transparent" />
        
        <div className="backdrop-blur-2xl bg-[#0a0a0f]/90 border-t border-[#c9a962]/10">
          <div className="flex items-center justify-around px-4 py-3 safe-area-inset-bottom">
            {navItems.map((item) => {
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center gap-1.5 py-2 px-4 rounded-xl transition-all duration-300 group"
                >
                  {active && (
                    <div className="absolute inset-0 bg-[#c9a962]/10 rounded-xl shadow-[0_0_20px_rgba(201,169,98,0.15)] animate-fade-in" />
                  )}
                  
                  <div className="relative">
                    <div className={`p-2 rounded-xl transition-all duration-300 ${
                      active 
                        ? 'bg-[#c9a962]/20 shadow-[0_0_15px_rgba(201,169,98,0.2)]' 
                        : 'bg-white/[0.03] group-active:bg-white/[0.06]'
                    }`}>
                      <Icon 
                        name={item.icon} 
                        size={22} 
                        className={`transition-colors duration-300 ${
                          active ? 'text-[#c9a962]' : 'text-[#6b6b6b] group-active:text-[#a8a8a8]'
                        }`}
                      />
                    </div>
                    
                    {active && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#c9a962] rounded-full shadow-[0_0_10px_rgba(201,169,98,0.6)] animate-pulse" />
                    )}
                  </div>
                  
                  <span className={`text-[10px] font-semibold transition-colors duration-300 ${
                    active ? 'text-[#c9a962]' : 'text-[#6b6b6b] group-active:text-[#a8a8a8]'
                  }`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MobileNavigation;
