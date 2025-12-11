import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { 
  DateFormat, 
  DATE_FORMAT_LABELS, 
  getDateFormatPreference, 
  setDateFormatPreference,
  formatDateDisplay,
  todayOttawa
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
  const today = todayOttawa();

  useEffect(() => {
    setSelectedFormat(getDateFormatPreference());
  }, [isOpen]);

  const handleSave = () => {
    setDateFormatPreference(selectedFormat);
    onFormatChange?.();
    onClose();
  };

  const handleFormatChange = (format: DateFormat) => {
    setSelectedFormat(format);
  };

  return (
    <Modal
      titre="⚙️ Paramètres d'affichage des dates"
      ouvert={isOpen}
      onFermer={onClose}
      ariaDescription="Configuration du format d'affichage des dates"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Choisissez le format d'affichage des dates dans toute l'application. Ce paramètre n'affecte que la visualisation, les dates sont toujours stockées au format standard.
        </p>

        <div>
          <label className="block text-sm font-medium mb-2">Format de date</label>
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

        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-xs font-medium text-blue-900 mb-1">📅 Aperçu</p>
          <p className="text-sm text-blue-800 font-semibold">
            {formatDateDisplay(today, selectedFormat)}
          </p>
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
