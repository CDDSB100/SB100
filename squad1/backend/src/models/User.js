const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, default: 'cientometria' },
  is_active: { type: Boolean, default: true },
  allowed_categories: { type: [String], default: [] },
}, { 
  timestamps: true 
});

const User = mongoose.model('User', userSchema);

module.exports = { User };
