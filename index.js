const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('set name', (data) => {
    console.log('User name set:', data.name);
    socket.username = data.name;
    socket.emit('name set', { name: data.name });
  });

  socket.on('chat message', (data) => {
    data.status = 'sent';
    io.emit('chat message', data);
  });

  socket.on('message delivered', (data) => {
    data.status = 'delivered';
    io.emit('update status', data);
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
  console.log(`Server running at http://localhost:${PORT}`);
});
