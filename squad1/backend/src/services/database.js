const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const { User } = require("../models/User");

const saltRounds = 10;

const initDb = async () => {
  console.log("Initializing MongoDB administrative data...");

  // Admin user details from environment or defaults
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "password123";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminRole = "admin";

  try {
    const existingAdmin = await User.findOne({ username: adminUsername });

    if (!existingAdmin) {
      console.log(`Admin user '${adminUsername}' not found, creating...`);
      const hash = await bcrypt.hash(adminPassword, saltRounds);
      
      const newAdmin = new User({
        username: adminUsername,
        email: adminEmail,
        password_hash: hash,
        role: adminRole,
        is_active: true
      });

      await newAdmin.save();
      console.log(`Admin user '${adminUsername}' created successfully.`);
    } else {
      console.log(`Admin user '${adminUsername}' already exists.`);
    }
  } catch (err) {
    console.error("Error initializing admin user in MongoDB:", err.message);
  }
};

// Manteve-se o nome por compatibilidade se algum arquivo ainda importar
const pool = {
    execute: async () => {
        console.warn("⚠️ Chamada legada ao 'pool.execute' detectada. Migre para Mongoose.");
        return [[]];
    }
};

module.exports = { pool, initDb, saltRounds };
