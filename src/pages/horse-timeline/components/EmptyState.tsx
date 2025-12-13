import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasFilters, onClearFilters }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
        <Icon name="Camera" size={40} className="text-secondary" />
      </div>

      <h3 className="text-xl font-semibold text-text-primary mb-2">
        {hasFilters ? 'No observations found' : 'No observations yet'}
      </h3>

      <p className="text-text-secondary mb-8 max-w-md">
        {hasFilters
          ? 'Try adjusting your date filters to see more observations.' :'Start monitoring your horse by adding the first observation with photos and behavioral notes.'}
      </p>

      {hasFilters ? (
        <Button variant="outline" onClick={onClearFilters} iconName="X" iconPosition="left">
          Clear Filters
        </Button>
      ) : (
        <Button
          variant="default"
          onClick={() => navigate('/add-observation')}
          iconName="Plus"
          iconPosition="left"
        >
          Add First Observation
        </Button>
      )}
    </div>
  );
};

export default EmptyState;