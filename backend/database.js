import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a connection to SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'), // Database file will be created here
  logging: false // Set to console.log to see SQL queries
});

// Test the connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('SQLite connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to SQLite database:', error);
  }
}

testConnection();

export default sequelize;