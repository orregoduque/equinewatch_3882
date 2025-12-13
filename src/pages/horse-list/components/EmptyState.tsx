import React from 'react';
import Icon from '../../../components/AppIcon';

interface EmptyStateProps {
  message?: string;
  description?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  message = "No horses found",
  description = "Try adjusting your search or check back later"
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon name="Search" size={32} className="text-secondary" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        {message}
      </h3>
      <p className="text-sm text-secondary text-center max-w-md">
        {description}
      </p>
    </div>
  );
};

export default EmptyState;