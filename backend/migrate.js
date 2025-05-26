import { Umzug, SequelizeStorage } from "umzug";
import { fileURLToPath } from "url";
import path from "path";
import { Sequelize } from "sequelize";

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Sequelize with your database config
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: path.join(__dirname, "database.sqlite"),
  logging: false,
});

// Configure Umzug to use Sequelize
const umzug = new Umzug({
  migrations: {
    // Path to your migrations directory
    glob: path.join(__dirname, "migrations/*.js"),
    resolve: ({ name, path, context }) => {
      // Import the migration file as an ES module
      return import(`file://${path}`).then((module) => {
        return {
          name,
          up: async () => module.up(context, Sequelize),
          down: async () => module.down(context, Sequelize),
        };
      });
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

// Command line interface for migrations
const cmd = process.argv[2]?.toLowerCase();

async function handleCommand() {
  try {
    if (cmd === "up" || cmd === "migrate") {
      await umzug.up();
      console.log("All migrations executed successfully");
    } else if (cmd === "down" || cmd === "rollback") {
      await umzug.down();
      console.log("Last migration reverted successfully");
    } else if (cmd === "pending") {
      const pending = await umzug.pending();
      console.log(
        "Pending migrations:",
        pending.map((m) => m.name)
      );
    } else if (cmd === "executed") {
      const executed = await umzug.executed();
      console.log(
        "Executed migrations:",
        executed.map((m) => m.name)
      );
    } else {
      console.log("Invalid command. Use: up, down, pending, or executed");
    }
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sequelize.close();
  }
}

handleCommand();
