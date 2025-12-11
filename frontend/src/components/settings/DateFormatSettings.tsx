import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { 
  DateFormat, 
  DATE_FORMAT_LABELS, 
  getDateFormatPreference, 
  setDateFormatPreference,
  DisplayTimezone,
  TIMEZONE_LABELS,
  getDisplayTimezonePreference,
  setDisplayTimezonePreference,
  formatDateDisplay,
  formatDateTimeDisplay,
  todayOttawa,
  nowOttawa
} from '../../utils/dateTimeOttawa';

interface DateFormatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onFormatChange?: () => void;
}

export const DateFormatSettings: React.FC<DateFormatSettingsProps> = ({ 
  isOpen, 
  onClose,
  onFormatChange 
}) => {
  const [selectedFormat, setSelectedFormat] = useState<DateFormat>(getDateFormatPreference());
  const [selectedTimezone, setSelectedTimezone] = useState<DisplayTimezone>(getDisplayTimezonePreference());
  const today = todayOttawa();
  const now = nowOttawa();

  useEffect(() => {
    setSelectedFormat(getDateFormatPreference());
    setSelectedTimezone(getDisplayTimezonePreference());
  }, [isOpen]);

  const handleSave = () => {
    setDateFormatPreference(selectedFormat);
    setDisplayTimezonePreference(selectedTimezone);
    onFormatChange?.();
    onClose();
  };

  const handleFormatChange = (format: DateFormat) => {
    setSelectedFormat(format);
  };

  const handleTimezoneChange = (timezone: DisplayTimezone) => {
    setSelectedTimezone(timezone);
  };

  // Créer une date temporaire avec les préférences sélectionnées pour l'aperçu
  useEffect(() => {
    // Appliquer temporairement les préférences pour l'aperçu
    const originalFormat = getDateFormatPreference();
    const originalTimezone = getDisplayTimezonePreference();
    setDateFormatPreference(selectedFormat);
    setDisplayTimezonePreference(selectedTimezone);
    
    // Cleanup pour restaurer après le démontage
    return () => {
      setDateFormatPreference(originalFormat);
      setDisplayTimezonePreference(originalTimezone);
    };
  }, [selectedFormat, selectedTimezone]);

  return (
    <Modal
      titre="⚙️ Paramètres d'affichage des dates"
      ouvert={isOpen}
      onFermer={onClose}
      ariaDescription="Configuration du format et timezone d'affichage des dates"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Choisissez le format et le fuseau horaire d'affichage des dates dans toute l'application. Ces paramètres n'affectent que votre visualisation personnelle, les données sont toujours stockées en temps d'Ottawa.
        </p>

        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-2">🌐 Fuseau horaire d'affichage</label>
            <Select
              value={selectedTimezone}
              onChange={(e) => handleTimezoneChange(e.target.value as DisplayTimezone)}
              className="w-full"
            >
              {(Object.entries(TIMEZONE_LABELS) as [DisplayTimezone, string][]).map(([tz, label]) => (
                <option key={tz} value={tz}>
                  {label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Les conseillers à Vancouver ou dans les Maritimes peuvent adapter l'affichage à leur fuseau horaire
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">📅 Format de date</label>
            <Select
              value={selectedFormat}
              onChange={(e) => handleFormatChange(e.target.value as DateFormat)}
              className="w-full"
            >
              {(Object.entries(DATE_FORMAT_LABELS) as [DateFormat, string][]).map(([format, label]) => (
                <option key={format} value={format}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-xs font-medium text-blue-900 mb-2">🔍 Aperçu</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Date:</span> {formatDateDisplay(today)}
            </p>
            <p className="text-sm text-blue-800">
              <span className="font-medium">Date et heure:</span> {formatDateTimeDisplay(now)}
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
