import React from 'react';
import Icon from '../../../components/AppIcon';
import { SearchBarProps } from '../types';

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder }) => {
  return (
    <div className="relative group animate-fade-in">
      <div className="relative">
        <div
          className="relative rounded-2xl transition-all duration-300"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(64,53,44,0.12)',
            boxShadow: '0 2px 8px rgba(64,53,44,0.04)',
          }}
        >
          <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon
              name="Search"
              size={20}
              className="transition-colors duration-300"
              style={{ color: 'rgba(64,53,44,0.4)' }}
            />
          </div>

          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-14 pr-12 py-4 bg-transparent text-sm font-medium outline-none transition-all duration-300"
            style={{
              color: '#40352C',
              fontFamily: 'Montserrat, sans-serif',
            }}
            onFocus={e => {
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.style.border = '1px solid rgba(64,53,44,0.35)';
                parent.style.boxShadow = '0 4px 16px rgba(64,53,44,0.1)';
              }
            }}
            onBlur={e => {
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.style.border = '1px solid rgba(64,53,44,0.12)';
                parent.style.boxShadow = '0 2px 8px rgba(64,53,44,0.04)';
              }
            }}
          />

          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all duration-300 animate-fade-in"
              style={{ backgroundColor: 'rgba(64,53,44,0.06)', border: '1px solid rgba(64,53,44,0.1)' }}
            >
              <Icon
                name="X"
                size={14}
                style={{ color: 'rgba(64,53,44,0.5)' }}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
