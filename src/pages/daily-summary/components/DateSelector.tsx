import React from 'react';

import Button from '../../../components/ui/Button';

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
    <div className="bg-card rounded-xl p-4 border border-border shadow-card">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousDay}
          iconName="ChevronLeft"
          iconSize={20}
          aria-label="Previous day"
        />

        <div className="flex-1 text-center">
          <p className="text-lg font-semibold text-text-primary">
            {formatDate(selectedDate)}
          </p>
          {isToday && (
            <p className="text-xs text-accent mt-1">Today</p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextDay}
          disabled={isFutureDate}
          iconName="ChevronRight"
          iconSize={20}
          aria-label="Next day"
        />
      </div>

      {!isToday && (
        <div className="mt-3 pt-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={handleToday}
            iconName="Calendar"
            iconPosition="left"
          >
            Jump to Today
          </Button>
        </div>
      )}
    </div>
  );
};

export default DateSelector;