import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Settings() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);

  // User settings
  const [userSettings, setUserSettings] = useState({
    // Account settings
    name: "",
    email: "",

    // Appearance settings
    darkMode: false,
    accentColor: "#4F46E5", // Default blue
    compactMode: false,

    // Notification settings
    emailNotifications: {
      taskReminders: true,
      dueDateAlerts: true,
      weeklyDigest: false,
    },

    // Task settings
    defaultTaskView: "list", // list, board, calendar
    defaultTaskPriority: "medium",
    defaultTaskDueTime: "17:00", // 5:00 PM

    // Calendar settings
    startWeekOn: "monday", // monday, sunday
    showCompletedTasks: true,

    // Privacy settings
    shareTaskStatistics: false,
    allowAnonymousDataCollection: true,

    // Integrations
    connectedServices: [],
  });

  // Check authentication and load user settings
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setIsLoggedIn(true);

    // Load user settings from localStorage or API
    const loadSettings = async () => {
      try {
        // First check localStorage for cached settings
        const cachedSettings = localStorage.getItem("userSettings");
        if (cachedSettings) {
          setUserSettings(JSON.parse(cachedSettings));
        }

        // Then try to fetch from API
        const response = await fetch("http://localhost:3000/api/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserSettings((prev) => ({ ...prev, ...data }));
          localStorage.setItem("userSettings", JSON.stringify(data));
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };

    // Load dark mode from localStorage
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setUserSettings((prev) => ({ ...prev, darkMode: savedDarkMode }));

    // Load accent color from localStorage
    const savedAccentColor = localStorage.getItem("accentColor");
    if (savedAccentColor) {
      setUserSettings((prev) => ({ ...prev, accentColor: savedAccentColor }));
    }

    loadSettings();
  }, [navigate]);

  // Handle settings changes
  const handleChange = (section, field, value) => {
    if (section) {
      setUserSettings((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    } else {
      setUserSettings((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !userSettings.darkMode;
    setUserSettings((prev) => ({ ...prev, darkMode: newDarkMode }));
    localStorage.setItem("darkMode", newDarkMode.toString());

    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Change accent color
  const changeAccentColor = (color) => {
    setUserSettings((prev) => ({ ...prev, accentColor: color }));
    localStorage.setItem("accentColor", color);
  };

  // Save settings
  const saveSettings = async () => {
    setSaveStatus("saving");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userSettings),
      });

      if (response.ok) {
        localStorage.setItem("userSettings", JSON.stringify(userSettings));
        setSaveStatus("success");

        // Reset status after 3 seconds
        setTimeout(() => {
          setSaveStatus(null);
        }, 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus("error");
    }
  };

  // Reset settings to defaults
  const resetToDefaults = () => {
    if (
      window.confirm("Are you sure you want to reset all settings to defaults?")
    ) {
      const defaultSettings = {
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
        connectedServices: [],
      };

      // Keep user account info
      setUserSettings((prev) => ({
        ...defaultSettings,
        name: prev.name,
        email: prev.email,
      }));

      // Update localStorage for dark mode
      localStorage.setItem("darkMode", "false");
      document.documentElement.classList.remove("dark");

      // Update localStorage for accent color
      localStorage.setItem("accentColor", "#4F46E5");

      setSaveStatus("reset");

      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Reset to Defaults
          </button>
          <button
            onClick={saveSettings}
            className="px-4 py-2 rounded-md text-white"
            style={{ backgroundColor: userSettings.accentColor }}
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving" ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </span>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </div>

      {saveStatus === "success" && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 text-green-700 dark:text-green-300">
          Settings saved successfully!
        </div>
      )}

      {saveStatus === "error" && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300">
          Failed to save settings. Please try again.
        </div>
      )}

      {saveStatus === "reset" && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300">
          Settings have been reset to defaults.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Navigation */}
        <div className="md:col-span-1">
          <nav className="space-y-1 sticky top-20">
            <a
              href="#account"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <svg
                className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Account
            </a>
            <a
              href="#appearance"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg
                className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829m8.486 9.17c.981-.966 1.368-2.415.987-3.696-.381-.533-.904-1.032-1.485-1.498-.581-.467-1.246-.822-1.997-.953a4.667 4.667 0 00-1.307-.352c-.027-.001-.054-.002-.081-.002a4.668 4.668 0 00-1.307.352c-.75.131-1.415.486-1.997.953-.58.466-1.103.965-1.485 1.498-.38.881-.004 2.33-.986 3.696a4.667 4.667 0 01-.352 1.307c-.002.027-.002.054-.002.081a4.668 4.668 0 01.352 1.307c.466.75 1.032 1.415 1.498 1.997.466.581 1.032 1.103 1.498 1.485.881.38 2.33.004 3.696-.986a4.667 4.667 0 001.307-.352c.027-.001.054-.002.081-.002a4.668 4.668 0 001.307.352c.75.131 1.415.486 1.997.953.58.466 1.103.965 1.485 1.498.38.881.004 2.33-.986 3.696z"
                />
              </svg>
              Appearance
            </a>
            <a
              href="#notifications"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg
                className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              Notifications
            </a>
            <a
              href="#tasks"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg
                className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              Tasks
            </a>
            <a
              href="#calendar"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg
                className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H9m2 0h8m-6-4h4m-4 4H5m4 0h4m-2-4h2m-2 4h2"
                />
              </svg>
              Calendar
            </a>
            <a
              href="#privacy"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg
                className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Privacy
            </a>
            <a
              href="#integrations"
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg
                className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8m-6 0h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Integrations
            </a>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="md:col-span-2">
          <div id="account" className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Account
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={userSettings.name}
                  onChange={(e) => handleChange(null, "name", e.target.value)}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={userSettings.email}
                  onChange={(e) => handleChange(null, "email", e.target.value)}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          <div id="appearance" className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Appearance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dark Mode
                </label>
                <div className="mt-1 relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.darkMode}
                    onChange={toggleDarkMode}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    Enable Dark Mode
                  </span>
                </div>
              </div>
              <div>
                <label
                  htmlFor="accentColor"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Accent Color
                </label>
                <input
                  type="color"
                  id="accentColor"
                  value={userSettings.accentColor}
                  onChange={(e) => changeAccentColor(e.target.value)}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Compact Mode
                </label>
                <div className="mt-1 relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.compactMode}
                    onChange={(e) =>
                      handleChange(null, "compactMode", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    Enable Compact Mode
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div id="notifications" className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Notifications
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Task Reminders
                </label>
                <div className="mt-1 relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.emailNotifications.taskReminders}
                    onChange={(e) =>
                      handleChange(
                        "emailNotifications",
                        "taskReminders",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    Enable Task Reminders
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Due Date Alerts
                </label>
                <div className="mt-1 relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.emailNotifications.dueDateAlerts}
                    onChange={(e) =>
                      handleChange(
                        "emailNotifications",
                        "dueDateAlerts",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    Enable Due Date Alerts
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Weekly Digest
                </label>
                <div className="mt-1 relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.emailNotifications.weeklyDigest}
                    onChange={(e) =>
                      handleChange(
                        "emailNotifications",
                        "weeklyDigest",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    Enable Weekly Digest
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div id="tasks" className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Tasks
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="defaultTaskView"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Default Task View
                </label>
                <select
                  id="defaultTaskView"
                  value={userSettings.defaultTaskView}
                  onChange={(e) =>
                    handleChange(null, "defaultTaskView", e.target.value)
                  }
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md"
                >
                  <option value="list">List</option>
                  <option value="board">Board</option>
                  <option value="calendar">Calendar</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="defaultTaskPriority"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Default Task Priority
                </label>
                <select
                  id="defaultTaskPriority"
                  value={userSettings.defaultTaskPriority}
                  onChange={(e) =>
                    handleChange(null, "defaultTaskPriority", e.target.value)
                  }
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="defaultTaskDueTime"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Default Task Due Time
                </label>
                <input
                  type="time"
                  id="defaultTaskDueTime"
                  value={userSettings.defaultTaskDueTime}
                  onChange={(e) =>
                    handleChange(null, "defaultTaskDueTime", e.target.value)
                  }
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          <div id="calendar" className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Calendar
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startWeekOn"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Start Week On
                </label>
                <select
                  id="startWeekOn"
                  value={userSettings.startWeekOn}
                  onChange={(e) =>
                    handleChange(null, "startWeekOn", e.target.value)
                  }
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md"
                >
                  <option value="monday">Monday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show Completed Tasks
                </label>
                <div className="mt-1 relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.showCompletedTasks}
                    onChange={(e) =>
                      handleChange(null, "showCompletedTasks", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    Show Completed Tasks
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div id="privacy" className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Privacy
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Share Task Statistics
                </label>
                <div className="mt-1 relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.shareTaskStatistics}
                    onChange={(e) =>
                      handleChange(
                        null,
                        "shareTaskStatistics",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    Share Task Statistics
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Allow Anonymous Data Collection
                </label>
                <div className="mt-1 relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userSettings.allowAnonymousDataCollection}
                    onChange={(e) =>
                      handleChange(
                        null,
                        "allowAnonymousDataCollection",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    Allow Anonymous Data Collection
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div id="integrations" className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Integrations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Connected Services
                </label>
                <ul className="mt-1 space-y-2">
                  {userSettings.connectedServices.map((service, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span>{service}</span>
                      <button
                        onClick={() => {
                          const newServices =
                            userSettings.connectedServices.filter(
                              (s) => s !== service
                            );
                          handleChange(null, "connectedServices", newServices);
                        }}
                        className="px-2 py-1 bg-red-500 text-white rounded-md"
                      >
                        Disconnect
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    const newService = prompt(
                      "Enter the name of the service you want to connect:"
                    );
                    if (newService) {
                      const newServices = [
                        ...userSettings.connectedServices,
                        newService,
                      ];
                      handleChange(null, "connectedServices", newServices);
                    }
                  }}
                  className="mt-2 px-2 py-1 bg-blue-500 text-white rounded-md"
                >
                  Connect New Service
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
