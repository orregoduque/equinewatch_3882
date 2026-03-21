import React from 'react';
import Icon from '../../../components/AppIcon';
import { UserProfile } from '../types';

interface ProfileHeaderProps {
  profile: UserProfile;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile }) => {
  const getInitials = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatMemberSince = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl p-8"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 12px rgba(64,53,44,0.06)' }}
    >
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="relative">
          <div
            className="w-24 h-24 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(64,53,44,0.08)', border: '2px solid rgba(64,53,44,0.2)' }}
          >
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={`${profile.name} avatar`}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              <span className="text-3xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
                {getInitials(profile.name)}
              </span>
            )}
          </div>
          <div
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(64,53,44,0.1)', border: '1px solid rgba(64,53,44,0.2)' }}
          >
            <Icon name="CheckCircle2" size={16} style={{ color: '#40352C' }} />
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
            {profile.name}
          </h1>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <Icon name="Mail" size={16} style={{ color: 'rgba(64,53,44,0.5)' }} />
              <span className="text-sm" style={{ color: 'rgba(64,53,44,0.6)', fontFamily: 'Montserrat, sans-serif' }}>{profile.email}</span>
            </div>
            <div className="hidden md:block w-1 h-1 rounded-full" style={{ backgroundColor: 'rgba(64,53,44,0.2)' }} />
            <div className="flex items-center gap-2">
              <Icon name="Calendar" size={16} style={{ color: 'rgba(64,53,44,0.5)' }} />
              <span className="text-sm" style={{ color: 'rgba(64,53,44,0.6)', fontFamily: 'Montserrat, sans-serif' }}>
                Member since {formatMemberSince(profile.memberSince)}
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-2 px-6 py-3 rounded-xl"
          style={{ backgroundColor: 'rgba(64,53,44,0.06)', border: '1px solid rgba(64,53,44,0.12)' }}
        >
          <Icon name="Activity" size={20} style={{ color: '#40352C' }} />
          <div className="text-left">
            <div className="text-2xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
              {profile.horsesOwned}
            </div>
            <div className="text-xs" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>
              {profile.horsesOwned === 1 ? 'Horse' : 'Horses'} Owned
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
