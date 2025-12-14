import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { cn } from '../../lib/cn';

interface DateTimeInputProps {
  label: string;
  value: string; // Format ISO: "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm:ss"
  onChange: (value: string) => void;
  includeTime?: boolean; // Si true, affiche le champ heure
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  id?: string;
}

/**
 * Composant DateTimeInput - Support date seule ou date+heure
 * 
 * Modes:
 * - includeTime=false: Saisie date seule (YYYY-MM-DD)
 * - includeTime=true: Saisie date + heure optionnelle (YYYY-MM-DD + HH:mm)
 * 
 * @example
 * // Date seule (legacy)
 * <DateTimeInput
 *   label="Date d'échéance"
 *   value="2025-12-15"
 *   onChange={setDate}
 *   includeTime={false}
 * />
 * 
 * // Date + heure
 * <DateTimeInput
 *   label="Date d'échéance"
 *   value="2025-12-15T14:30:00"
 *   onChange={setDate}
 *   includeTime={true}
 * />
 */
export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  label,
  value,
  onChange,
  includeTime = false,
  required = false,
  disabled = false,
  error,
  className,
  id
}) => {
  // Séparer la date et l'heure si value contient un timestamp
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');

  useEffect(() => {
    if (value) {
      if (value.includes('T')) {
        const [date, time] = value.split('T');
        setDateValue(date);
        setTimeValue(time.substring(0, 5)); // "HH:mm" seulement
      } else {
        setDateValue(value);
        setTimeValue('');
      }
    } else {
      setDateValue('');
      setTimeValue('');
    }
  }, [value]);

  const handleDateChange = (newDate: string) => {
    setDateValue(newDate);
    
    if (!newDate) {
      onChange('');
      return;
    }

    if (includeTime && timeValue) {
      // Combiner date + heure
      onChange(`${newDate}T${timeValue}:00`);
    } else if (includeTime) {
      // Par défaut à 17:00 si l'heure n'est pas définie
      const defaultTime = '17:00';
      setTimeValue(defaultTime);
      onChange(`${newDate}T${defaultTime}:00`);
    } else {
      // Mode legacy: date seule
      onChange(newDate);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime);
    
    if (!dateValue) {
      return;
    }

    if (newTime) {
      // Combiner date + heure
      onChange(`${dateValue}T${newTime}:00`);
    } else {
      // Retirer l'heure
      onChange(dateValue);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-primary mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <Input
            type="date"
            value={dateValue}
            onChange={(e) => handleDateChange(e.target.value)}
            required={required}
            disabled={disabled}
            error={!!error}
            id={id}
            className="w-full"
          />
        </div>
        
        {includeTime && (
          <div className="w-32">
            <Input
              type="time"
              value={timeValue}
              onChange={(e) => handleTimeChange(e.target.value)}
              disabled={disabled}
              className="w-full"
              placeholder="HH:mm"
            />
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      
      {includeTime && !timeValue && (
        <p className="text-xs text-muted-foreground">
          Si l'heure n'est pas spécifiée, 23:59:59 sera utilisé par défaut
        </p>
      )}
    </div>
  );
};
