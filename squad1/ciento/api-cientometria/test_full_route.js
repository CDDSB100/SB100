const { getCuratedArticles } = require("./src/services/api_logic.js");
const { pool } = require("./src/services/database.js");

async function test() {
  try {
    // 1. Simulate authentication
    const userId = 1; 
    console.log(`Simulating auth for user ID: ${userId}`);
    const [rows] = await pool.execute("SELECT id, username, role, allowed_categories FROM users WHERE id = ?", [userId]);
    
    if (rows.length === 0) {
      throw new Error("User not found in DB");
    }
    const user = rows[0];
    console.log("User authenticated:", user.username);

    // 2. Simulate route logic
    console.log("Fetching curated articles...");
    let articles = await getCuratedArticles();
    console.log(`Fetched ${articles.length} articles.`);
    
    if (user.role !== 'admin' && user.allowed_categories) {
      console.log("Filtering articles...");
      // ... same logic as server.js
    }
    
    console.log("Success! Route would have returned JSON.");
  } catch (err) {
    console.error("Crash detected in simulated route!");
    console.error(err.message);
    console.error(err.stack);
  } finally {
    process.exit();
  }
}

test();
