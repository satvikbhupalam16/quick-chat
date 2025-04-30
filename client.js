const socket = io();
let userName = '';

// === Secret Code Flow ===
document.getElementById('submit-code').addEventListener('click', () => {
  const secretCode = document.getElementById('secret-code').value.trim();
  if (secretCode === "RSS") {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('name-container').style.display = 'block';
  } else {
    alert("Incorrect secret code. Try again.");
  }
});

// === Login Validation (Username + Password) ===
document.getElementById('submit-login').addEventListener('click', () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  userName = username;
  socket.emit('set name', { name: username, password });

  socket.on('name set', (data) => {
    document.getElementById('name-container').style.display = 'none';
    document.getElementById('chat').style.display = 'flex';
  });

  socket.on('auth error', (msg) => {
    alert(msg);
  });
}); // ✅ FIXED: Closing this block properly

// === Toggle Password Visibility ===
document.getElementById('toggle-password').addEventListener('click', () => {
  const passwordInput = document.getElementById('password');
  const icon = document.querySelector('#toggle-password i');

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  } else {
    passwordInput.type = 'password';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  }
});

// === Send Message ===
document.getElementById('send-btn').addEventListener('click', () => {
  const msgInput = document.getElementById('message');
  const msg = msgInput.value.trim();
  if (msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    socket.emit('chat message', { sender: userName, msg, time });
    msgInput.value = '';
    socket.emit('stopTyping', userName);
  }
});

// === Typing Event ===
const msgInput = document.getElementById('message');
msgInput.addEventListener('input', () => {
  if (msgInput.value.trim()) {
    socket.emit('typing', userName);
  } else {
    socket.emit('stopTyping', userName);
  }
});

// === Clear Chat ===
document.getElementById('clear-btn').addEventListener('click', () => {
  document.getElementById('messages').innerHTML = '';
});

// === Back to Home ===
document.getElementById('back-btn').addEventListener('click', () => {
  window.location.href = 'https://quick-chat-fumk.onrender.com/';
});

// === Add Message to DOM ===
function addMessageToDOM(data) {
  const isUser = data.sender === userName;
  const message = document.createElement('div');
  message.classList.add('message', isUser ? 'user' : 'friend');

  const timeDisplay = `<div class="timestamp">${data.time}</div>`;

  message.innerHTML = `
    ${!isUser ? `<strong>${data.sender}:</strong>` : ''}
    ${data.msg}
    ${timeDisplay}
  `;

  document.getElementById('messages').prepend(message);
  document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

// === Typing Indicator ===
socket.on('typing', (user) => {
  if (user !== userName) {
    document.getElementById('typing-indicator').textContent = `${user} is typing...`;
    document.getElementById('typing-indicator').style.display = 'block';
  }
});

socket.on('stopTyping', (user) => {
  if (user !== userName) {
    document.getElementById('typing-indicator').style.display = 'none';
  }
});

// === Online Status Indicator ===
socket.on('userStatus', ({ user, status, lastSeen }) => {
  if (user !== userName) {
    const icon = user === 'Dog' ? '🐶' : '🐷';
    const displayStatus = status === 'online'
      ? '🟢 Online'
      : `🔴 Last seen: ${new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    document.getElementById('status-display').innerHTML = `
      ${icon} ${user}<br>
      ${displayStatus}
    `;
  }
});


// === Message History ===
socket.on('chat history', (messages) => {
  messages.forEach(data => addMessageToDOM(data));
});

// === Live Messages ===
socket.on('chat message', (data) => {
  addMessageToDOM(data);
});
