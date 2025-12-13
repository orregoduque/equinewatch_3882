import { Link, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  className?: string;
}

const Header = ({ className = '' }: HeaderProps) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navigationItems = [
    { label: 'Horses', path: '/horse-list', icon: 'Home' },
    { label: 'Timeline', path: '/horse-timeline', icon: 'Clock' },
    { label: 'Insights', path: '/daily-summary', icon: 'BarChart3' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className={`fixed top-0 left-0 right-0 z-[100] ${className}`}>
      {/* Glassmorphism Header with Premium Blur */}
      <div className={`relative backdrop-blur-2xl border-b transition-all duration-300 ${
        theme === 'light' ?'bg-white/80 border-black/10' :'bg-black/30 border-white/[0.08]'
      }`}>
        {/* Gradient Accent Line */}
        <div className={`absolute bottom-0 left-0 right-0 h-[1px] ${
          theme === 'light' ?'bg-gradient-to-r from-transparent via-[#00b8d4]/50 to-transparent' :'bg-gradient-to-r from-transparent via-[#00f0ff]/50 to-transparent'
        }`} />
        
        <div className="flex items-center h-20 px-6 md:px-10">
          {/* Logo Section with Enhanced Styling */}
          <Link to="/horse-list" className="flex items-center gap-3 mr-8 group">
            <div className="relative">
              <img 
                src="/assets/images/HQ_logo-1765539668496.png" 
                alt="Stable Eye - Professional horse head logo with camera aperture, combining equine monitoring and photography" 
                className="h-12 w-auto transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_15px_rgba(0,240,255,0.6)]"
              />
              {/* Logo Glow */}
              <div className={`absolute inset-0 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                theme === 'light' ? 'bg-[#00b8d4]/20' : 'bg-[#00f0ff]/20'
              }`} />
            </div>
            <div className="hidden sm:block">
              <span className={`text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-all duration-300 ${
                theme === 'light' ?'from-[#001530] to-[#001530]/80 group-hover:from-[#00b8d4] group-hover:to-[#001530]' :'from-white to-white/80 group-hover:from-[#00f0ff] group-hover:to-white'
              }`}>
                Stable Eye
              </span>
              <div className={`text-[10px] font-medium tracking-wider uppercase ${
                theme === 'light' ? 'text-black/40' : 'text-white/40'
              }`}>
                Premium Monitoring
              </div>
            </div>
          </Link>

          {/* Premium Navigation */}
          <nav className="hidden md:flex items-center gap-2 ml-auto">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="relative group"
              >
                <div className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  isActive(item.path)
                    ? theme === 'light' ?'text-[#00b8d4] bg-[#00b8d4]/10 shadow-[0_0_15px_rgba(0,184,212,0.15)]' :'text-[#00f0ff] bg-[#00f0ff]/10 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                    : theme === 'light' ?'text-black/60 hover:text-black hover:bg-black/[0.05]' :'text-white/60 hover:text-white hover:bg-white/[0.05]'
                }`}>
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                  
                  {/* Active Indicator */}
                  {isActive(item.path) && (
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${
                      theme === 'light' ?'bg-gradient-to-r from-transparent via-[#00b8d4] to-transparent' :'bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent'
                    }`} />
                  )}
                </div>
              </Link>
            ))}
          </nav>

          {/* Theme Toggle & User Profile Section */}
          <div className={`hidden md:flex items-center gap-3 ml-6 pl-6 border-l ${
            theme === 'light' ? 'border-black/[0.08]' : 'border-white/[0.08]'
          }`}>
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl backdrop-blur-xl border transition-all duration-300 group ${
                theme === 'light' ?'bg-white/80 border-black/[0.08] hover:bg-white/95 hover:border-black/[0.15] hover:shadow-[0_0_15px_rgba(0,184,212,0.1)]' :'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]'
              }`}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              <Icon 
                name={theme === 'light' ? 'Moon' : 'Sun'} 
                size={18} 
                className={`transition-colors ${
                  theme === 'light' ?'text-black/60 group-hover:text-[#00b8d4]' :'text-white/60 group-hover:text-[#00f0ff]'
                }`}
              />
            </button>

            {/* User Profile Button - Now with Navigation */}
            <Link 
              to="/profile"
              className={`p-2.5 rounded-xl backdrop-blur-xl border transition-all duration-300 group ${
                theme === 'light' ?'bg-white/80 border-black/[0.08] hover:bg-white/95 hover:border-black/[0.15] hover:shadow-[0_0_15px_rgba(0,184,212,0.1)]' :'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]'
              }`}
            >
              <Icon 
                name="User" 
                size={18} 
                className={`transition-colors ${
                  theme === 'light' ?'text-black/60 group-hover:text-[#00b8d4]' :'text-white/60 group-hover:text-[#00f0ff]'
                }`}
              />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;