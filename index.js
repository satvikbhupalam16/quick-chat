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
mongoose.connect('mongodb+srv://sf_admin:Rss%401234567890@cluster0.vs2ktwe.mongodb.net/chatDB?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((error) => console.error('❌ MongoDB connection error:', error));

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/style.css', express.static(path.join(__dirname, 'style.css')));
app.use('/SF_Home_Page.css', express.static(path.join(__dirname, 'SF_Home_Page.css')));
app.use('/client.js', express.static(path.join(__dirname, 'client.js')));
// Call features
app.use('/VoiceCall.css', express.static(path.join(__dirname, 'VoiceCall.css')));
app.use('/VoiceCall.js', express.static(path.join(__dirname, 'VoiceCall.js')));


// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'SF_Home_Page.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/VoiceCall.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'VoiceCall.html'));
});


// === Socket.IO Chat Logic ===
io.on('connection', (socket) => {
  console.log('🔌 A user connected');

  // 🔐 User authentication (login)
  socket.on('set name', async (data) => {
    try {
      const user = await User.findOne({ username: data.name });

      if (!user || user.password !== data.password) {
        socket.emit('auth error', 'Invalid username or password.');
        return;
      }

      // ✅ Update user online status
      user.online = true;
      await user.save();

      socket.username = user.username;
      onlineUsers[user.username] = socket.id;

      socket.emit('name set', { name: user.username });

      // ✅ Send filtered chat history (excluding user's deleted messages)
      const allMessages = await Message.find().sort({ createdAt: -1 }).lean();
      const deletedIds = (user.deletedMessages || []).map(id => id.toString());
      const filteredMessages = allMessages.filter(msg =>
        !deletedIds.includes(msg._id.toString())
      );
      socket.emit('chat history', filteredMessages.reverse());

      // ✅ Send other user's status
      const otherUser = await User.findOne({ username: { $ne: user.username } });
      if (otherUser) {
        socket.emit('otherUserStatus', {
          username: otherUser.username,
          online: otherUser.online,
          lastSeen: otherUser.lastSeen
        });
      }

      // ✅ Notify all clients this user is online
      io.emit('userStatus', { user: user.username, status: 'online' });

    } catch (error) {
      console.error('❌ Auth error:', error);
      socket.emit('auth error', 'Server error.');
    }
  });

  // 💬 Handle sending and saving messages
  socket.on('chat message', async (data) => {
    try {
      const msg = new Message({
        sender: data.sender,
        message: data.msg,
        time: data.time
      });
      await msg.save();
      // Add _id to message so it can be tracked for deletion
      data._id = msg._id;
      io.emit('chat message', data);
    } catch (err) {
      console.error('❌ Error saving message:', err);
    }
  });

  // 👁️ Handle message seen
  socket.on('message seen', (data) => {
    data.status = 'seen';
    io.emit('update status', data);
  });

  // 🟢 Typing indicators
  socket.on('typing', (user) => socket.broadcast.emit('typing', user));
  socket.on('stopTyping', (user) => socket.broadcast.emit('stopTyping', user));

  // 🧹 Handle "delete for me"
  socket.on('delete for me', async ({ username, messageId }) => {
    try {
      await User.updateOne(
        { username },
        { $addToSet: { deletedMessages: messageId } }
      );
      socket.emit('message removed', messageId);
    } catch (err) {
      console.error('❌ Failed to delete message for user:', err);
    }
  });

  // 🧹 Handle "delete for Everyone"
  socket.on('delete for everyone', async (messageId) => {
    try {
      await Message.deleteOne({ _id: messageId });
      io.emit('message removed', messageId); // broadcast to all
    } catch (err) {
      console.error('❌ Error deleting message from DB:', err);
    }
  });
  

  socket.on('clear history for me', async (username) => {
    try {
      const allMessageIds = await Message.find({}, '_id').lean();
      const ids = allMessageIds.map(msg => msg._id);
      await User.updateOne(
        { username },
        { $addToSet: { deletedMessages: { $each: ids } } }
      );
      socket.emit('all messages removed');
    } catch (err) {
      console.error('❌ Error clearing history for user:', err);
    }
  });
  
  socket.on('clear history for everyone', async () => {
    try {
      await Message.deleteMany({});
      io.emit('all messages removed');
    } catch (err) {
      console.error('❌ Error clearing history for all:', err);
    }
  });
  
  // 🔌 Handle disconnect
  socket.on('disconnect', async () => {
    if (socket.username) {
      try {
        const user = await User.findOne({ username: socket.username });
        if (user) {
          user.online = false;
          user.lastSeen = new Date();
          await user.save();

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
