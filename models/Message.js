const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  time: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', MessageSchema);
