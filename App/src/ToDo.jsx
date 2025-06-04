import React, { useState, useEffect, useRef } from "react";
import "./Styles/ToDo.css";
import { motion, AnimatePresence } from "framer-motion";
import AIAssistant from "./components/AIAssistant";

const ToDo = () => {
  // State to hold the list of tasks
  const [tasks, setTasks] = useState(() => {
    try {
      const token = localStorage.getItem("token");

      // Only load tasks if user is authenticated
      if (token) {
        const userData = JSON.parse(localStorage.getItem("userInfo") || "{}");
        const userId = userData.id;

        if (userId) {
          const userTasks = localStorage.getItem(`tasks_${userId}`);
          if (userTasks) {
            return JSON.parse(userTasks);
          }
        }

        // Fall back to general tasks if user-specific not found but still authenticated
        const savedTasks = localStorage.getItem("tasks");
        return savedTasks ? JSON.parse(savedTasks) : [];
      }

      // If not authenticated, return empty array
      return [];
    } catch (error) {
      console.error("Error loading tasks from localStorage:", error);
      return [];
    }
  });

  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState("all"); // all, active, completed
  const [sortBy, setSortBy] = useState("date"); // date, priority, alphabetical
  const [showDeletedNotification, setShowDeletedNotification] = useState(false);
  const [lastDeletedTask, setLastDeletedTask] = useState(null);
  const [taskCategory, setTaskCategory] = useState("personal"); // personal, work, shopping, etc.
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem("accentColor") || "#3B82F6"; // Default to blue
  });
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  // Add state for editing task
  const [editingTask, setEditingTask] = useState(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editCategory, setEditCategory] = useState("personal");
  const [editDueDate, setEditDueDate] = useState("");
  const [userId, setUserId] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  const newTaskInputRef = useRef(null);
  const editTaskInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Add this function after your state declarations but before useEffect hooks
  const syncTasksWithServer = async (forceFetch = false) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsOffline(true);
        return;
      }

      // First, try to push any local changes to server
      const localTasks = JSON.parse(localStorage.getItem(`tasks_${userId}`) || "[]");
      
      // Then fetch latest from server
      const response = await fetch(`${API_URL}/tasks`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const serverTasks = await response.json();
        console.log("Tasks fetched from server:", serverTasks.length);
        
        if (Array.isArray(serverTasks)) {
          // Update local state with server data
          setTasks(serverTasks);
          
          // Update localStorage cache
          if (userId) {
            localStorage.setItem(`tasks_${userId}`, JSON.stringify(serverTasks));
          }
          
          setIsOffline(false);
        }
      } else if (response.status === 401) {
        console.error("Authentication failed - token may be invalid or expired");
        setIsOffline(true);
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (error) {
      console.error("Error syncing tasks with server:", error);
      setIsOffline(true);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    // Save tasks to localStorage for offline access
    if (userId) {
      // If user is logged in, save to user-specific key
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(tasks));
    }

    // Always save to general tasks key for backward compatibility
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks, userId]);
  // Add this useEffect after your state declarations
  useEffect(() => {
    // Try to get user ID from localStorage
    try {
      const userData = JSON.parse(localStorage.getItem("userInfo") || "{}");
      if (userData.id) {
        setUserId(userData.id);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);
  // Modify your existing useEffect for fetching tasks
  useEffect(() => {
    // Function to fetch tasks from server
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem("token");
        const userData = JSON.parse(localStorage.getItem("userInfo") || "{}");
        const userId = userData.id;

        // First, try to load cached tasks regardless of authentication status
        if (userId) {
          const userTasks = localStorage.getItem(`tasks_${userId}`);
          if (userTasks) {
            const cachedTasks = JSON.parse(userTasks);
            // Set tasks from cache first, then we'll update if server fetch succeeds
            setTasks(cachedTasks);
          }
        }

        // If not authenticated, just use cached tasks and return
        if (!token) {
          console.log("No authentication token found, using cached tasks only");
          return;
        }

        console.log(
          "Fetching tasks with token:",
          token.substring(0, 10) + "..."
        );

        // If authenticated, fetch tasks from server
        const response = await fetch(`${API_URL}/tasks`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const tasksFromServer = await response.json();
          console.log("Tasks fetched successfully:", tasksFromServer.length);

          // Only update tasks if we got a valid response with tasks
          if (Array.isArray(tasksFromServer)) {
            setTasks(tasksFromServer);

            // Cache tasks in localStorage for offline access
            if (userId) {
              localStorage.setItem(
                `tasks_${userId}`,
                JSON.stringify(tasksFromServer)
              );
            }
          }
        } else if (response.status === 401) {
          console.error(
            "Authentication failed - token may be invalid or expired"
          );
          // Don't clear tasks here, just try to refresh the token
          // You could add a call to your refreshToken function here
        } else {
          // Try to get error details if available
          let errorMessage = "Failed to fetch tasks";
          try {
            if (
              response.headers.get("content-type")?.includes("application/json")
            ) {
              const errorData = await response.json();
              errorMessage =
                errorData.error || errorData.message || errorMessage;
              console.error("Server error details:", errorData);
            }
          } catch (parseError) {
            console.error("Could not parse error response:", parseError);
          }

          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        // Don't clear tasks on error, just keep using what we have
      }
    };

    // Fetch tasks on initial load
    fetchTasks();

    // Listen for auth changes
    const handleStorageChange = (event) => {
      if (event.key === "token") {
        if (event.newValue) {
          // Token was added (user logged in)
          console.log("User logged in, fetching latest tasks");

          // Check if user ID changed
          try {
            const userData = JSON.parse(
              localStorage.getItem("userInfo") || "{}"
            );
            const newUserId = userData.id;

            if (newUserId && newUserId !== userId) {
              console.log("Different user logged in, switching task context");
              setUserId(newUserId);

              // Load this user's cached tasks first for immediate display
              const userTasks = localStorage.getItem(`tasks_${newUserId}`);
              if (userTasks) {
                setTasks(JSON.parse(userTasks));
              }
            }
          } catch (error) {
            console.error("Error processing user data on login:", error);
          }

          // Then fetch fresh tasks from server
          fetchTasks();

          // Remove offline indicator if you added one
          setIsOffline(false);
        } else {
          // Token was removed (user logged out)
          console.log("User logged out, keeping tasks visible in offline mode");

          // Add visual indicator that user is offline
          setIsOffline(true);

          // Optionally, you could save the current state as "offline tasks"
          // so they can be synced when the user logs back in
          if (userId) {
            localStorage.setItem(
              `offline_tasks_${userId}`,
              JSON.stringify(tasks)
            );
          }
        }
        // Add this to your fetchTasks function
        const syncOfflineTasks = () => {
          if (userId) {
            const offlineTasks = localStorage.getItem(
              `offline_tasks_${userId}`
            );
            if (offlineTasks) {
              // Logic to merge offline tasks with server tasks
              // This would depend on your specific requirements

              // Clear offline tasks after syncing
              localStorage.removeItem(`offline_tasks_${userId}`);
            }
          }
        };

        // Call this when a user logs in
        if (token) {
          syncOfflineTasks();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Clean up event listener
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Save accent color to localStorage
  useEffect(() => {
    localStorage.setItem("accentColor", accentColor);
    document.documentElement.style.setProperty("--accent-color", accentColor);
  }, [accentColor]);

  // Listen for addTask events from Navbar
  useEffect(() => {
    const handleAddTaskEvent = (event) => {
      setTasks((prevTasks) => [...prevTasks, event.detail]);
    };

    // Add event listener
    document.addEventListener("addTask", handleAddTaskEvent);

    // Clean up
    return () => {
      document.removeEventListener("addTask", handleAddTaskEvent);
    };
  }, []);

  // Focus on input when adding task
  useEffect(() => {
    if (isAddingTask && newTaskInputRef.current) {
      newTaskInputRef.current.focus();
    }
  }, [isAddingTask]);

  // Focus on input when editing task
  useEffect(() => {
    if (editingTask && editTaskInputRef.current) {
      editTaskInputRef.current.focus();
    }
  }, [editingTask]);

  // Add this useEffect to periodically sync with server
  useEffect(() => {
    // Only attempt to sync if user is logged in
    if (!userId) return;
    
    // Initial sync when component mounts
    syncTasksWithServer();
    
    // Set up periodic sync every 30 seconds
    const syncInterval = setInterval(() => {
      syncTasksWithServer();
    }, 30000);
    
    // Clean up interval on unmount
    return () => clearInterval(syncInterval);
  }, [userId]);

  // Modify your addTask function to ensure better server sync
  const addTask = async () => {
    if (newTask.trim()) {
      const task = {
        title: newTask,
        description: "",
        priority: priority,
        category: taskCategory,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };

      // Create a temporary ID for optimistic UI update
      const tempId = `temp_${Date.now()}`;
      
      // Add to local state immediately for responsive UI
      const newTaskObj = {
        id: tempId,
        text: newTask,
        completed: false,
        createdAt: new Date().toISOString(),
        priority: priority,
        category: taskCategory,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };
      
      setTasks(prevTasks => [...prevTasks, newTaskObj]);

      try {
        const token = localStorage.getItem("token");
        
        if (token) {
          // If authenticated, create task on backend
          const response = await fetch(`${API_URL}/tasks`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(task),
          });

          if (response.ok) {
            // Get the created task with server-generated ID
            const createdTaskFromServer = await response.json();
            console.log("Task created on server:", createdTaskFromServer);
            
            // Replace the temporary task with the server version
            setTasks(prevTasks => 
              prevTasks.map(t => 
                t.id === tempId ? {...createdTaskFromServer, text: newTask} : t
              )
            );
            
            // Update localStorage
            if (userId) {
              const updatedTasks = tasks.map(t => 
                t.id === tempId ? {...createdTaskFromServer, text: newTask} : t
              );
              localStorage.setItem(`tasks_${userId}`, JSON.stringify(updatedTasks));
            }
          } else if (response.status === 401) {
            console.log("Authentication failed - token may be invalid or expired");
            localStorage.removeItem("token");
            setIsOffline(true);
          } else {
            throw new Error(`Server returned status ${response.status}`);
          }
        } else {
          // Not authenticated, mark as offline
          setIsOffline(true);
        }
      } catch (error) {
        console.error("Error adding task:", error);
        // Keep the task in local state with temporary ID
        setIsOffline(true);
      }

      // Reset form regardless of server response
      setNewTask("");
      setPriority("medium");
      setDueDate("");
      setIsAddingTask(false);
    }
  };

  // Function to toggle task completion
  const toggleCompletion = async (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newCompletedState = !task.completed;

    try {
      const token = localStorage.getItem("token");

      if (token) {
        try {
          // If authenticated, update on backend
          const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ completed: newCompletedState }),
          });

          if (!response.ok) {
            // If server returns an error, log it but continue with local update
            console.warn(
              `Server returned ${response.status} when updating task. Continuing with local update only.`
            );
            // Don't try to parse non-JSON responses
            if (
              response.headers.get("content-type")?.includes("application/json")
            ) {
              const errorData = await response.json();
              console.error("Server error details:", errorData);
            }
          }
        } catch (error) {
          // Network error or JSON parsing error
          console.warn("Network or parsing error when updating task:", error);
          // Continue with local update
        }
      }

      // Always update local state regardless of server response
      setTasks(
        tasks.map((t) =>
          t.id === taskId ? { ...t, completed: newCompletedState } : t
        )
      );
    } catch (error) {
      console.error("Error in toggleCompletion:", error);
      // Still update local state even if there was an error
      setTasks(
        tasks.map((t) =>
          t.id === taskId ? { ...t, completed: newCompletedState } : t
        )
      );
    }
  };

  // Function to delete a task
  const deleteTask = async (taskId) => {
    const taskToDelete = tasks.find((task) => task.id === taskId);
    setLastDeletedTask(taskToDelete);

    try {
      const token = localStorage.getItem("token");

      if (token) {
        try {
          // If authenticated, delete from backend
          const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.status === 401) {
            // Handle authentication error
            console.log(
              "Authentication error - continuing with local deletion"
            );
            // Clear invalid token
            localStorage.removeItem("token");
            // We'll still delete the task locally
          } else if (!response.ok) {
            const errorData = await response.json();
            console.error("Server error:", errorData);
            // We'll still delete the task locally
          }
        } catch (error) {
          console.error("Network error:", error);
          // We'll still delete the task locally
        }
      }

      // Remove from local state regardless of backend success
      setTasks(tasks.filter((task) => task.id !== taskId));
      setShowDeletedNotification(true);

      // Hide notification after 5 seconds
      setTimeout(() => {
        setShowDeletedNotification(false);
      }, 5000);
    } catch (error) {
      console.error("Error deleting task:", error);
      // You could show an error notification here
    }
  };

  // Function to restore the last deleted task
  const undoDelete = () => {
    if (lastDeletedTask) {
      setTasks([...tasks, lastDeletedTask]);
      setLastDeletedTask(null);
      setShowDeletedNotification(false);
    }
  };

  // Function to start editing a task
  const startEditTask = (task) => {
    setEditingTask(task);
    setEditText(task.text);
    setEditPriority(task.priority);
    setEditCategory(task.category);
    setEditDueDate(
      task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ""
    );
  };

  // Function to save edited task
  const saveEditTask = async () => {
    if (editText.trim()) {
      const updatedTask = {
        text: editText,
        priority: editPriority,
        category: editCategory,
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
      };

      try {
        const token = localStorage.getItem("token");

        if (token) {
          try {
            // If authenticated, update on backend
            const response = await fetch(`${API_URL}/tasks/${editingTask.id}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(updatedTask),
            });

            if (!response.ok) {
              console.warn(
                `Server returned ${response.status} when updating task. Continuing with local update only.`
              );
            }
          } catch (error) {
            console.warn("Network or parsing error when updating task:", error);
            // Continue with local update
          }
        }

        // Always update local state regardless of server response
        setTasks(
          tasks.map((task) =>
            task.id === editingTask.id
              ? {
                  ...task,
                  text: editText,
                  priority: editPriority,
                  category: editCategory,
                  dueDate: editDueDate
                    ? new Date(editDueDate).toISOString()
                    : null,
                }
              : task
          )
        );
        cancelEditTask();
      } catch (error) {
        console.error("Error saving edited task:", error);
        // Still update local state even if there was an error
        setTasks(
          tasks.map((task) =>
            task.id === editingTask.id
              ? {
                  ...task,
                  text: editText,
                  priority: editPriority,
                  category: editCategory,
                  dueDate: editDueDate
                    ? new Date(editDueDate).toISOString()
                    : null,
                }
              : task
          )
        );
        cancelEditTask();
      }
    }
  };

  // Function to cancel editing
  const cancelEditTask = () => {
    setEditingTask(null);
    setEditText("");
    setEditPriority("medium");
    setEditCategory("personal");
    setEditDueDate("");
  };

  // Function to clear all completed tasks
  const clearCompleted = () => {
    setTasks(tasks.filter((task) => !task.completed));
  };

  // Get filtered tasks
  const getFilteredTasks = () => {
    let filteredTasks = [...tasks];

    // Apply filter
    if (filter === "active") {
      filteredTasks = filteredTasks.filter((task) => !task.completed);
    } else if (filter === "completed") {
      filteredTasks = filteredTasks.filter((task) => task.completed);
    }

    // Apply sorting
    if (sortBy === "date") {
      filteredTasks.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    } else if (sortBy === "priority") {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      filteredTasks.sort(
        (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
      );
    } else if (sortBy === "alphabetical") {
      filteredTasks.sort((a, b) => a.text.localeCompare(b.text));
    } else if (sortBy === "dueDate") {
      filteredTasks.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    }

    return filteredTasks;
  };

  // Get task counts
  const taskCounts = {
    total: tasks.length,
    active: tasks.filter((task) => !task.completed).length,
    completed: tasks.filter((task) => task.completed).length,
  };

  // Color options for accent color
  const colorOptions = [
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#6B7280", // Gray
  ];

  // Category options
  const categoryOptions = [
    { value: "personal", label: "Personal", icon: "👤" },
    { value: "work", label: "Work", icon: "💼" },
    { value: "shopping", label: "Shopping", icon: "🛒" },
    { value: "school", label: "School", icon: "🎓" },
    { value: "health", label: "Health", icon: "❤️" },
    { value: "education", label: "Education", icon: "📚" },
    { value: "finance", label: "Finance", icon: "💰" },
  ];

  // Get category icon
  const getCategoryIcon = (categoryValue) => {
    const category = categoryOptions.find((cat) => cat.value === categoryValue);
    return category ? category.icon : "📝";
  }; // Add this closing curly brace and semicolon

  return (
    <div
      className="todo-container dark:bg-gray-800 dark:border-gray-700"
      style={{ "--accent-color": accentColor }}
    >
      <div className="todo-header">
        <h1 className="dark:text-white">To Do List</h1>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
            className="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 dark:text-white"
            aria-label="Customize appearance"
          >
            <span className="flex items-center">
              <span
                className="w-3 h-3 rounded-full mr-1"
                style={{ backgroundColor: accentColor }}
              ></span>
              Customize
            </span>
          </button>

          {isOffline && (
            <div className="offline-indicator bg-yellow-100 text-yellow-800 p-2 rounded-md mb-4">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>
                  You're offline. Changes will be saved when you reconnect.
                </span>
              </div>
            </div>
          )}
          {isColorPickerOpen && (
            <div className="absolute right-0 mt-2 p-2 bg-white dark:bg-gray-700 rounded shadow-lg z-10">
              <div className="flex flex-wrap gap-2 mb-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded-full ${
                      accentColor === color ? "ring-2 ring-offset-2" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setAccentColor(color);
                      setIsColorPickerOpen(false);
                    }}
                    aria-label={`Set accent color to ${color}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="task-stats mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{taskCounts.total} tasks</span>
          <span>{taskCounts.active} active</span>
          <span>{taskCounts.completed} completed</span>
        </div>
        <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 ease-in-out"
            style={{
              width: `${
                taskCounts.total > 0
                  ? (taskCounts.completed / taskCounts.total) * 100
                  : 0
              }%`,
              backgroundColor: accentColor,
            }}
          ></div>
        </div>
      </div>

      <div className="task-controls mb-4">
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === "all"
                ? "text-white"
                : "text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700"
            }`}
            style={{
              backgroundColor: filter === "all" ? accentColor : undefined,
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === "active"
                ? "text-white"
                : "text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700"
            }`}
            style={{
              backgroundColor: filter === "active" ? accentColor : undefined,
            }}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === "completed"
                ? "text-white"
                : "text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700"
            }`}
            style={{
              backgroundColor: filter === "completed" ? accentColor : undefined,
            }}
          >
            Completed
          </button>
        </div>

        <div className="flex justify-between">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 dark:text-white"
          >
            <option value="date">Sort by Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="alphabetical">Sort by Name</option>
            <option value="dueDate">Sort by Due Date</option>
          </select>

          {taskCounts.completed > 0 && (
            <button
              onClick={clearCompleted}
              className="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 dark:text-white"
            >
              Clear Completed
            </button>
          )}
        </div>
      </div>

      {isAddingTask ? (
        <div className="task-form mb-4 bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
          <div className="mb-3">
            <input
              ref={newTaskInputRef}
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full p-3 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white text-base"
              onKeyDown={(e) => e.key === "Enter" && addTask()}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="text-base px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 dark:text-white"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>

            <select
              value={taskCategory}
              onChange={(e) => setTaskCategory(e.target.value)}
              className="text-base px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 dark:text-white"
            >
              {categoryOptions.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.icon} {category.label}
                </option>
              ))}
            </select>

            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-base px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 dark:text-white col-span-1 sm:col-span-2"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsAddingTask(false);
                setNewTask("");
              }}
              className="px-4 py-2 text-base rounded bg-gray-200 dark:bg-gray-600 dark:text-white"
            >
              Cancel
            </button>
            <button
              onClick={addTask}
              className="px-4 py-2 text-base rounded text-white"
              style={{ backgroundColor: accentColor }}
              disabled={!newTask.trim()}
            >
              Add Task
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingTask(true)}
          className="w-full mb-4 p-3 text-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors text-base"
        >
          + Add New Task
        </button>
      )}

      {tasks.length === 0 ? (
        <div className="empty-state text-center py-8">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-300">
            No tasks yet
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first task
          </p>
          <div className="mt-4">
            <button
              onClick={() => setIsAddingTask(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md"
              style={{ backgroundColor: accentColor }}
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              New Task
            </button>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          <ul className="task-list space-y-2">
            {getFilteredTasks().map((task) => (
              <motion.li
                key={task.id}
                className={`task-item dark:bg-gray-700 dark:text-white ${
                  task.completed ? "completed" : ""
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                layout
              >
                <div className="task-content">
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleCompletion(task.id)}
                      className={`task-checkbox w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-colors ${
                        task.completed
                          ? "border-transparent"
                          : "border-gray-400 dark:border-gray-500"
                      }`}
                      style={{
                        backgroundColor: task.completed
                          ? accentColor
                          : "transparent",
                      }}
                      aria-label={
                        task.completed
                          ? "Mark as incomplete"
                          : "Mark as complete"
                      }
                    >
                      {task.completed && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center">
                        <span
                          className={`task-category-icon mr-2 ${
                            task.completed ? "opacity-50" : ""
                          }`}
                        >
                          {getCategoryIcon(task.category)}
                        </span>
                        <span
                          className={`task-text ${
                            task.completed
                              ? "line-through text-gray-500 dark:text-gray-400"
                              : "dark:text-white"
                          }`}
                        >
                          {task.text}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center text-xs text-gray-500 dark:text-gray-400 space-x-2">
                        {task.dueDate && (
                          <span
                            className={`flex items-center ${
                              new Date(task.dueDate) < new Date() &&
                              !task.completed
                                ? "text-red-500 dark:text-red-400"
                                : ""
                            }`}
                          >
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {new Date(task.dueDate).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}

                        {task.priority && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              task.priority === "high"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : task.priority === "medium"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            }`}
                          >
                            {task.priority.charAt(0).toUpperCase() +
                              task.priority.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="task-actions flex space-x-1">
                  <button
                    className="p-1 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    onClick={() => startEditTask(task)}
                    aria-label="Edit task"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>

                  <button
                    className="p-1 rounded-full text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete task"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </motion.li>
            ))}
          </ul>
        </AnimatePresence>
      )}

      {/* Undo notification */}
      {showDeletedNotification && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
          <span>Task deleted</span>
          <button
            onClick={undoDelete}
            className="underline font-medium hover:text-blue-300"
          >
            Undo
          </button>
        </div>
      )}

      {/* AI Assistant Button */}
      <button
        onClick={() => setIsAssistantOpen(true)}
        className="fixed bottom-4 right-4 p-3 rounded-full text-white shadow-lg hover:bg-opacity-90 transition-colors z-10"
        style={{ backgroundColor: accentColor }}
        aria-label="Open AI Assistant"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </button>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-full max-w-md mx-auto">
            <h3 className="text-lg font-medium mb-4 dark:text-white">
              Edit Task
            </h3>

            <div className="mb-3">
              <input
                ref={editTaskInputRef}
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Task description"
                className="w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
                onKeyDown={(e) => e.key === "Enter" && saveEditTask()}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                className="text-base px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 dark:text-white"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>

              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="text-base px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 dark:text-white"
              >
                {categoryOptions.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.icon} {category.label}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="text-base px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 dark:text-white col-span-1 sm:col-span-2"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={cancelEditTask}
                className="px-4 py-2 text-base rounded bg-gray-200 dark:bg-gray-600 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveEditTask}
                className="px-4 py-2 text-base rounded text-white"
                style={{ backgroundColor: accentColor }}
                disabled={!editText.trim()}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Component */}
      <AIAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        accentColor={accentColor}
      />
    </div>
  );
};

export default ToDo;