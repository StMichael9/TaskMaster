import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import jwt from "jsonwebtoken"; // Add this import
import { Sequelize } from "sequelize";
import fs from "fs";
import express from "express";
import cors from "cors";
import { requireAuth } from "./middleware/auth.js";
import { loginUser, createUsers } from "./users.js";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  getProjectTasks,
} from "./Tasks.js";

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, ".env") });

// Log to verify it's loaded
console.log(
  "JWT_SECRET loaded:",
  process.env.JWT_SECRET
    ? "Yes (length: " + process.env.JWT_SECRET.length + ")"
    : "No"
);

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || "http://localhost:3000";

// Log the API URL for debugging
console.log(`API URL: ${API_URL}`);

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage:
    process.env.NODE_ENV === "production"
      ? "/tmp/database.sqlite"
      : path.join(__dirname, "database.sqlite"),
  logging: false,
});

// Authenticate and set up database
sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection has been established successfully.");
    console.log(
      "Database location:",
      process.env.NODE_ENV === "production"
        ? "/tmp/database.sqlite"
        : path.join(__dirname, "database.sqlite")
    );

    // In production, set up periodic database backups
    if (process.env.NODE_ENV === "production") {
      const backupDir = path.join(__dirname, "backups");
      try {
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir);
        }
      } catch (err) {
        console.error("Error creating backup directory:", err);
      }

      setInterval(async () => {
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const backupPath = path.join(backupDir, `backup-${timestamp}.sqlite`);
          fs.copyFileSync(
            process.env.NODE_ENV === "production"
              ? "/tmp/database.sqlite"
              : path.join(__dirname, "database.sqlite"),
            backupPath
          );
          console.log(`Database backed up to ${backupPath}`);
        } catch (err) {
          console.error("Database backup failed:", err);
        }
      }, 24 * 60 * 60 * 1000); // Once per day
    }
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

// Define models
const Project = sequelize.define("Project", {
  name: { type: Sequelize.STRING, allowNull: false },
  completed: { type: Sequelize.BOOLEAN, defaultValue: false },
  dueDate: { type: Sequelize.DATE, allowNull: true },
  priority: { type: Sequelize.STRING, defaultValue: "normal" },
  userId: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
  createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
});

const Note = sequelize.define("Note", {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  text: { type: Sequelize.TEXT, allowNull: false },
  color: { type: Sequelize.STRING, defaultValue: "#f8e16c" },
  rotation: { type: Sequelize.FLOAT, defaultValue: 0 },
  pinned: { type: Sequelize.BOOLEAN, defaultValue: false },
  userId: { type: Sequelize.INTEGER, allowNull: false },
  font: { type: Sequelize.STRING, defaultValue: "Caveat" },
  textColor: { type: Sequelize.STRING, defaultValue: "#000000" },
  createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
});

const Task = sequelize.define("Task", {
  title: { type: Sequelize.STRING, allowNull: false },
  description: { type: Sequelize.TEXT, allowNull: true },
  completed: { type: Sequelize.BOOLEAN, defaultValue: false },
  dueDate: { type: Sequelize.DATE, allowNull: true },
  priority: { type: Sequelize.STRING, defaultValue: "normal" },
  projectId: { type: Sequelize.INTEGER, allowNull: true },
  userId: { type: Sequelize.INTEGER, allowNull: false },
  createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
});

// Sync the models with the database
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Database synchronized successfully with alterations");
  })
  .catch((err) => {
    console.error("Error synchronizing database:", err);
  });

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? [
        "https://task-master-teal-eta.vercel.app",
        "http://localhost:5173",
        "https://task-master-pkmojnn37-stmichael9s-projects.vercel.app",
        "https://task-master-m333.vercel.app",
      ]
    : "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json()); // Add this to parse JSON bodies

// Add this to handle OPTIONS requests explicitly
app.options("*", cors());

// Home endpoint
app.get("/", (req, res) => {
  res.json({
    message: "TaskMaster API is running",
    status: "online",
  });
});

// Token refresh endpoint - UPDATED
app.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Check if it's actually a refresh token
    if (decoded.type !== "refresh") {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // Log the user ID from the refresh token for debugging
    console.log(`Refreshing token for user ID: ${decoded.userId}`);

    // Generate a new access token with the SAME user ID
    const newToken = jwt.sign(
      {
        id: decoded.userId,
        username: decoded.username,
        isAdmin: decoded.isAdmin || false,
        isPremium: decoded.isPremium || false,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Also generate a new refresh token to extend the session
    const newRefreshToken = jwt.sign(
      {
        userId: decoded.userId,
        username: decoded.username,
        type: "refresh",
        isAdmin: decoded.isAdmin || false,
        isPremium: decoded.isPremium || false,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token: newToken,
      refreshToken: newRefreshToken,
      user: {
        id: decoded.userId,
        username: decoded.username,
        isAdmin: decoded.isAdmin || false,
        isPremium: decoded.isPremium || false,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// NEW: Add token verification endpoint
app.get("/verify-token", requireAuth, async (req, res) => {
  try {
    // If we get here, the token is valid (requireAuth middleware passed)
    const userId = req.auth.id;

    // Return the user information
    res.json({
      authenticated: true,
      user: {
        id: req.auth.id,
        username: req.auth.username,
        isAdmin: req.auth.isAdmin || false,
        isPremium: req.auth.isPremium || false,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({
      authenticated: false,
      error: "Invalid or expired token",
    });
  }
});

// User authentication routes - UPDATED
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await loginUser({ username, password });

    // Log the user ID for debugging
    console.log(`User logged in with ID: ${result.user.id}`);

    res.json(result);
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ error: error.message });
  }
});

// Signup endpoint
app.post("/signup", async (req, res) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const user = await createUsers({ username, password, name });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(400).json({ error: error.message });
  }
});

// Task routes
app.post("/tasks", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const taskData = { ...req.body, userId };
    const result = await createTask(taskData);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/tasks", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const tasks = await getTasks(userId);
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/tasks/:taskId", requireAuth, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.auth.id;
    const updates = req.body;
    const result = await updateTask(taskId, userId, updates);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/tasks/:taskId", requireAuth, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.auth.id;

    const result = await deleteTask(taskId, userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Project routes
app.post("/projects", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const projectData = { ...req.body, userId }; // Add userId to project data
    const project = await Project.create(projectData);
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(400).json({ error: error.message });
  }
});

app.get("/projects", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const projects = await Project.findAll({
      where: { userId }, // Only get projects for this user
      order: [["createdAt", "DESC"]],
    });
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(400).json({ error: error.message });
  }
});

app.put("/projects/:projectId", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;

    // First check if the project belongs to this user
    const project = await Project.findOne({
      where: {
        id: req.params.projectId,
        userId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Update the project (keeping the userId the same)
    const updatedData = { ...req.body, userId }; // Ensure userId doesn't change
    await project.update(updatedData);

    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(400).json({ error: error.message });
  }
});

app.delete("/projects/:projectId", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;

    const deleted = await Project.destroy({
      where: {
        id: req.params.projectId,
        userId, // Only delete if it belongs to this user
      },
    });

    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: "Project not found" });
    }
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get tasks for a specific project
app.get("/projects/:projectId/tasks", requireAuth, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.auth.id;
    const tasks = await getProjectTasks(projectId, userId);
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Notes API endpoints
app.get("/notes", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const notes = await Note.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });
    res.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/notes", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const noteData = { ...req.body, userId };
    const note = await Note.create(noteData);
    res.status(201).json(note);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(400).json({ error: error.message });
  }
});

app.put("/notes/:noteId", requireAuth, async (req, res) => {
  try {
    const noteId = req.params.noteId;
    const userId = req.auth.id;

    // Find the note
    const note = await Note.findOne({
      where: { id: noteId, userId },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    // Update the note
    await note.update(req.body);
    res.json(note);
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(400).json({ error: error.message });
  }
});

app.delete("/notes/:noteId", requireAuth, async (req, res) => {
  try {
    const noteId = req.params.noteId;
    const userId = req.auth.id;

    // Delete the note
    const deleted = await Note.destroy({
      where: { id: noteId, userId },
    });

    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: "Note not found" });
    }
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(400).json({ error: error.message });
  }
});

// Backup notes endpoint - allows clients to backup all their notes
// Improve the notes backup endpoint to handle merging better

app.post("/notes/backup", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const { notes } = req.body;

    if (!Array.isArray(notes)) {
      return res.status(400).json({ error: "Notes must be an array" });
    }

    console.log(`Backing up ${notes.length} notes for user ${userId}`);

    // Process each note individually for better control
    const results = [];

    for (const note of notes) {
      // Add userId to the note
      const noteWithUserId = { ...note, userId };

      // Remove any client-side flags
      delete noteWithUserId._isOptimistic;

      // Check if this note already exists by ID
      let existingNote = null;

      if (note.id) {
        existingNote = await Note.findOne({
          where: {
            id: note.id,
            userId,
          },
        });
      }

      // If no exact ID match, try to find by content
      if (!existingNote) {
        existingNote = await Note.findOne({
          where: {
            text: note.text,
            userId,
            color: note.color,
            font: note.font,
          },
        });
      }

      if (existingNote) {
        // Update existing note, preserving server ID
        await existingNote.update({
          ...noteWithUserId,
          id: existingNote.id, // Ensure we keep the server ID
        });

        results.push({
          status: "updated",
          id: existingNote.id,
          clientId: note.id, // Return the client ID for mapping
        });
      } else {
        // Create new note
        const newNote = await Note.create(noteWithUserId);

        results.push({
          status: "created",
          id: newNote.id,
          clientId: note.id, // Return the client ID for mapping
        });
      }
    }

    res.status(201).json({
      message: "Notes backed up successfully",
      results,
    });
  } catch (error) {
    console.error("Error backing up notes:", error);
    res.status(400).json({ error: error.message });
  }
});

// Restore notes from a specific date
app.get("/notes/restore", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const { since } = req.query;

    let whereClause = { userId };

    // If 'since' parameter is provided, only get notes created after that date
    if (since) {
      whereClause.createdAt = {
        [Sequelize.Op.gte]: new Date(since),
      };
    }

    const notes = await Note.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      message: "Notes retrieved successfully",
      count: notes.length,
      notes,
    });
  } catch (error) {
    console.error("Error restoring notes:", error);
    res.status(400).json({ error: error.message });
  }
});

// Add a similar backup system for tasks
app.post("/tasks/backup", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const { tasks } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: "Tasks must be an array" });
    }

    console.log(`Backing up ${tasks.length} tasks for user ${userId}`);

    // Process each task - this will need to be adapted to your Task model structure
    const results = [];
    for (const task of tasks) {
      // Add userId to the task
      const taskWithUserId = { ...task, userId };

      // Check if task already exists (by title or some unique identifier)
      // This depends on your Task model structure
      const existingTask = await sequelize.models.Task.findOne({
        where: {
          title: task.title,
          userId,
        },
      });

      if (!existingTask) {
        // Create new task if it doesn't exist
        const newTask = await sequelize.models.Task.create(taskWithUserId);
        results.push({ status: "created", id: newTask.id });
      } else {
        // Update existing task
        await existingTask.update(taskWithUserId);
        results.push({ status: "updated", id: existingTask.id });
      }
    }

    res.status(201).json({
      message: "Tasks backed up successfully",
      results,
    });
  } catch (error) {
    console.error("Error backing up tasks:", error);
    res.status(400).json({ error: error.message });
  }
});

// Protected route example
app.get("/protected-route", requireAuth, (req, res) => {
  // Access authenticated user info with req.auth
  console.log(`User ${req.auth.username} accessed this route`);
  res.json({ message: "You're authenticated!" });
});

// Add a route to expose the API URL to clients
app.get("/api-config", (req, res) => {
  res.json({
    apiUrl: API_URL,
    environment: process.env.NODE_ENV || "development",
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at ${API_URL}`);
});