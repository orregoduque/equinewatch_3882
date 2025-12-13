import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

interface DateFilterProps {
  onDateChange: (startDate: Date | null, endDate: Date | null) => void;
  selectedStartDate: Date | null;
  selectedEndDate: Date | null;
}

const DateFilter: React.FC<DateFilterProps> = ({
  onDateChange,
  selectedStartDate,
  selectedEndDate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : null;
    onDateChange(newDate, selectedEndDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : null;
    onDateChange(selectedStartDate, newDate);
  };

  const handleClearDates = () => {
    onDateChange(null, null);
  };

  const hasActiveFilter = selectedStartDate || selectedEndDate;

  return (
    <div className="bg-card rounded-lg shadow-card p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-text-primary hover:text-accent transition-smooth"
        >
          <Icon name="Calendar" size={20} />
          <span className="font-medium">Filter by Date</span>
          <Icon
            name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
            size={18}
            className="text-secondary"
          />
        </button>

        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearDates}
            iconName="X"
            iconSize={16}
          >
            Clear
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Start Date"
            value={formatDateForInput(selectedStartDate)}
            onChange={handleStartDateChange}
            className="w-full"
          />
          <Input
            type="date"
            label="End Date"
            value={formatDateForInput(selectedEndDate)}
            onChange={handleEndDateChange}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};

export default DateFilter;