const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  time: String,
  reply: {
    _id: String,               // 💡 include this
    sender: String,
    message: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', MessageSchema);
