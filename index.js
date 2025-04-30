const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

// Import Mongoose models
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const onlineUsers = {};

// ✅ Connect to MongoDB
mongoose.connect('mongodb+srv://sf_admin:Rss%401234567890@cluster0.vs2ktwe.mongodb.net/chatDB?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((error) => {
  console.error('❌ MongoDB connection error:', error);
});

// Serve static files
app.use('/style.css', express.static(path.join(__dirname, 'style.css')));
app.use('/SF_Home_Page.css', express.static(path.join(__dirname, 'SF_Home_Page.css')));
app.use('/client.js', express.static(path.join(__dirname, 'client.js')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'SF_Home_Page.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// === Socket.IO Chat Logic ===
io.on('connection', async (socket) => {
  console.log('🔌 A user connected');

  // 🕒 Send latest 50 messages from DB
  try {
    const messages = await Message.find().sort({ createdAt: -1 }).limit(50).lean();
    socket.emit('chat history', messages.reverse()); // reverse for oldest-first
  } catch (err) {
    console.error('❌ Error loading messages:', err);
  }

  // 🔐 User authentication (login)
  socket.on('set name', async (data) => {
    try {
      const user = await User.findOne({ username: data.name });
  
      if (!user || user.password !== data.password) {
        socket.emit('auth error', 'Invalid username or password.');
        return;
      }

      // ✅ Update online status
      user.online = true;
      await user.save();
  
      socket.username = user.username;
      onlineUsers[user.username] = socket.id;
  
      socket.emit('name set', { name: user.username });
      io.emit('userStatus', { user: user.username, status: 'online' });
  
    } catch (error) {
      console.error('❌ Auth error:', error);
      socket.emit('auth error', 'Server error.');
    }
  });
  

  // 💬 Handle message sending and saving
  socket.on('chat message', async (data) => {
    try {
      const msg = new Message({
        sender: data.sender,
        message: data.msg,
        time: data.time
      });
      await msg.save();
      io.emit('chat message', data);
    } catch (err) {
      console.error('❌ Error saving message:', err);
    }
  });

  socket.on('message seen', (data) => {
    data.status = 'seen';
    io.emit('update status', data);
  });

  socket.on('typing', (user) => {
    socket.broadcast.emit('typing', user);
  });

  socket.on('stopTyping', (user) => {
    socket.broadcast.emit('stopTyping', user);
  });

  socket.on('disconnect', async () => {
    if (socket.username) {
      try {
        // ✅ Update DB with offline status and last seen time
        const user = await User.findOne({ username: socket.username });
        if (user) {
          user.online = false;
          user.lastSeen = new Date();
          await user.save();
  
          // 🔴 Notify all clients with updated last seen
          io.emit('userStatus', {
            user: user.username,
            status: 'offline',
            lastSeen: user.lastSeen
          });
        }
  
        delete onlineUsers[socket.username];
      } catch (err) {
        console.error('❌ Error updating user status on disconnect:', err);
      }
    }
  
    console.log('🔌 A user disconnected');
  });
  
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
