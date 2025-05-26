import React, { useState, useEffect } from "react";
import AIAssistant from "./components/AIAssistant.jsx";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [newProjects, setNewProjects] = useState("");
  const [editingProject, setEditingProject] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("normal"); // 'normal', 'high', 'urgent'
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem("accentColor") || "#4F46E5"; // Use user's accent color if available
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  // Load user ID and projects when component mounts
  useEffect(() => {
    // Get user ID from localStorage
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
      if (userInfo.id) {
        setUserId(userInfo.id);
      }
    } catch (error) {
      console.error("Error parsing user info:", error);
    }

    fetchProjects();
  }, []);

  // Update the fetchProjects function to use userId
  // Update the fetchProjects function
  const fetchProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");

      // Check if token exists before making the request
      if (!token) {
        console.log("No authentication token found");
        setError("Please log in to view your projects");
        setLoading(false);
        return; // Exit early if no token
      }

      console.log("Using token:", token.substring(0, 10) + "..."); // Debug the token being sent

      const response = await fetch("http://localhost:3000/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // If unauthorized, clear the token
          localStorage.removeItem("token");
          setError("Your session has expired. Please log in again.");
          throw new Error(
            "Authentication failed - token may be invalid or expired"
          );
        }

        const errorText = await response.text();
        console.error("Server error response:", errorText);
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }

      const data = await response.json();
      setProjects(data);

      // Cache projects in localStorage as a fallback
      localStorage.setItem("projects", JSON.stringify(data));
    } catch (error) {
      console.error("Error fetching projects:", error);

      // Try to load from localStorage as fallback
      try {
        const cachedProjects = localStorage.getItem("projects");
        if (cachedProjects) {
          setProjects(JSON.parse(cachedProjects));
          setError("Using cached projects. Please refresh or log in again.");
        } else {
          setError("Failed to load projects. Please log in and try again.");
        }
      } catch (e) {
        console.error("Error loading projects from localStorage:", e);
        setError("Failed to load projects. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Also update the saveProject function
  const saveProject = async (projectData) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      // Change the port from 3000 to 5000
      const response = await fetch("http://localhost:3000/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server error:", errorData);
        throw new Error("Failed to create project");
      }

      const newProject = await response.json();
      return newProject;
    } catch (error) {
      console.error("Error saving project:", error);
      throw error;
    }
  };

  const handleNewProject = async () => {
    if (newProjects.trim()) {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication required");
        }

        if (editingProject) {
          // Update existing project
          const updatedProject = {
            ...editingProject,
            name: newProjects,
            priority: priority,
            dueDate: dueDate,
          };

          // Optimistic update
          setProjects(
            projects.map((project) =>
              project.id === editingProject.id ? updatedProject : project
            )
          );

          // API update
          const response = await fetch(
            `http://localhost:3000/projects/${editingProject.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(updatedProject),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to update project");
          }

          // Update with server response
          const data = await response.json();
          setProjects(
            projects.map((project) =>
              project.id === editingProject.id ? data : project
            )
          );

          setEditingProject(null);
        } else {
          // Create new project
          const newProject = {
            name: newProjects,
            tasks: [],
            completed: false,
            createdAt: new Date().toISOString(),
            dueDate: dueDate,
            priority: priority,
            userId: userId, // Add userId to the project
          };

          // API create
          const response = await fetch("http://localhost:3000/projects", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(newProject),
          });

          if (!response.ok) {
            throw new Error("Failed to create project");
          }

          // Add server response (with ID) to state
          const data = await response.json();
          setProjects([...projects, data]);
        }

        // Update localStorage cache
        localStorage.setItem("projects", JSON.stringify([...projects]));

        // Reset form
        setNewProjects("");
        setDueDate("");
        setPriority("normal");
      } catch (error) {
        console.error("Error saving project:", error);
        setError("Failed to save project. Please try again.");

        // If we were editing, revert the optimistic update
        if (editingProject) {
          fetchProjects(); // Refresh from server
        }
      }
    }
  };

  const deleteProject = async (projectId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      // Optimistic delete
      setProjects(projects.filter((project) => project.id !== projectId));

      // API delete
      const response = await fetch(
        `http://localhost:3000/projects/${projectId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      // Update localStorage cache
      localStorage.setItem(
        "projects",
        JSON.stringify(projects.filter((project) => project.id !== projectId))
      );
    } catch (error) {
      console.error("Error deleting project:", error);
      setError("Failed to delete project. Please try again.");
      fetchProjects(); // Refresh from server to revert optimistic delete
    }
  };

  const editProject = (project) => {
    setEditingProject(project);
    setNewProjects(project.name); // Set the input value to the project name
    setPriority(project.priority || "normal");
    setDueDate(project.dueDate || "");
  };

  const toggleProjectCompletion = async (projectId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      // Find the project to toggle
      const projectToUpdate = projects.find(
        (project) => project.id === projectId
      );
      if (!projectToUpdate) return;

      // Create updated project with toggled completion
      const updatedProject = {
        ...projectToUpdate,
        completed: !projectToUpdate.completed,
      };

      // Optimistic update
      setProjects(
        projects.map((project) =>
          project.id === projectId ? updatedProject : project
        )
      );

      // API update
      const response = await fetch(
        `http://localhost:3000/projects/${projectId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedProject),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update project completion status");
      }

      // Update localStorage cache
      localStorage.setItem(
        "projects",
        JSON.stringify(
          projects.map((project) =>
            project.id === projectId ? updatedProject : project
          )
        )
      );
    } catch (error) {
      console.error("Error toggling project completion:", error);
      setError("Failed to update project status. Please try again.");
      fetchProjects(); // Refresh from server to revert optimistic update
    }
  };

  // Helper function to get priority badge color
  const getPriorityBadgeClass = (priorityLevel) => {
    switch (priorityLevel) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
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
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Projects
          </h1>
          <button
            onClick={handleNewProject}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
          >
            {editingProject ? "Update Project" : "Add Project"}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300">
            {error}
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

        {/* AI Assistant Component */}
        <AIAssistant
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          accentColor={accentColor}
        />
        <div className="task-form mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {editingProject ? "Edit Project" : "Create New Project"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {editingProject
                ? "Update your project details below"
                : "Fill in the details to create a new project"}
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjects}
                  onChange={(e) => setNewProjects(e.target.value)}
                  placeholder="Enter project name"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                  onKeyDown={(e) => e.key === "Enter" && handleNewProject()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none transition-all duration-200"
                  >
                    <option value="low">Low Priority</option>
                    <option value="normal">Normal Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              {editingProject && (
                <button
                  onClick={() => {
                    setEditingProject(null);
                    setNewProjects("");
                    setDueDate("");
                    setPriority("normal");
                  }}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Cancel
                </button>
              )}

              <button
                onClick={handleNewProject}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow transition-all duration-200"
              >
                {editingProject ? "Update Project" : "Create Project"}
              </button>
            </div>
          </div>
        </div>

        {/* Display existing projects */}
        <div className="projects-list grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {projects.map((project) => (
            <div
              key={project.id}
              className="card bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                    {project.name}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${getPriorityBadgeClass(
                      project.priority
                    )}`}
                  >
                    {project.priority
                      ? project.priority.charAt(0).toUpperCase() +
                        project.priority.slice(1)
                      : "Normal"}
                  </span>
                </div>

                <p className="text-gray-600 dark:text-gray-300">
                  Tasks: {project.tasks ? project.tasks.length : 0}
                </p>

                {project.dueDate && (
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Due: {new Date(project.dueDate).toLocaleDateString()}
                  </p>
                )}

                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Created: {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => toggleProjectCompletion(project.id)}
                    className={`px-2 py-1 rounded-full text-xs ${
                      project.completed
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {project.completed ? "Completed" : "In Progress"}
                  </button>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => editProject(project)}
                    className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                    aria-label="Edit project"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
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
                    onClick={() => deleteProject(project.id)}
                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                    aria-label="Delete project"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Projects;
