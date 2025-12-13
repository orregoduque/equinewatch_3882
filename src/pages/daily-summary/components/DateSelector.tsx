import React from 'react';
import Icon from '../../../components/AppIcon';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onDateChange }) => {
  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const isFutureDate = selectedDate > new Date();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="glass-card p-4 luxury-border">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePreviousDay}
          className="p-2 rounded-xl bg-white/[0.03] border border-[#c9a962]/10 hover:bg-[#c9a962]/10 hover:border-[#c9a962]/30 transition-all duration-300"
          aria-label="Previous day"
        >
          <Icon name="ChevronLeft" size={20} className="text-[#c9a962]" />
        </button>

        <div className="flex-1 text-center">
          <p className="text-lg font-semibold text-[#faf9f6]">
            {formatDate(selectedDate)}
          </p>
          {isToday && (
            <p className="text-xs text-[#c9a962] mt-1">Today</p>
          )}
        </div>

        <button
          onClick={handleNextDay}
          disabled={isFutureDate}
          className="p-2 rounded-xl bg-white/[0.03] border border-[#c9a962]/10 hover:bg-[#c9a962]/10 hover:border-[#c9a962]/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next day"
        >
          <Icon name="ChevronRight" size={20} className="text-[#c9a962]" />
        </button>
      </div>

      {!isToday && (
        <div className="mt-3 pt-3 border-t border-[#c9a962]/10">
          <button
            onClick={handleToday}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/[0.03] border border-[#c9a962]/20 hover:bg-[#c9a962]/10 hover:border-[#c9a962]/30 transition-all duration-300 text-sm text-[#c9a962]"
          >
            <Icon name="Calendar" size={16} />
            Jump to Today
          </button>
        </div>
      )}
    </div>
  );
};

export default DateSelector;