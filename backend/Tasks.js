import { Sequelize, DataTypes } from 'sequelize';

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite', // SQLite file location
  logging: false // Set to console.log to see SQL queries
});

// Define User model first since it's referenced by other models
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isPremium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Define Task model
const Task = sequelize.define('Task', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'medium'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'personal'
  }
});

// Define Project model
const Project = sequelize.define('Project', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

// Define Notes model
const Notes = sequelize.define('Notes', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'general'
  }
});

// Create associations
Task.belongsTo(User);
User.hasMany(Task);

Project.belongsTo(User);
User.hasMany(Project);

// Add association between Project and Task
Project.hasMany(Task);
Task.belongsTo(Project);

Notes.belongsTo(User);
User.hasMany(Notes);

export const createTask = async ({ title, description, priority, dueDate, category, userId, projectId }) => {
  try {
    // Validate required fields
    if (!title) {
      throw new Error("Task title is required");
    }
    
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    // Create a new task associated with the user
    const task = await Task.create({
      title,
      description,
      priority: priority || 'medium',
      dueDate: dueDate || null,
      category: category || 'personal',
      UserId: userId, // This associates the task with a specific user
      ProjectId: projectId || null // Optional project association
    });
    
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.completed,
      priority: task.priority,
      dueDate: task.dueDate,
      category: task.category,
      userId: task.UserId,
      projectId: task.ProjectId,
      createdAt: task.createdAt
    };
  } catch (error) {
    throw new Error(`Error creating task: ${error.message}`);
  }
};

// Get all tasks for a user
export const getTasks = async (userId) => {
  try {
    const tasks = await Task.findAll({
      where: { UserId: userId },
      order: [['createdAt', 'DESC']]
    });
    
    return tasks;
  } catch (error) {
    throw new Error(`Error fetching tasks: ${error.message}`);
  }
};

// Get tasks for a specific project
export const getProjectTasks = async (projectId, userId) => {
  try {
    const tasks = await Task.findAll({
      where: { 
        ProjectId: projectId,
        UserId: userId 
      },
      order: [['createdAt', 'DESC']]
    });
    
    return tasks;
  } catch (error) {
    throw new Error(`Error fetching project tasks: ${error.message}`);
  }
};

// Update a task
export const updateTask = async (taskId, userId, updates) => {
  try {
    const task = await Task.findOne({
      where: {
        id: taskId,
        UserId: userId
      }
    });
    
    if (!task) {
      throw new Error("Task not found");
    }
    
    await task.update(updates);
    return { success: true, task };
  } catch (error) {
    throw new Error(`Error updating task: ${error.message}`);
  }
};

export const deleteTask = async (taskId, userId) => {
   try {
    console.log(`Attempting to delete task with ID: ${taskId} for user: ${userId}`);
    
    const task = await Task.findOne({
        where: {
            id: taskId, 
            UserId: userId  // Fixed: userID -> UserId (matching your model definition)
        }
    });
    
    if (!task) {
        console.log(`Task not found with ID: ${taskId} for user: ${userId}`);
        throw new Error("Task not found");
    }
    
    console.log(`Found task: ${JSON.stringify(task)}`);
    
    // Delete the task
    await task.destroy();
    console.log(`Task ${taskId} deleted successfully`);

    return { success: true, message: "Task deleted successfully" };
   } catch (error) {
     console.error(`Error in deleteTask: ${error.message}`);
     throw new Error(`Error deleting task: ${error.message}`);
   }
};

export const createProject = async ({name, description, status, dueDate, userId}) => {
  try {
    // Validate required fields
    if (!name) {
      throw new Error("Project name is required");
    }
    
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    // Create a new project associated with the user
    const project = await Project.create({
      name,
      description,
      status: status || 'active',
      dueDate: dueDate || null,
      UserId: userId // This associates the project with a specific user
    }); 
    
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      dueDate: project.dueDate,
      userId: project.UserId,
      createdAt: project.createdAt
    };
  } catch (error) {
    throw new Error(`Error creating project: ${error.message}`);
  }
};

// Get all projects for a user
export const getProjects = async (userId) => {
  try {
    const projects = await Project.findAll({
      where: { UserId: userId },
      order: [['createdAt', 'DESC']]
    });
    
    return projects;
  } catch (error) {
    throw new Error(`Error fetching projects: ${error.message}`);
  }
};

// Update a project
export const updateProject = async (projectId, userId, updates) => {
  try {
    const project = await Project.findOne({
      where: {
        id: projectId,
        UserId: userId
      }
    });
    
    if (!project) {
      throw new Error("Project not found");
    }
    
    await project.update(updates);
    return { success: true, project };
  } catch (error) {
    throw new Error(`Error updating project: ${error.message}`);
  }
};

export const deleteProject = async (projectId, userId) => {
  try {
    const project = await Project.findOne({
      where: {
        id: projectId, 
        UserId: userId
      }
    });
    
    if (!project) {
      throw new Error("Project not found");
    }
    
    // First, delete or reassign all tasks associated with this project
    await Task.update(
      { ProjectId: null },
      { where: { ProjectId: projectId } }
    );
    
    // Delete the project
    await project.destroy();

    return { success: true, message: "Project deleted successfully" };
  } catch (error) {
    throw new Error(`Error deleting project: ${error.message}`);
  }
};

export const createNotes = async ({title, content, category, userId}) => {
    try {
        // Validate required fields
        if (!title) {
        throw new Error("Notes title is required");
        }
        
        if (!userId) {
        throw new Error("User ID is required");
        }
        
        // Create a new note associated with the user
        const notes = await Notes.create({
        title,
        content,
        category: category || 'general',
        UserId: userId // This associates the note with a specific user
        });
        
        return {
        id: notes.id,
        title: notes.title,
        content: notes.content,
        category: notes.category,
        userId: notes.UserId,
        createdAt: notes.createdAt
        };
    } catch (error) {
        throw new Error(`Error creating note: ${error.message}`);
    }
};

// Get all notes for a user
export const getNotes = async (userId) => {
  try {
    const notes = await Notes.findAll({
      where: { UserId: userId },
      order: [['createdAt', 'DESC']]
    });
    
    return notes;
  } catch (error) {
    throw new Error(`Error fetching notes: ${error.message}`);
  }
};

// Update a note
export const updateNote = async (noteId, userId, updates) => {
  try {
    const note = await Notes.findOne({
      where: {
        id: noteId,
        UserId: userId
      }
    });
    
    if (!note) {
      throw new Error("Note not found");
    }
    
    await note.update(updates);
    return { success: true, note };
  } catch (error) {
    throw new Error(`Error updating note: ${error.message}`);
  }
};

// Delete a note
export const deleteNote = async (noteId, userId) => {
  try {
    const note = await Notes.findOne({
      where: {
        id: noteId, 
        UserId: userId
      }
    });
    
    if (!note) {
      throw new Error("Note not found");
    }
    
    // Delete the note
    await note.destroy();

    return { success: true, message: "Note deleted successfully" };
  } catch (error) {
    throw new Error(`Error deleting note: ${error.message}`);
  }
};
