export const up = async (queryInterface, Sequelize) => {
  try {
    // Check if the column already exists
    const tableInfo = await queryInterface.describeTable("Users");

    if (!tableInfo.name) {
      await queryInterface.addColumn("Users", "name", {
        type: Sequelize.STRING,
        allowNull: true,
      });

      // Update existing users to set name from username
      await queryInterface.sequelize.query(`
        UPDATE "Users" 
        SET name = SUBSTR(username, 1, INSTR(username, '@') - 1) 
        WHERE name IS NULL AND INSTR(username, '@') > 0
      `);
    }
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
};

export const down = async (queryInterface, Sequelize) => {
  try {
    await queryInterface.removeColumn("Users", "name");
  } catch (error) {
    console.error("Migration rollback error:", error);
    throw error;
  }
};

// Default export for compatibility
export default { up, down };
