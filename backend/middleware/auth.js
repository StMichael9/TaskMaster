import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url"; // Fixed 'auth' to 'from'

// Get directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Use a simple secret if environment variable is not available
const JWT_SECRET =
  process.env.JWT_SECRET || "fallback-secret-key-for-development";

// Add this for debugging
console.log(
  "Auth middleware using JWT_SECRET:",
  JWT_SECRET
    ? "Secret loaded (length: " + JWT_SECRET.length + ")"
    : "SECRET NOT FOUND!"
);

export const requireAuth = (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Extract the token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Authentication token required" });
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add the decoded user info to the request object
    req.auth = decoded;

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
