import React, { useState, useEffect } from "react";

function Calendar({ tasks, accentColor }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayTasks, setDayTasks] = useState([]);
  const [hoveredDay, setHoveredDay] = useState(null);

  useEffect(() => {
    generateCalendarDays(currentDate, tasks || []);
  }, [currentDate, tasks]);

  // Calendar helper functions
  const generateCalendarDays = (date, taskList) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysFromPrevMonth = firstDayOfWeek;
    const totalDays = daysFromPrevMonth + lastDay.getDate();
    const rows = Math.ceil(totalDays / 7);
    const days = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (
      let i = prevMonthLastDay - daysFromPrevMonth + 1;
      i <= prevMonthLastDay;
      i++
    ) {
      const currentDate = new Date(year, month - 1, i);
      const dateString = currentDate.toISOString().split("T")[0];
      const dayTasks = taskList.filter(
        (task) => task.dueDate && task.dueDate.startsWith(dateString)
      );

      days.push({
        date: currentDate,
        isCurrentMonth: false,
        hasTask: dayTasks.length > 0,
        tasks: dayTasks,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const currentDate = new Date(year, month, i);
      const dateString = currentDate.toISOString().split("T")[0];
      const dayTasks = taskList.filter(
        (task) => task.dueDate && task.dueDate.startsWith(dateString)
      );

      days.push({
        date: currentDate,
        isCurrentMonth: true,
        hasTask: dayTasks.length > 0,
        tasks: dayTasks,
      });
    }

    // Next month days
    const remainingDays = rows * 7 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const currentDate = new Date(year, month + 1, i);
      const dateString = currentDate.toISOString().split("T")[0];
      const dayTasks = taskList.filter(
        (task) => task.dueDate && task.dueDate.startsWith(dateString)
      );

      days.push({
        date: currentDate,
        isCurrentMonth: false,
        hasTask: dayTasks.length > 0,
        tasks: dayTasks,
      });
    }

    setCalendarDays(days);
  };

  // Helper function to get task title (handles both title and text properties)
  const getTaskTitle = (task) => {
    if (!task) return "";
    return task.title || task.text || "Untitled Task";
  };

  const getDayTasks = (date) => {
    const dateString = date.toISOString().split("T")[0];
    return (tasks || []).filter(
      (task) => task.dueDate && task.dueDate.startsWith(dateString)
    );
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setDayTasks(day.tasks || []);
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {formatMonthYear(currentDate)}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
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
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day names */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => (
            <div
              key={index}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              className={`
                p-2 text-center text-sm cursor-pointer relative group
                ${
                  day.isCurrentMonth
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 dark:text-gray-500"
                }
                ${
                  isToday(day.date)
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }
                ${
                  selectedDay?.date.toDateString() === day.date.toDateString()
                    ? "ring-2"
                    : ""
                }
              `}
              style={{
                ringColor:
                  selectedDay?.date.toDateString() === day.date.toDateString()
                    ? accentColor
                    : "",
                minHeight: "40px",
              }}
            >
              <div className="flex flex-col h-full">
                <div className="mb-1">{day.date.getDate()}</div>
                {day.hasTask && (
                  <div className="flex flex-col space-y-1 mt-auto">
                    {day.tasks.slice(0, 2).map((task, i) => (
                      <div
                        key={i}
                        className="text-xs truncate text-left"
                        style={{ color: accentColor }}
                      >
                        {getTaskTitle(task).length > 8
                          ? getTaskTitle(task).substring(0, 8) + "..."
                          : getTaskTitle(task)}
                      </div>
                    ))}
                    {day.tasks.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{day.tasks.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Task tooltip on hover */}
              {hoveredDay === day && day.hasTask && day.tasks.length > 0 && (
                <div className="absolute z-10 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 w-48 left-1/2 transform -translate-x-1/2 mt-1 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    {day.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <ul className="space-y-1">
                    {day.tasks.map((task, i) => (
                      <li key={i} className="text-xs flex items-center">
                        <span
                          className="w-2 h-2 rounded-full mr-1 flex-shrink-0"
                          style={{
                            backgroundColor:
                              task.priority === "high"
                                ? "#EF4444"
                                : task.priority === "medium"
                                ? "#F59E0B"
                                : "#10B981",
                          }}
                        ></span>
                        <span className="truncate">{getTaskTitle(task)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected day tasks */}
      {selectedDay && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {selectedDay.date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h4>
          {dayTasks.length > 0 ? (
            <ul className="space-y-2">
              {dayTasks.map((task) => (
                <li
                  key={task.id}
                  className="text-sm text-gray-700 dark:text-gray-300 flex items-center"
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{
                      backgroundColor:
                        task.priority === "high"
                          ? "#EF4444"
                          : task.priority === "medium"
                          ? "#F59E0B"
                          : "#10B981",
                    }}
                  ></span>
                  {getTaskTitle(task)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No tasks for this day
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Calendar;