import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { expressjwt as expressJwt } from "express-jwt";
import { Sequelize, DataTypes } from "sequelize";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from .env file
dotenv.config();

// Add a fallback value for JWT_SECRET
const JWT_SECRET =
  process.env.JWT_SECRET || "your_fallback_secret_key_for_development";

// Add this for debugging
console.log(
  "Users module using JWT_SECRET:",
  JWT_SECRET
    ? "Secret loaded (length: " + JWT_SECRET.length + ")"
    : "SECRET NOT FOUND!"
);

// Get directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: path.join(__dirname, "database.sqlite"),
  logging: false, // Set to console.log to see SQL queries
});

// Define User model
const User = sequelize.define("User", {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true, // Make it optional
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isPremium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

// Sync the model with the database
(async () => {
  try {
    // Use alter: true to modify existing tables
    await sequelize.sync({ alter: true });
    console.log("Database synchronized successfully with alterations");
    
    // Update existing admin users to be premium
    await updateAdminsToPremium();
  } catch (error) {
    console.error("Error synchronizing database:", error);
  }
})();

// Function to update all admin users to premium
async function updateAdminsToPremium() {
  try {
    // Find all admin users that are not premium
    const adminUsers = await User.findAll({
      where: {
        isAdmin: true,
        isPremium: false
      }
    });
    
    if (adminUsers.length > 0) {
      console.log(`Found ${adminUsers.length} admin users to upgrade to premium`);
      
      // Update each admin user to be premium
      for (const user of adminUsers) {
        await user.update({ isPremium: true });
        console.log(`Upgraded user ${user.username} to premium status`);
      }
    } else {
      console.log("No admin users need to be upgraded to premium");
    }
  } catch (error) {
    console.error("Error updating admin users to premium:", error);
  }
}

export const createUsers = async ({ username, password, name }) => {
  try {
    const adminEmails = [
      "michaelegenamba@gmail.com",
      "stmichaelegenamba@gmail.com",
      "victoriaegenamba@gmail.com",
      "Victoriaegenamba@gmail.com",
    ];
    const hashedPassword = await bcrypt.hash(password, 10);
    const isAdmin = adminEmails.includes(username);

    // Check if user already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      throw new Error("Username already exists");
    }

    // Create new user using Sequelize with name field
    const user = await User.create({
      username,
      password: hashedPassword,
      name: name || username.split("@")[0], // Use provided name or extract from email
      isAdmin,
      isPremium: isAdmin, // Set isPremium to true if user is admin
    });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      isAdmin: user.isAdmin,
      isPremium: user.isPremium,
    };
  } catch (error) {
    throw new Error(`Error creating user: ${error.message}`);
  }
};

export const loginUser = async ({ username, password }) => {
  try {
    // Use Sequelize's where clause syntax
    const user = await User.findOne({ where: { username } });
    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    // Create access token with shorter expiration
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        isPremium: user.isPremium,
      },
      JWT_SECRET,
      {
        expiresIn: "1h", // Short-lived token
      }
    );

    // Create a refresh token with longer expiration
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: "refresh",
      },
      JWT_SECRET,
      {
        expiresIn: "7d", // 7 days for refresh token
      }
    );

    console.log("Login successful");
    return {
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        isPremium: user.isPremium,
      },
      token,
      refreshToken,
    };
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
};

export const requireAuth = expressJwt({
  secret: JWT_SECRET,
  algorithms: ["HS256"],
  requestProperty: "auth",
  getToken: (req) => {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      return req.headers.authorization.split(" ")[1];
    }
    return null;
  },
});

// Export User model for use in other files
export { User };