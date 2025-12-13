import React from 'react';
import Select from '../../../components/ui/Select';
import { Horse } from '../types';

interface HorseSelectorProps {
  horses: Horse[];
  selectedHorseId: string;
  onHorseSelect: (horseId: string) => void;
}

const HorseSelector: React.FC<HorseSelectorProps> = ({
  horses,
  selectedHorseId,
  onHorseSelect
}) => {
  const options = horses.map(horse => ({
    value: horse.id,
    label: horse.name
  }));

  return (
    <Select
      label="Select Horse"
      options={options}
      value={selectedHorseId}
      onChange={(value) => onHorseSelect(value as string)}
      required
      placeholder="Choose a horse"
      description="Select the horse for this observation"
    />
  );
};

export default HorseSelector;