import React from 'react';

interface TimeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  minHour?: number;
  maxHour?: number;
  step?: number; // en minutes (15, 30, 60)
}

/**
 * Sélecteur d'heure convivial avec dropdown
 * Génère des options d'heures avec intervalles configurables
 */
export const TimeSelector: React.FC<TimeSelectorProps> = ({
  value,
  onChange,
  label,
  className = '',
  disabled = false,
  minHour = 6,
  maxHour = 20,
  step = 30,
}) => {
  // Générer les options d'heures
  const generateTimeOptions = () => {
    const options: string[] = [];
    for (let hour = minHour; hour <= maxHour; hour++) {
      for (let minute = 0; minute < 60; minute += step) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        options.push(`${h}:${m}`);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Formater pour affichage (ex: "09:00" → "9h00")
  const formatDisplay = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    return m === '00' ? `${hour}h` : `${hour}h${m}`;
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-lg bg-white
          focus:outline-none focus:ring-2 focus:ring-primaire focus:border-primaire
          disabled:bg-gray-100 disabled:cursor-not-allowed
          text-sm
          ${disabled ? 'text-gray-500' : 'text-gray-900'}
        `}
      >
        {timeOptions.map((time) => (
          <option key={time} value={time}>
            {formatDisplay(time)}
          </option>
        ))}
      </select>
    </div>
  );
};

interface TimeRangeSelectorProps {
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  minHour?: number;
  maxHour?: number;
  step?: number;
}

/**
 * Sélecteur de plage horaire (début - fin)
 */
export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  label,
  className = '',
  disabled = false,
  minHour = 6,
  maxHour = 20,
  step = 30,
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <TimeSelector
          value={startValue}
          onChange={onStartChange}
          disabled={disabled}
          minHour={minHour}
          maxHour={maxHour}
          step={step}
        />
        <span className="text-gray-500 font-medium">à</span>
        <TimeSelector
          value={endValue}
          onChange={onEndChange}
          disabled={disabled}
          minHour={minHour}
          maxHour={maxHour}
          step={step}
        />
      </div>
    </div>
  );
};

export default TimeSelector;
