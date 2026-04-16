const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, default: 'user' },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

module.exports = { User };
