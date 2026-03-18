import React, { useState } from 'react';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import Icon from '../../components/AppIcon';
import { useAuth, UserRole } from '../../contexts/AuthContext';

interface DisplayUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  stableName?: string;
  status: 'active' | 'pending' | 'suspended';
  createdAt: Date;
  lastLogin?: Date;
}

const BASE_DISPLAY_USERS: DisplayUser[] = [
  {
    id: '1',
    name: 'Alexandra Sterling',
    email: 'owner@equinewatch.com',
    role: 'horse_owner',
    stableName: 'Sterling Stables',
    status: 'active',
    createdAt: new Date('2024-06-15'),
    lastLogin: new Date(Date.now() - 3600000),
  },
  {
    id: '2',
    name: 'Victoria Ashford',
    email: 'stable@equinewatch.com',
    role: 'stable_owner',
    stableName: 'Ashford Equestrian',
    status: 'active',
    createdAt: new Date('2024-03-20'),
    lastLogin: new Date(Date.now() - 86400000),
  },
  {
    id: '3',
    name: 'James Hartley',
    email: 'admin@equinewatch.com',
    role: 'admin',
    status: 'active',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date(),
  },
  {
    id: '4',
    name: 'Robert Martinez',
    email: 'robert.m@stable.com',
    role: 'horse_owner',
    stableName: 'Martinez Ranch',
    status: 'pending',
    createdAt: new Date('2024-11-28'),
  },
  {
    id: '5',
    name: 'Emily Thompson',
    email: 'emily.t@equine.org',
    role: 'stable_owner',
    stableName: 'Thompson Stables',
    status: 'suspended',
    createdAt: new Date('2024-08-10'),
    lastLogin: new Date('2024-10-15'),
  },
];

const AdminDashboard: React.FC = () => {
  const { createUser, getCreatedUsers } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'horse_owner' as UserRole,
    stableName: '',
  });

  const createdAccounts = getCreatedUsers();
  const createdDisplayUsers: DisplayUser[] = createdAccounts.map((acc) => ({
    id: acc.user.id,
    name: acc.user.name,
    email: acc.user.email,
    role: acc.user.role,
    stableName: acc.user.stableName,
    status: 'active',
    createdAt: new Date(),
  }));

  const allUsers = [...BASE_DISPLAY_USERS, ...createdDisplayUsers];

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30';
      case 'stable_owner':
        return 'bg-[#c9a962]/20 text-[#c9a962] border-[#c9a962]/30';
      case 'horse_owner':
        return 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30';
    }
  };

  const getStatusColor = (status: DisplayUser['status']) => {
    switch (status) {
      case 'active':
        return 'bg-[#4a9d6b]/20 text-[#4a9d6b] border-[#4a9d6b]/30';
      case 'pending':
        return 'bg-[#c9a962]/20 text-[#c9a962] border-[#c9a962]/30';
      case 'suspended':
        return 'bg-[#c75050]/20 text-[#c75050] border-[#c75050]/30';
    }
  };

  const formatRole = (role: UserRole) => {
    return role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleOpenModal = () => {
    setFormError('');
    setFormSuccess('');
    setNewUser({ name: '', email: '', password: '', role: 'horse_owner', stableName: '' });
    setShowPassword(false);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setFormError('');
    setFormSuccess('');
  };

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateUser = async () => {
    setFormError('');
    setFormSuccess('');
    setIsCreating(true);

    const result = await createUser({
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
      stableName: newUser.stableName || undefined,
    });

    setIsCreating(false);

    if (!result.success) {
      setFormError(result.error || 'Failed to create user.');
      return;
    }

    setFormSuccess(`User "${newUser.name}" created successfully! They can now log in with the provided credentials.`);
    setNewUser({ name: '', email: '', password: '', role: 'horse_owner', stableName: '' });
  };

  const stats = {
    totalUsers: allUsers.length,
    activeUsers: allUsers.filter((u) => u.status === 'active').length,
    stableOwners: allUsers.filter((u) => u.role === 'stable_owner').length,
    pendingUsers: allUsers.filter((u) => u.status === 'pending').length,
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0f0f18]" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#c9a962]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#c9a962]/3 rounded-full blur-[150px]" />
      </div>

      <Header />

      <main className="pt-24 pb-24 md:pb-12 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-8 animate-slide-up">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-12 rounded-full bg-gradient-to-b from-[#c9a962] to-[#a88a45]" />
                <div>
                  <h1 className="font-serif text-4xl md:text-5xl font-light text-[#faf9f6]">
                    Admin <span className="gradient-text font-medium">Dashboard</span>
                  </h1>
                  <p className="text-base mt-2 font-light text-[#a8a8a8] tracking-wide">
                    Manage users and system access
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenModal}
                className="px-6 py-3 luxury-button rounded-xl text-sm font-medium flex items-center gap-2 self-start md:self-auto"
              >
                <Icon name="UserPlus" size={18} />
                Create User
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-5 luxury-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20">
                    <Icon name="Users" size={18} className="text-[#3b82f6]" />
                  </div>
                  <span className="text-sm text-[#a8a8a8]">Total Users</span>
                </div>
                <p className="text-3xl font-semibold text-[#faf9f6]">{stats.totalUsers}</p>
              </div>
              <div className="glass-card p-5 luxury-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#4a9d6b]/10 border border-[#4a9d6b]/20">
                    <Icon name="UserCheck" size={18} className="text-[#4a9d6b]" />
                  </div>
                  <span className="text-sm text-[#a8a8a8]">Active</span>
                </div>
                <p className="text-3xl font-semibold text-[#faf9f6]">{stats.activeUsers}</p>
              </div>
              <div className="glass-card p-5 luxury-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#c9a962]/10 border border-[#c9a962]/20">
                    <Icon name="Building" size={18} className="text-[#c9a962]" />
                  </div>
                  <span className="text-sm text-[#a8a8a8]">Stable Owners</span>
                </div>
                <p className="text-3xl font-semibold text-[#faf9f6]">{stats.stableOwners}</p>
              </div>
              <div className="glass-card p-5 luxury-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20">
                    <Icon name="Clock" size={18} className="text-[#f59e0b]" />
                  </div>
                  <span className="text-sm text-[#a8a8a8]">Pending</span>
                </div>
                <p className="text-3xl font-semibold text-[#faf9f6]">{stats.pendingUsers}</p>
              </div>
            </div>

            <div className="glass-card luxury-border overflow-hidden">
              <div className="p-6 border-b border-[#c9a962]/10">
                <h2 className="text-xl font-medium text-[#faf9f6]">All Users</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#c9a962]/10">
                      <th className="text-left py-4 px-6 text-sm font-medium text-[#a8a8a8]">User</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-[#a8a8a8]">Role</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-[#a8a8a8]">Stable</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-[#a8a8a8]">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-[#a8a8a8]">Last Login</th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-[#a8a8a8]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.id} className="border-b border-[#c9a962]/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#c9a962]/10 border border-[#c9a962]/20 flex items-center justify-center">
                              <span className="text-sm font-medium text-[#c9a962]">
                                {u.name.split(' ').map((n) => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#faf9f6]">{u.name}</p>
                              <p className="text-xs text-[#6b6b6b]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(u.role)}`}>
                            {formatRole(u.role)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-[#a8a8a8]">
                          {u.stableName || '-'}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(u.status)}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-[#a8a8a8]">
                          {u.lastLogin ? formatDate(u.lastLogin) : 'Never'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2 rounded-lg hover:bg-white/[0.05] text-[#a8a8a8] hover:text-[#c9a962] transition-colors">
                              <Icon name="Edit" size={16} />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-white/[0.05] text-[#a8a8a8] hover:text-[#c9a962] transition-colors">
                              <Icon name="Share2" size={16} />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-[#c75050]/10 text-[#a8a8a8] hover:text-[#c75050] transition-colors">
                              <Icon name="Trash2" size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative glass-card p-8 luxury-border max-w-md w-full animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-[#faf9f6]">Create New User</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-lg hover:bg-white/[0.05] text-[#a8a8a8] hover:text-[#faf9f6] transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-[#c75050]/10 border border-[#c75050]/30">
                <p className="text-sm text-[#c75050]">{formError}</p>
              </div>
            )}

            {formSuccess ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-[#4a9d6b]/10 border border-[#4a9d6b]/30 flex items-center justify-center">
                  <Icon name="CheckCircle" size={28} className="text-[#4a9d6b]" />
                </div>
                <p className="text-sm text-[#a8a8a8] leading-relaxed">{formSuccess}</p>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => { setFormSuccess(''); setNewUser({ name: '', email: '', password: '', role: 'horse_owner', stableName: '' }); }}
                    className="flex-1 h-12 luxury-button rounded-xl font-medium"
                  >
                    Create Another
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 h-12 rounded-xl border border-[#c9a962]/20 text-[#a8a8a8] hover:bg-white/[0.03] transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#a8a8a8] mb-2">Full Name</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full h-12 px-4 luxury-input rounded-xl text-[#faf9f6] placeholder:text-[#6b6b6b]"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#a8a8a8] mb-2">Email Address</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full h-12 px-4 luxury-input rounded-xl text-[#faf9f6] placeholder:text-[#6b6b6b]"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#a8a8a8] mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full h-12 pl-4 pr-12 luxury-input rounded-xl text-[#faf9f6] placeholder:text-[#6b6b6b]"
                        placeholder="Min. 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6b6b] hover:text-[#a8a8a8] transition-colors"
                      >
                        <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#a8a8a8] mb-2">Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                      className="w-full h-12 px-4 luxury-input rounded-xl text-[#faf9f6] bg-transparent"
                    >
                      <option value="horse_owner" className="bg-[#12121a]">Horse Owner</option>
                      <option value="stable_owner" className="bg-[#12121a]">Stable Owner</option>
                      <option value="admin" className="bg-[#12121a]">Admin</option>
                    </select>
                  </div>
                  {(newUser.role === 'horse_owner' || newUser.role === 'stable_owner') && (
                    <div>
                      <label className="block text-sm font-medium text-[#a8a8a8] mb-2">Stable Name</label>
                      <input
                        type="text"
                        value={newUser.stableName}
                        onChange={(e) => setNewUser({ ...newUser, stableName: e.target.value })}
                        className="w-full h-12 px-4 luxury-input rounded-xl text-[#faf9f6] placeholder:text-[#6b6b6b]"
                        placeholder="Enter stable name"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 h-12 rounded-xl border border-[#c9a962]/20 text-[#a8a8a8] hover:bg-white/[0.03] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateUser}
                    disabled={isCreating}
                    className="flex-1 h-12 luxury-button rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating...
                      </>
                    ) : 'Create User'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <MobileNavigation />
    </div>
  );
};

export default AdminDashboard;
