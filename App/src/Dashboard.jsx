import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AIAssistant from "./components/AIAssistant";
import { motion } from "framer-motion";
import Calendar from "./components/Calendar";

// Extract reusable components
const StatCard = ({ icon, title, value, color, bgColor, link, linkText }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md"
  >
    <div className="flex items-center mb-4">
      <div className={`p-3 rounded-lg mr-4 ${bgColor}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
          {value}
        </h3>
      </div>
    </div>
    {link && (
      <a href={link} className={`text-sm font-medium ${color}`}>
        {linkText}
      </a>
    )}
  </motion.div>
);

const SectionHeader = ({ title, linkTo, accentColor }) => (
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
      {title}
    </h2>
    <Link
      to={linkTo}
      className="text-sm font-medium flex items-center"
      style={{ color: accentColor }}
    >
      View all
      <svg
        className="w-4 h-4 ml-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </Link>
  </div>
);

const EmptyState = ({ message, linkTo, linkText, accentColor }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
    <p className="text-gray-500 dark:text-gray-400">{message}</p>
    <Link
      to={linkTo}
      className="mt-2 inline-flex items-center text-sm font-medium"
      style={{ color: accentColor }}
    >
      {linkText}
      <svg
        className="w-4 h-4 ml-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    </Link>
  </div>
);

function Dashboard() {
  // State declarations
  const [tasks, setTasks] = useState([]);
  // const [projects, setProjects] = useState([]);
  const [notes, setNotes] = useState([]);
  const [randomNote, setRandomNote] = useState(null);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    highPriorityTasks: 0,
    // totalProjects: 0,
    // activeProjects: 0,
    // completedProjects: 0,
    totalNotes: 0,
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [accentColor, setAccentColor] = useState(
    () => localStorage.getItem("accentColor") || "#4F46E5"
  );
  const [userName, setUserName] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [pinnedNotes, setPinnedNotes] = useState([]);
  // const [recentProjects, setRecentProjects] = useState([]);

  // Load pinned notes
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem("stickyNotes");
      if (savedNotes) {
        const allNotes = JSON.parse(savedNotes);
        const pinned = allNotes.filter((note) => note.pinned);
        const sortedPinnedNotes = [...pinned].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setPinnedNotes(sortedPinnedNotes.slice(0, Math.max(2, pinned.length)));
      }
    } catch (error) {
      console.error("Error loading notes from localStorage:", error);
      setPinnedNotes([]);
    }

    // Add event listener for storage changes
    const handleStorageChange = (e) => {
      if (e.key === "stickyNotes") {
        try {
          const allNotes = JSON.parse(e.newValue || "[]");
          const pinned = allNotes.filter((note) => note.pinned);
          const sortedPinnedNotes = [...pinned].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          setPinnedNotes(
            sortedPinnedNotes.slice(0, Math.max(2, pinned.length))
          );
        } catch (error) {
          console.error("Error processing storage change:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Load data and calculate stats
  useEffect(() => {
    // Load data from localStorage
    const savedTasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    // const savedProjects = JSON.parse(localStorage.getItem("projects") || "[]");
    const savedNotes = JSON.parse(localStorage.getItem("stickyNotes") || "[]");

    setTasks(savedTasks);
    // setProjects(savedProjects);
    setNotes(savedNotes);

    // Select a random note if there are any
    if (savedNotes.length > 0) {
      setRandomNote(savedNotes[Math.floor(Math.random() * savedNotes.length)]);
    }

    // Calculate statistics
    const now = new Date();
    const completed = savedTasks.filter((task) => task.completed).length;
    const overdue = savedTasks.filter(
      (task) => !task.completed && task.dueDate && new Date(task.dueDate) < now
    ).length;
    const highPriority = savedTasks.filter(
      (task) => !task.completed && task.priority === "high"
    ).length;
    // const completedProjects = savedProjects.filter(
    //   (project) => project.completed
    // ).length;
    // const activeProjects = savedProjects.length - completedProjects;

    setStats({
      totalTasks: savedTasks.length,
      completedTasks: completed,
      overdueTasks: overdue,
      highPriorityTasks: highPriority,
      // totalProjects: savedProjects.length,
      // activeProjects,
      // completedProjects,
      totalNotes: savedNotes.length || 0,
    });

    // Get user data for personalization
    try {
      const userData = JSON.parse(localStorage.getItem("userInfo") || "{}");
      if (userData.name) {
        setUserName(userData.name);
      } else if (userData.username) {
        setUserName(
          userData.username.includes("@")
            ? userData.username.split("@")[0]
            : userData.username
        );
      }
    } catch (e) {
      console.error("Error parsing user data:", e);
    }

    // Set time of day greeting
    const hour = new Date().getHours();
    setTimeOfDay(hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening");
  }, [currentDate]);

  // Load recent projects
  /* 
  useEffect(() => {
    try {
      const savedProjects = localStorage.getItem("projects");
      if (savedProjects) {
        const allProjects = JSON.parse(savedProjects);
        const sortedProjects = [...allProjects].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setRecentProjects(sortedProjects.slice(0, 3));
      }
    } catch (error) {
      console.error("Error loading projects from localStorage:", error);
      setRecentProjects([]);
    }
  }, []);
  */

  // Helper functions
  const getDayTasks = (date) => {
    const dateString = date.toISOString().split("T")[0];
    return tasks.filter(
      (task) => task.dueDate && task.dueDate.startsWith(dateString)
    );
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
  };

  const getPriorityBadgeClass = (priorityLevel) => {
    switch (priorityLevel) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-400";
    }
  };

  // Data preparation for display
  const today = new Date().toISOString().split("T")[0];
  const tasksToday = tasks.filter(
    (task) => !task.completed && task.dueDate && task.dueDate.startsWith(today)
  );

  // Calculate productivity score
  const productivityScore = Math.min(
    100,
    Math.round(
      (stats.completedTasks * 10) /
        // (stats.completedTasks * 10 + stats.completedProjects * 20) /
        // Math.max(1, stats.totalTasks + stats.totalProjects)
        Math.max(1, stats.totalTasks)
    )
  );

  // Get date formatted
  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="container mx-auto px-4 pb-16">
      {/* Personalized Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">
          Good {timeOfDay}
          {userName ? `, ${userName}` : ""}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {dayOfWeek}, {formattedDate}
        </p>
      </motion.div>

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

      {/* Quick Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8 border-l-4"
        style={{ borderLeftColor: accentColor }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Your Day at a Glance</h2>
            <p className="text-gray-600 dark:text-gray-400">
              You have{" "}
              <span className="font-medium">{tasksToday.length} tasks</span>{" "}
              scheduled for today
              {stats.overdueTasks > 0 && (
                <span>
                  {" "}
                  and{" "}
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {stats.overdueTasks} overdue
                  </span>{" "}
                  tasks
                </span>
              )}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex items-center">
              <div className="mr-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Productivity
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: accentColor }}
                >
                  {productivityScore}%
                </p>
              </div>
              <div className="relative w-16 h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    style={{
                      color: accentColor,
                      transition: "stroke-dashoffset 1s",
                    }}
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={
                      2 * Math.PI * 40 * (1 - productivityScore / 100)
                    }
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        {/* Task Stats */}
        <StatCard
          icon={
            <svg
              className="w-6 h-6"
              style={{ color: accentColor }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
          title="Total Tasks"
          value={stats.totalTasks}
          bgColor={`bg-opacity-20`}
          link={null}
          linkText={`${stats.completedTasks} of ${stats.totalTasks} tasks completed`}
          color=""
        />

        {/* Completed Tasks */}
        <StatCard
          icon={
            <svg
              className="w-6 h-6 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          }
          title="Completed"
          value={stats.completedTasks}
          bgColor="bg-green-100 dark:bg-green-900/30"
          link="/tasks?filter=completed"
          linkText="View all completed tasks"
          color={`text-[${accentColor}]`}
        />

        {/* Overdue Tasks */}
        <StatCard
          icon={
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          title="Overdue"
          value={stats.overdueTasks}
          bgColor="bg-red-100 dark:bg-red-900/30"
          link="/tasks?filter=overdue"
          linkText="View all overdue tasks"
          color="text-red-600 dark:text-red-400"
        />

        {/* High Priority Tasks */}
        <StatCard
          icon={
            <svg
              className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          }
          title="High Priority"
          value={stats.highPriorityTasks}
          bgColor="bg-yellow-100 dark:bg-yellow-900/30"
          link="/tasks?filter=high-priority"
          linkText="View all high priority tasks"
          color={`text-[${accentColor}]`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="col-span-1"
        >
          <Calendar tasks={tasks} accentColor={accentColor} />
        </motion.div>

        {/* Middle Column - Today's Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="col-span-1"
        >
          <SectionHeader
            title="Today's Tasks"
            linkTo="/tasks"
            accentColor={accentColor}
          />

          {tasksToday.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {tasksToday.map((task) => (
                  <li
                    key={task.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {task.title || task.text || "Untitled Task"}
                        </p>
                        <div className="flex mt-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              message="No tasks scheduled for today"
              linkTo="/tasks/new"
              linkText="Add a new task"
              accentColor={accentColor}
            />
          )}
        </motion.div>

        {/* Right Column - Pinned Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="col-span-1"
        >
          <SectionHeader
            title="Pinned Notes"
            linkTo="/notes"
            accentColor={accentColor}
          />

          {pinnedNotes.length > 0 ? (
            <div className="space-y-4">
              {pinnedNotes.map((note) => (
                <div
                  key={note.id}
                  className="sticky-note p-4 rounded-lg shadow-md"
                  style={{ backgroundColor: note.color || "#f7e9a0" }}
                >
                  <p className="text-sm font-medium mb-2 line-clamp-3">
                    {note.text}
                  </p>
                  <div className="flex justify-end">
                    <Link
                      to="/notes"
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              message="No pinned notes"
              linkTo="/notes"
              linkText="Create a note"
              accentColor={accentColor}
            />
          )}
        </motion.div>
      </div>

      {/* Recent Projects Section */}
      {/* 
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-8"
      >
        <SectionHeader
          title="Recent Projects"
          linkTo="/projects"
          accentColor={accentColor}
        />

        {recentProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md border-l-4"
                style={{ borderLeftColor: project.color || accentColor }}
              >
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  {project.name}
                </h3>
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(
                        project.priority
                      )}`}
                    >
                      {project.priority}
                    </span>
                    {project.completed && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Completed
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/projects/${project.id}`}
                    className="text-sm font-medium"
                    style={{ color: accentColor }}
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            message="No projects yet"
            linkTo="/projects"
            linkText="Create a project"
            accentColor={accentColor}
          />
        )}
      </motion.div>
      */}
    </div>
  );
}

export default Dashboard;