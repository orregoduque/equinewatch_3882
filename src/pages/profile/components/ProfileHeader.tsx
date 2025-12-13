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
    <div className="relative overflow-hidden">
      {/* Premium Background with Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00f0ff]/10 via-transparent to-[#ff00ff]/10" />
      
      {/* Content Container */}
      <div className="relative backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#ff00ff] p-[2px] shadow-[0_0_30px_rgba(0,240,255,0.3)]">
              <div className="w-full h-full rounded-xl bg-background flex items-center justify-center">
                {profile.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt={`${profile.name} avatar`}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-[#00f0ff]">
                    {getInitials(profile.name)}
                  </span>
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-[#00f0ff]/20 backdrop-blur-md border border-[#00f0ff]/30 flex items-center justify-center">
              <Icon name="CheckCircle2" size={16} className="text-[#00f0ff]" />
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {profile.name}
            </h1>
            <div className="flex flex-col md:flex-row items-center gap-4 text-secondary">
              <div className="flex items-center gap-2">
                <Icon name="Mail" size={16} className="text-[#00f0ff]" />
                <span className="text-sm">{profile.email}</span>
              </div>
              <div className="hidden md:block w-1 h-1 rounded-full bg-white/20" />
              <div className="flex items-center gap-2">
                <Icon name="Calendar" size={16} className="text-[#00f0ff]" />
                <span className="text-sm">
                  Member since {formatMemberSince(profile.memberSince)}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Badge */}
          <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/20">
            <Icon name="Activity" size={20} className="text-[#00f0ff]" />
            <div className="text-left">
              <div className="text-2xl font-bold text-[#00f0ff]">
                {profile.horsesOwned}
              </div>
              <div className="text-xs text-secondary">
                {profile.horsesOwned === 1 ? 'Horse' : 'Horses'} Owned
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;