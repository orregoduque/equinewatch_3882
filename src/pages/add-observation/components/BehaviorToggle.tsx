import React from 'react';
import Icon from '../../../components/AppIcon';

interface BehaviorToggleProps {
  value: 'normal' | 'suspicious';
  onChange: (value: 'normal' | 'suspicious') => void;
}

const BehaviorToggle: React.FC<BehaviorToggleProps> = ({ value, onChange }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-text-primary mb-3">
        Behavior Status <span className="text-error">*</span>
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('normal')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-smooth ${
            value === 'normal' ?'border-success bg-success/10 text-success' :'border-border bg-background text-secondary hover:border-success/50'
          }`}
        >
          <Icon 
            name="CheckCircle2" 
            size={20} 
            className={value === 'normal' ? 'text-success' : 'text-secondary'}
          />
          <span className="font-medium">Normal</span>
        </button>

        <button
          type="button"
          onClick={() => onChange('suspicious')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-smooth ${
            value === 'suspicious' ?'border-warning bg-warning/10 text-warning' :'border-border bg-background text-secondary hover:border-warning/50'
          }`}
        >
          <Icon 
            name="AlertTriangle" 
            size={20} 
            className={value === 'suspicious' ? 'text-warning' : 'text-secondary'}
          />
          <span className="font-medium">Suspicious</span>
        </button>
      </div>
    </div>
  );
};

export default BehaviorToggle;