const jwt = require("jsonwebtoken");
const axios = require("axios");

const JWT_SECRET = "sua-chave-secreta-super-dificil-de-adivinhar";
const userPayload = { username: "admin", id: "1", role: "admin" };
const token = jwt.sign(userPayload, JWT_SECRET);

async function hit() {
  try {
    console.log("Hitting /api/curation with mock admin token...");
    const res = await axios.get("http://localhost:5001/api/curation", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Success!");
    console.log(`Status: ${res.status}`);
    console.log(`Body length: ${JSON.stringify(res.data).length}`);
  } catch (err) {
    console.error("Failed!");
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error("Body:", err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

hit();
