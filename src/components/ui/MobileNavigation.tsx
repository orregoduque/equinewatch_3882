import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';

const MobileNavigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { icon: 'Home', label: 'Horses', path: '/horse-list' },
    { icon: 'Clock', label: 'Timeline', path: '/horse-timeline' },
    { icon: 'BarChart3', label: 'Insights', path: '/daily-summary' },
    { icon: 'User', label: 'Profile', path: '/profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100]">
      {/* Premium Glassmorphism Mobile Nav */}
      <div className="relative">
        {/* Gradient Top Border */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f0ff]/30 to-transparent" />
        
        {/* Main Navigation Container */}
        <div className="backdrop-blur-2xl bg-black/40 border-t border-white/[0.08]">
          <div className="flex items-center justify-around px-4 py-3 safe-area-inset-bottom">
            {navItems.map((item) => {
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center gap-1.5 py-2 px-4 rounded-xl transition-all duration-300 group"
                >
                  {/* Active Background Glow */}
                  {active && (
                    <div className="absolute inset-0 bg-[#00f0ff]/10 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.2)] animate-fade-in" />
                  )}
                  
                  {/* Icon Container */}
                  <div className="relative">
                    <div className={`p-2 rounded-xl transition-all duration-300 ${
                      active 
                        ? 'bg-[#00f0ff]/20 shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
                        : 'bg-white/[0.03] group-active:bg-white/[0.06]'
                    }`}>
                      <Icon 
                        name={item.icon} 
                        size={22} 
                        className={`transition-colors duration-300 ${
                          active ? 'text-[#00f0ff]' : 'text-white/50 group-active:text-white/70'
                        }`}
                      />
                    </div>
                    
                    {/* Active Dot Indicator */}
                    {active && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#00f0ff] rounded-full shadow-[0_0_10px_rgba(0,240,255,0.8)] animate-pulse" />
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className={`text-[10px] font-semibold transition-colors duration-300 ${
                    active ? 'text-[#00f0ff]' : 'text-white/40 group-active:text-white/60'
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