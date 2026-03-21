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
      day: 'numeric',
    });
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}
    >
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePreviousDay}
          className="p-2 rounded-xl transition-all duration-300 hover:bg-stone-50"
          style={{ border: '1px solid rgba(64,53,44,0.12)' }}
          aria-label="Previous day"
        >
          <Icon name="ChevronLeft" size={20} style={{ color: '#40352C' }} />
        </button>

        <div className="flex-1 text-center">
          <p className="text-lg font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
            {formatDate(selectedDate)}
          </p>
          {isToday && (
            <p className="text-xs mt-1 font-medium" style={{ color: 'rgba(64,53,44,0.5)' }}>Today</p>
          )}
        </div>

        <button
          onClick={handleNextDay}
          disabled={isFutureDate}
          className="p-2 rounded-xl transition-all duration-300 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ border: '1px solid rgba(64,53,44,0.12)' }}
          aria-label="Next day"
        >
          <Icon name="ChevronRight" size={20} style={{ color: '#40352C' }} />
        </button>
      </div>

      {!isToday && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(64,53,44,0.08)' }}>
          <button
            onClick={handleToday}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl transition-all duration-300 text-sm hover:bg-stone-50"
            style={{ border: '1px solid rgba(64,53,44,0.12)', color: '#40352C' }}
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
