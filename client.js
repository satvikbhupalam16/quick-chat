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
  if (userName === 'Dog' && 'Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission().then((permission) => {
      console.log('Notification permission:', permission);
    });
  }
  
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
  showClearChatMenu();
});

// === Back to Home ===
document.getElementById('back-btn').addEventListener('click', () => {
  window.location.href = 'https://quick-chat-fumk.onrender.com/';
});

function showClearChatMenu() {
  const oldMenu = document.getElementById('clear-menu');
  if (oldMenu) oldMenu.remove();

  const menu = document.createElement('div');
  menu.id = 'clear-menu';
  menu.className = 'delete-popup';
  menu.style.top = '60px';
  menu.style.right = '10px';

  // ✅ Option 1: Delete for Me
  const deleteMe = document.createElement('div');
  deleteMe.textContent = 'Clear History for Me';
  deleteMe.onclick = () => {
    socket.emit('clear history for me', userName);
    menu.remove();
  };
  menu.appendChild(deleteMe);

  // ✅ Option 2: Delete for Everyone
  const deleteAll = document.createElement('div');
  deleteAll.textContent = 'Clear History for Everyone';
  deleteAll.onclick = () => {
    socket.emit('clear history for everyone');
    menu.remove();
  };
  menu.appendChild(deleteAll);

  // Cancel
  const cancel = document.createElement('div');
  cancel.textContent = 'Cancel';
  cancel.onclick = () => menu.remove();
  menu.appendChild(cancel);

  document.body.appendChild(menu);
}


function showDeleteMenu(x, y, canDeleteForEveryone) {
  // Remove existing popup if any
  const oldMenu = document.getElementById('delete-menu');
  if (oldMenu) oldMenu.remove();

  const menu = document.createElement('div');
  menu.id = 'delete-menu';
  menu.className = 'delete-popup';
  menu.style.top = `${y}px`;
  menu.style.left = `${x}px`;

  // ✅ Option 1: Delete for Me
  const deleteMe = document.createElement('div');
  deleteMe.textContent = 'Delete for Me';
  deleteMe.onclick = () => {
    if (selectedMessageId) {
      socket.emit('delete for me', { username: userName, messageId: selectedMessageId });
    }
    menu.remove();
  };
  menu.appendChild(deleteMe);

  // ✅ Option 2: Delete for Everyone (if sender)
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

  // ✅ Option 3: Cancel
  const cancel = document.createElement('div');
  cancel.textContent = 'Cancel';
  cancel.onclick = () => {
    menu.remove();
  };
  menu.appendChild(cancel);

  document.body.appendChild(menu);
}

function showBrowserNotification(title, message) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: '/favicon.ico' // Optional: add your logo
    });
  }
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
  if (userName === 'Dog' && user !== userName && status === 'online') {
    showBrowserNotification('QCApp', `${user} is online`);
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
  if (userName === 'Dog' && data.sender !== userName && document.hidden) {
    showBrowserNotification('QCApp', `${data.sender}: ${data.msg}`);
  }
  
});

// === Delete for Me ===
socket.on('message removed', (messageId) => {
  const msgEl = document.querySelector(`[data-id="${messageId}"]`);
  if (msgEl) msgEl.remove();
});

socket.on('all messages removed', () => {
  document.getElementById('messages').innerHTML = '';
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
