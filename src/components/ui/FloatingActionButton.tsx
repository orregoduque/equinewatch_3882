import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';

interface FloatingActionButtonProps {
  onClick?: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/add-observation');
    }
  };

  return (
    <div className="fixed bottom-24 md:bottom-8 right-6 md:right-10 z-50 animate-fade-in">
      {/* Glow Effect Container */}
      <div className="relative group">
        {/* Animated Pulse Ring */}
        <div className="absolute inset-0 bg-[#00f0ff]/30 rounded-full animate-ping" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#00f0ff] to-[#0099ff] rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Main Button */}
        <button
          onClick={handleClick}
          className="relative w-16 h-16 rounded-full bg-gradient-to-r from-[#00f0ff] to-[#0099ff] shadow-[0_0_40px_rgba(0,240,255,0.5)] hover:shadow-[0_0_60px_rgba(0,240,255,0.8)] transition-all duration-300 transform hover:scale-110 active:scale-95 group"
          aria-label="Add observation"
        >
          {/* Inner Glow */}
          <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />
          
          {/* Icon */}
          <div className="relative flex items-center justify-center h-full">
            <Icon 
              name="Plus" 
              size={28} 
              className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] group-hover:rotate-90 transition-transform duration-300"
              strokeWidth={3}
            />
          </div>
        </button>

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="relative backdrop-blur-xl bg-black/80 border border-white/[0.15] rounded-xl px-4 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
            <span className="text-sm font-semibold text-white whitespace-nowrap">
              Add Observation
            </span>
            {/* Tooltip Arrow */}
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-black/80 border-r border-b border-white/[0.15] transform rotate-45" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingActionButton;