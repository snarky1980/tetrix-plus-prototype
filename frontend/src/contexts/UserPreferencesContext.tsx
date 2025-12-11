import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  DateFormat, 
  DisplayTimezone,
  getDateFormatPreference,
  getDisplayTimezonePreference,
  setDateFormatPreference,
  setDisplayTimezonePreference
} from '../utils/dateTimeOttawa';

interface UserPreferences {
  dateFormat: DateFormat;
  displayTimezone: DisplayTimezone;
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updateDateFormat: (format: DateFormat) => void;
  updateTimezone: (timezone: DisplayTimezone) => void;
  refreshPreferences: () => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    dateFormat: getDateFormatPreference(),
    displayTimezone: getDisplayTimezonePreference(),
  });

  const refreshPreferences = useCallback(() => {
    setPreferences({
      dateFormat: getDateFormatPreference(),
      displayTimezone: getDisplayTimezonePreference(),
    });
  }, []);

  const updateDateFormat = useCallback((format: DateFormat) => {
    setDateFormatPreference(format);
    setPreferences(prev => ({ ...prev, dateFormat: format }));
  }, []);

  const updateTimezone = useCallback((timezone: DisplayTimezone) => {
    setDisplayTimezonePreference(timezone);
    setPreferences(prev => ({ ...prev, displayTimezone: timezone }));
  }, []);

  // Synchroniser avec localStorage au montage
  useEffect(() => {
    refreshPreferences();
  }, [refreshPreferences]);

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        updateDateFormat,
        updateTimezone,
        refreshPreferences,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};
