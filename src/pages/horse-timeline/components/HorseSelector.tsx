import React from 'react';
import Select from '../../../components/ui/Select';
import { Horse } from '../types';

interface HorseSelectorProps {
  horses: Horse[];
  selectedHorseId: string;
  onHorseChange: (horseId: string) => void;
}

const HorseSelector: React.FC<HorseSelectorProps> = ({
  horses,
  selectedHorseId,
  onHorseChange,
}) => {
  const horseOptions = horses.map((horse) => ({
    value: horse.id,
    label: horse.name,
    description: `${horse.breed} • ${horse.age} years old`,
  }));

  return (
    <div className="mb-6">
      <Select
        label="Select Horse"
        options={horseOptions}
        value={selectedHorseId}
        onChange={(value) => onHorseChange(value as string)}
        searchable
        placeholder="Choose a horse to view timeline"
      />
    </div>
  );
};

export default HorseSelector;