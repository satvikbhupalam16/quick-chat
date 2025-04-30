const socket = io();
let userName = '';

let selectedMessageId = null;
let selectedMessageSender = null;

let pendingMessages = [];
let chatReady = false;

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

  socket.emit('set name', { name: username, password });
});

// Only register these once:
socket.on('name set', (data) => {
  userName = data.name;
  chatReady = true;

  pendingMessages.forEach(data => addMessageToDOM(data));
  pendingMessages = [];
  document.getElementById('name-container').style.display = 'none';
  document.getElementById('chat').style.display = 'flex';
});

socket.on('auth error', (msg) => {
  alert(msg);
});

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

function showDeleteMenu(x, y, canDeleteForEveryone) {
  const oldMenu = document.getElementById('delete-menu');
  if (oldMenu) oldMenu.remove();

  const menu = document.createElement('div');
  menu.id = 'delete-menu';
  menu.className = 'delete-popup';
  menu.style.top = `${y}px`;
  menu.style.left = `${x}px`;

  const deleteMe = document.createElement('div');
  deleteMe.textContent = 'Delete for Me';
  deleteMe.onclick = () => {
    if (selectedMessageId) {
      socket.emit('delete for me', { username: userName, messageId: selectedMessageId });
    }
    menu.remove();
  };
  menu.appendChild(deleteMe);

  if (canDeleteForEveryone) {
    const deleteAll = document.createElement('div');
    deleteAll.textContent = 'Delete for Everyone';
    deleteAll.onclick = () => {
      if (selectedMessageId) {
        socket.emit('delete for everyone', selectedMessageId);
      }
      menu.remove();
    };
    menu.appendChild(deleteAll);
  }

  document.body.appendChild(menu);
}


// === Add Message to DOM ===
function addMessageToDOM(data) {
  const isUser = userName && data.sender === userName;
  const senderName = data.sender || 'Unknown';
  const messageText = data.msg || data.message || '[No message]';
  const timeText = data.time || '';

  const message = document.createElement('div');
  message.classList.add('message', isUser ? 'user' : 'friend');

  // ✅ Attach the MongoDB message ID to the DOM element
  if (data._id) {
    message.setAttribute('data-id', data._id);
    message.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // stop default right-click behavior
    
      selectedMessageId = data._id;
      selectedMessageSender = data.sender;
    
      showDeleteMenu(e.pageX, e.pageY, data.sender === userName);
    });
    
  }

  // ✅ Set the message content
  message.innerHTML = `
    ${!isUser ? `<strong>${senderName}:</strong>` : '<strong>You:</strong>'}
    ${messageText}
    <div class="timestamp">${timeText}</div>
  `;

  // ✅ Add the message to the chat DOM
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
  if (!chatReady) {
    pendingMessages = messages; // hold onto them
  } else {
    messages.forEach(data => addMessageToDOM(data));
  }
});

// === Live Messages ===
socket.on('chat message', (data) => {
  addMessageToDOM(data);
});

// === Delete for Me ===
socket.on('message removed', (messageId) => {
  const msgEl = document.querySelector(`[data-id="${messageId}"]`);
  if (msgEl) msgEl.remove();
});

// === Other User's Status Display ===
socket.on('otherUserStatus', ({ username, online, lastSeen }) => {
  const iconMap = { 'Dog': '🐶', 'Pig': '🐷' };
  const icon = iconMap[username] || '👤';

  const displayStatus = online
    ? `<span class="online-dot"></span> Online`
    : `<span class="offline-dot"></span> Last seen: ${new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  document.getElementById('status-display').innerHTML = `
    <div class="status-name">${icon} ${username}</div>
    <div class="status-info">${displayStatus}</div>
  `;
});
