import React from 'react';
import Icon from '../../../components/AppIcon';
import { SearchBarProps } from '../types';
import { useTheme } from '../../../contexts/ThemeContext';

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder }) => {
  const { theme } = useTheme();
  
  return (
    <div className="relative group animate-fade-in">
      {/* Premium Search Container */}
      <div className="relative">
        {/* Glow Effect on Focus */}
        <div className={`absolute -inset-0.5 bg-gradient-to-r rounded-2xl opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500 ${
          theme === 'dark' ? 'from-[#00f0ff]/20 via-[#00d4ff]/20 to-[#0099ff]/20' : 'from-[#00b8d4]/15 via-[#00b8d4]/10 to-[#0099ff]/15'
        }`} />
        
        {/* Main Input Container */}
        <div className={`relative backdrop-blur-xl border rounded-2xl transition-all duration-300 ${
          theme === 'dark' ?'bg-white/[0.04] border-white/[0.08] group-focus-within:bg-white/[0.06] group-focus-within:border-white/[0.15] group-focus-within:shadow-[0_20px_60px_rgba(0,0,0,0.3),0_0_30px_rgba(0,240,255,0.15)]' :'bg-black/[0.02] border-black/[0.1] group-focus-within:bg-black/[0.04] group-focus-within:border-black/[0.2] group-focus-within:shadow-[0_10px_40px_rgba(0,0,0,0.15),0_0_20px_rgba(0,180,212,0.1)]'
        }`}>
          
          {/* Search Icon */}
          <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="relative">
              <Icon 
                name="Search" 
                size={20} 
                className={`transition-colors duration-300 ${
                  theme === 'dark' ?'text-white/40 group-focus-within:text-[#00f0ff]' :'text-gray-500 group-focus-within:text-[#00b8d4]'
                }`}
              />
              {/* Icon Glow on Focus */}
              <div className={`absolute inset-0 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 ${
                theme === 'dark' ? 'bg-[#00f0ff]/30' : 'bg-[#00b8d4]/20'
              }`} />
            </div>
          </div>

          {/* Input Field */}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full pl-14 pr-12 py-4 bg-transparent text-sm font-medium outline-none transition-all duration-300 ${
              theme === 'dark' ?'text-white placeholder-white/40 group-focus-within:placeholder-white/60' :'text-gray-900 placeholder-gray-500 group-focus-within:placeholder-gray-600'
            }`}
          />

          {/* Clear Button */}
          {value && (
            <button
              onClick={() => onChange('')}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full backdrop-blur-xl border transition-all duration-300 group animate-fade-in ${
                theme === 'dark' ?'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15]' :'bg-black/[0.03] border-black/[0.1] hover:bg-black/[0.05] hover:border-black/[0.15]'
              }`}
            >
              <Icon 
                name="X" 
                size={14} 
                className={`transition-colors ${
                  theme === 'dark' ? 'text-white/60 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Search Suggestions Hint */}
      <div className="absolute -bottom-8 left-5 flex items-center gap-2 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${
            theme === 'dark' ? 'bg-white/[0.05] border-white/[0.08] text-white/50' : 'bg-black/[0.03] border-black/[0.1] text-gray-600'
          }`}>
            ⌘K
          </span>
          <span className={`text-[10px] ${theme === 'dark' ? 'text-white/40' : 'text-gray-500'}`}>Quick search</span>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;