import { useState, useEffect } from 'react';

export const useTaskManager = () => {
  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem("tasks");
      return savedTasks ? JSON.parse(savedTasks) : [];
    } catch (error) {
      console.error("Error loading tasks from localStorage:", error);
      return [];
    }
  });
  const [showDeletedNotification, setShowDeletedNotification] = useState(false);
  const [lastDeletedTask, setLastDeletedTask] = useState(null);
  const [userId, setUserId] = useState(null);

  // Save tasks to localStorage
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Get user ID and load user-specific tasks
  useEffect(() => {
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      if (userInfo &amp;&amp; userInfo.id) {
        setUserId(userInfo.id);
        
        const userTasksKey = `tasks_${userInfo.id}`;
        const savedUserTasks = localStorage.getItem(userTasksKey);
        
        if (savedUserTasks) {
          setTasks(JSON.parse(savedUserTasks));
        }
      }
    } catch (error) {
      console.error("Error getting user info:", error);
    }
  }, []);

  // Save user-specific tasks
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(tasks));
    }
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks, userId]);

  // Fetch tasks from server
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch("http://localhost:3000/tasks", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch tasks");
        }

        const data = await response.json();
        setTasks(data);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };

    fetchTasks();

    const handleStorageChange = (event) => {
      if (event.key === "token") {
        if (event.newValue) {
          fetchTasks();
        } else {
          setTasks([]);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Add a new task
  const addTask = async (taskData) => {
    try {
      const token = localStorage.getItem("token");
