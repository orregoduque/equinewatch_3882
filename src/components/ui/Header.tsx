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
      <div
        className="relative"
        style={{
          backgroundColor: 'rgba(248,246,242,0.97)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(64,53,44,0.1)',
        }}
      >
        <div className="flex items-center h-20 px-6 md:px-10">
          <Link to="/horse-list" className="flex items-center gap-3 mr-8 group">
            <img
              src="/logo-icon-dark.png"
              alt="Stable Eye"
              className="h-9 w-auto transition-all duration-300 group-hover:opacity-70"
            />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.15rem', color: '#40352C', letterSpacing: '-0.01em' }}>Stable Eye</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-auto">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="relative group"
              >
                <div
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    color: isActive(item.path) ? '#40352C' : 'rgba(64,53,44,0.45)',
                    backgroundColor: isActive(item.path) ? 'rgba(64,53,44,0.08)' : 'transparent',
                  }}
                >
                  <Icon name={item.icon} size={17} />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </nav>

          <div
            className="hidden md:flex items-center gap-3 ml-6 pl-6"
            style={{ borderLeft: '1px solid rgba(64,53,44,0.1)' }}
          >
            {user && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: 'rgba(64,53,44,0.05)',
                  border: '1px solid rgba(64,53,44,0.1)',
                }}
              >
                <span className="text-xs" style={{ color: 'rgba(64,53,44,0.6)', fontFamily: 'Montserrat, sans-serif' }}>{user.name}</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                  style={{
                    backgroundColor: 'rgba(64,53,44,0.08)',
                    color: 'rgba(64,53,44,0.7)',
                    border: '1px solid rgba(64,53,44,0.15)',
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                >
                  {user.role.replace('_', ' ')}
                </span>
              </div>
            )}
            <Link
              to="/profile"
              className="p-2.5 rounded-xl transition-all duration-300 hover:bg-[rgba(64,53,44,0.06)]"
              style={{
                backgroundColor: 'rgba(64,53,44,0.04)',
                border: '1px solid rgba(64,53,44,0.1)',
              }}
            >
              <Icon name="User" size={17} style={{ color: 'rgba(64,53,44,0.55)' }} />
            </Link>
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl transition-all duration-300 hover:bg-red-50"
                style={{
                  backgroundColor: 'rgba(64,53,44,0.04)',
                  border: '1px solid rgba(64,53,44,0.1)',
                }}
              >
                <Icon name="LogOut" size={17} style={{ color: 'rgba(64,53,44,0.55)' }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
