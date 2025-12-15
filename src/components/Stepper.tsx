'use client';

import { Minus, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  onBlur?: () => void;
  className?: string;
}

export default function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  onBlur,
  className = '',
}: StepperProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());

  useEffect(() => {
    setTempValue(value.toString());
  }, [value]);

  const handleIncrement = () => {
    const newValue = Math.min(value + step, max);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - step, min);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Allow empty string or valid numbers
    if (inputValue === '' || /^\d+$/.test(inputValue)) {
      setTempValue(inputValue);
    }
  };

  const handleInputBlur = () => {
    const numValue = parseInt(tempValue);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
      setTempValue(clampedValue.toString());
    } else {
      setTempValue(value.toString());
    }
    setIsEditing(false);
    if (onBlur) onBlur();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setTempValue(value.toString());
      setIsEditing(false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className="stepper-button"
        title="Decrease"
        aria-label="Decrease quantity"
      >
        <Minus size={16} className="stepper-icon" />
      </button>

      {isEditing ? (
        <input
          type="text"
          value={tempValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          className="stepper-input"
          autoFocus
          aria-label="Quantity input"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="stepper-display"
          title="Click to edit quantity"
          aria-label={`Current quantity: ${value}. Click to edit`}
        >
          {value}
        </button>
      )}

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className="stepper-button"
        title="Increase"
        aria-label="Increase quantity"
      >
        <Plus size={16} className="stepper-icon" />
      </button>
    </div>
  );
}
