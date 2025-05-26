import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the context
const SettingsContext = createContext();

// Custom hook to use the settings context
export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    darkMode: false,
    accentColor: "#4F46E5",
    compactMode: false,
    emailNotifications: {
      taskReminders: true,
      dueDateAlerts: true,
      weeklyDigest: false,
    },
    defaultTaskView: "list",
    defaultTaskPriority: "medium",
    defaultTaskDueTime: "17:00",
    startWeekOn: "monday",
    showCompletedTasks: true,
    shareTaskStatistics: false,
    allowAnonymousDataCollection: true,
  });

  // Load settings from localStorage on initial render
  useEffect(() => {
    // Load dark mode
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    
    // Load accent color
    const savedAccentColor = localStorage.getItem("accentColor") || "#4F46E5";
    
    // Load other settings
    let userSettings = {};
    try {
      const savedSettings = localStorage.getItem("userSettings");
      if (savedSettings) {
        userSettings = JSON.parse(savedSettings);
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
    }

    // Merge all settings with priority to saved settings
    setSettings(prev => ({
      ...prev,
      ...userSettings,
      darkMode: savedDarkMode,
      accentColor: savedAccentColor
    }));

    // Apply dark mode to document
    if (savedDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Function to update settings
  const updateSettings = (newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Save to localStorage
      try {
        localStorage.setItem("userSettings", JSON.stringify(updated));
        
        // Handle special cases like darkMode and accentColor
        if (newSettings.darkMode !== undefined) {
          localStorage.setItem("darkMode", newSettings.darkMode.toString());
          if (newSettings.darkMode) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
        
        if (newSettings.accentColor) {
          localStorage.setItem("accentColor", newSettings.accentColor);
        }
      } catch (error) {
        console.error("Failed to save settings to localStorage:", error);
      }
      
      return updated;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};