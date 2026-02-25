const { pool } = require("./src/services/database.js");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const JWT_SECRET = "sua-chave-secreta-super-dificil-de-adivinhar";

async function run() {
  try {
    console.log("Creating test user with allowed_categories...");
    await pool.execute(
      "INSERT OR REPLACE INTO users (id, username, email, password_hash, role, allowed_categories) VALUES (2, 'test_user', 'test@example.com', 'hash', 'cientometria', ?)",
      [JSON.stringify(["BIOINSUMOS"])]
    );

    const userPayload = { username: "test_user", id: "2", role: "cientometria" };
    const token = jwt.sign(userPayload, JWT_SECRET);

    console.log("Hitting /api/curation with test_user token...");
    const res = await axios.get("http://localhost:5001/api/curation", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Success!");
    console.log(`Status: ${res.status}`);
    console.log(`Articles returned: ${res.data.length}`);
  } catch (err) {
    console.error("Failed!");
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error("Body:", err.response.data);
    } else {
      console.error(err.message);
    }
  } finally {
    process.exit();
  }
}

run();
