import React from 'react';
import Input from '../../../components/ui/Input';

interface TemperatureInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const TemperatureInput: React.FC<TemperatureInputProps> = ({
  value,
  onChange,
  error
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string, numbers, and one decimal point
    if (inputValue === '' || /^\d*\.?\d{0,1}$/.test(inputValue)) {
      onChange(inputValue);
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      label="Temperature (°C)"
      placeholder="37.5"
      value={value}
      onChange={handleChange}
      error={error}
      required
      description="Enter temperature with one decimal place"
      className="w-full"
    />
  );
};

export default TemperatureInput;