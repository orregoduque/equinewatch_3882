import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';

interface NotesTextareaProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const NotesTextarea: React.FC<NotesTextareaProps> = ({
  value,
  onChange,
  error
}) => {
  const [charCount, setCharCount] = useState(0);
  const maxChars = 500;

  useEffect(() => {
    setCharCount(value.length);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxChars) {
      onChange(newValue);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-text-primary mb-2">
        Notes
      </label>
      
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          placeholder="Add any additional observations about the horse's behavior, appetite, or condition..."
          rows={4}
          className={`w-full px-4 py-3 rounded-lg border-2 transition-smooth resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 ${
            error 
              ? 'border-error focus:border-error' :'border-border focus:border-accent'
          }`}
        />
        
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-secondary">
            Optional field for detailed observations
          </p>
          <p className={`text-xs font-medium ${
            charCount > maxChars * 0.9 ? 'text-warning' : 'text-secondary'
          }`}>
            {charCount}/{maxChars}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-error mt-2 flex items-center gap-1">
          <Icon name="AlertCircle" size={14} />
          {error}
        </p>
      )}
    </div>
  );
};

export default NotesTextarea;