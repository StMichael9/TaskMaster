import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createMigration() {
  try {
    // Get migration name from command line
    const name = process.argv[2];
    if (!name) {
      console.error("Please provide a migration name");
      process.exit(1);
    }

    // Create timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .substring(0, 14);
    const fileName = `${timestamp}-${name}.js`;
    const filePath = path.join(__dirname, "migrations", fileName);

    // Migration template
    const template = `// Using ES Module syntax
export const up = async (queryInterface, Sequelize) => {
  // Add your migration code here
};

export const down = async (queryInterface, Sequelize) => {
  // Add your rollback code here
};

// Default export for compatibility
export default { up, down };
`;

    // Write the file
    await fs.writeFile(filePath, template);
    console.log(`Migration created: ${fileName}`);
  } catch (error) {
    console.error("Failed to create migration:", error);
  }
}

createMigration();
