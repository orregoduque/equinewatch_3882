import React from 'react';
import Icon from '../../../components/AppIcon';
import { SearchBarProps } from '../types';

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder }) => {
  return (
    <div className="relative group animate-fade-in">
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#c9a962]/10 via-[#c9a962]/5 to-[#c9a962]/10 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500" />
        
        <div className="relative backdrop-blur-xl bg-white/[0.03] border border-[#c9a962]/10 rounded-2xl transition-all duration-300 group-focus-within:bg-white/[0.05] group-focus-within:border-[#c9a962]/25 group-focus-within:shadow-[0_20px_60px_rgba(0,0,0,0.3),0_0_30px_rgba(201,169,98,0.1)]">
          
          <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="relative">
              <Icon 
                name="Search" 
                size={20} 
                className="text-[#6b6b6b] group-focus-within:text-[#c9a962] transition-colors duration-300"
              />
              <div className="absolute inset-0 blur-md bg-[#c9a962]/30 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
            </div>
          </div>

          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-14 pr-12 py-4 bg-transparent text-sm font-medium text-[#faf9f6] placeholder-[#6b6b6b] group-focus-within:placeholder-[#a8a8a8] outline-none transition-all duration-300"
          />

          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full backdrop-blur-xl bg-white/[0.05] border border-[#c9a962]/10 hover:bg-white/[0.1] hover:border-[#c9a962]/20 transition-all duration-300 animate-fade-in"
            >
              <Icon 
                name="X" 
                size={14} 
                className="text-[#a8a8a8] hover:text-[#faf9f6] transition-colors"
              />
            </button>
          )}
        </div>
      </div>

      <div className="absolute -bottom-8 left-5 flex items-center gap-2 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.05] border border-[#c9a962]/10 text-[#6b6b6b] font-medium">
            ⌘K
          </span>
          <span className="text-[10px] text-[#6b6b6b]">Quick search</span>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
