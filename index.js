const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static assets only (not full HTML pages)
app.use('/assets', express.static(path.join(__dirname, 'assets'))); // optional if you have images/css/js folders

// Serve CSS and JS manually
app.use('/style.css', express.static(path.join(__dirname, 'style.css')));
app.use('/SF_Home_Page.css', express.static(path.join(__dirname, 'SF_Home_Page.css')));
app.use('/client.js', express.static(path.join(__dirname, 'client.js')));

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'SF_Home_Page.html'));
});

// Chat page
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket logic
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('set name', (data) => {
    socket.username = data.name;
    socket.emit('name set', { name: data.name });
  });

  socket.on('chat message', (data) => {
    data.status = 'sent';
    io.emit('chat message', data);
  });

  socket.on('message seen', (data) => {
    data.status = 'seen';
    io.emit('update status', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
