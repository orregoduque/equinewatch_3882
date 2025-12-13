import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  className?: string;
}

const Header = ({ className = '' }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isStableOwner, isAdmin, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const baseNavItems = [
    { label: 'Horses', path: '/horse-list', icon: 'Home' },
    { label: 'Timeline', path: '/horse-timeline', icon: 'Clock' },
    { label: 'Insights', path: '/daily-summary', icon: 'BarChart3' },
  ];

  const stableOwnerItems = [
    { label: 'Devices', path: '/devices', icon: 'Camera' },
    { label: 'Bills', path: '/bills', icon: 'CreditCard' },
  ];

  const adminItems = [
    { label: 'Admin', path: '/admin', icon: 'Shield' },
    { label: 'Stables', path: '/admin/stables', icon: 'Building' },
    { label: 'World Map', path: '/world-map', icon: 'Globe' },
  ];

  const getNavigationItems = () => {
    let items = [...baseNavItems];
    if (isStableOwner || isAdmin) {
      items = [...items, ...stableOwnerItems];
    }
    if (isAdmin) {
      items = [...items, ...adminItems];
    }
    return items;
  };

  const navigationItems = getNavigationItems();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className={`fixed top-0 left-0 right-0 z-[100] ${className}`}>
      <div className="relative backdrop-blur-2xl bg-[#0a0a0f]/80 border-b border-[#c9a962]/10">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#c9a962]/30 to-transparent" />
        
        <div className="flex items-center h-20 px-6 md:px-10">
          <Link to="/horse-list" className="flex items-center gap-3 mr-8 group">
            <div className="relative">
              <img 
                src="/assets/images/HQ_logo-1765539668496.png" 
                alt="Stable Eye" 
                className="h-12 w-auto transition-all duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 blur-xl bg-[#c9a962]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="hidden sm:block">
              <span className="text-2xl font-serif font-light text-[#faf9f6] group-hover:text-[#c9a962] transition-colors duration-300">
                Stable Eye
              </span>
              <div className="text-[10px] font-medium tracking-[0.2em] uppercase text-[#c9a962]/60">
                Premium Monitoring
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2 ml-auto">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="relative group"
              >
                <div className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive(item.path)
                    ? 'text-[#c9a962] bg-[#c9a962]/10 shadow-[0_0_20px_rgba(201,169,98,0.15)]'
                    : 'text-[#a8a8a8] hover:text-[#faf9f6] hover:bg-white/[0.03]'
                }`}>
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                  
                  {isActive(item.path) && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#c9a962] to-transparent" />
                  )}
                </div>
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3 ml-6 pl-6 border-l border-[#c9a962]/10">
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-[#c9a962]/10">
                <span className="text-xs text-[#a8a8a8]">{user.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#c9a962]/20 text-[#c9a962] border border-[#c9a962]/30 capitalize">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
            )}
            <Link 
              to="/profile"
              className="p-2.5 rounded-xl backdrop-blur-xl bg-white/[0.03] border border-[#c9a962]/10 hover:bg-white/[0.06] hover:border-[#c9a962]/20 transition-all duration-300 group"
            >
              <Icon 
                name="User" 
                size={18} 
                className="text-[#a8a8a8] group-hover:text-[#c9a962] transition-colors"
              />
            </Link>
            {isAuthenticated && (
              <button 
                onClick={handleLogout}
                className="p-2.5 rounded-xl backdrop-blur-xl bg-white/[0.03] border border-[#c9a962]/10 hover:bg-[#c75050]/10 hover:border-[#c75050]/20 transition-all duration-300 group"
              >
                <Icon 
                  name="LogOut" 
                  size={18} 
                  className="text-[#a8a8a8] group-hover:text-[#c75050] transition-colors"
                />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
