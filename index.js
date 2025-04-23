const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const chatHistory = [];
const onlineUsers = {};

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

io.on('connection', (socket) => {
  console.log('A user connected');

  // Send chat history to new user
  socket.emit('chat history', chatHistory);

  socket.on('set name', (data) => {
    socket.username = data.name;
    onlineUsers[socket.username] = socket.id;

    socket.emit('name set', { name: data.name });
    io.emit('userStatus', { user: data.name, status: 'online' });
  });

  socket.on('chat message', (data) => {
    data.status = 'sent';
    chatHistory.push(data);
    io.emit('chat message', data);
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

  socket.on('disconnect', () => {
    if (socket.username) {
      delete onlineUsers[socket.username];
      io.emit('userStatus', { user: socket.username, status: 'offline' });
    }
    console.log('A user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
