const { initDb, pool } = require("./src/services/database.js");

async function test() {
  try {
    await initDb();
    console.log("Database initialized.");
    const [rows] = await pool.execute("SELECT * FROM users");
    console.log("Users in database:", rows);
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    process.exit();
  }
}

test();
