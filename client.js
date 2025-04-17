const socket = io();

console.log('Connecting to socket...');
socket.on('connect', () => console.log('✅ Socket connected!'));


let userName = '';
let messageMap = {};

window.onload = function () {
  document.getElementById('submit-code').addEventListener('click', checkSecretCode);
  document.getElementById('submit-name').addEventListener('click', setName);
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('clear-btn').addEventListener('click', () => {
    document.getElementById('messages').innerHTML = '';
  });
  document.getElementById('message').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
};

function checkSecretCode() {
  const secretCode = document.getElementById('secret-code').value.trim();
  if (secretCode === "RSS") {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('name-container').style.display = 'block';
  } else {
    alert("Incorrect secret code. Please try again.");
  }
}

function setName() {
  userName = document.getElementById('name').value.trim();
  if (!userName) {
    alert("Please enter your name.");
    return;
  }
  console.log('Submitting name:', userName);
  socket.emit('set name', { name: userName });
  document.getElementById('name-container').style.display = 'none';
  document.getElementById('chat').style.display = 'flex';
}

function sendMessage() {
  const msgInput = document.getElementById('message');
  const msg = msgInput.value.trim();
  if (msg) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageId = Date.now().toString() + Math.random().toString(36).substring(2);
    const messageData = { id: messageId, sender: userName, msg, time: timestamp, status: 'sent' };
    socket.emit('chat message', messageData);
    renderMessage(messageData, true);
    messageMap[messageId] = messageData;
    msgInput.value = '';
  }
}

function renderMessage(data, isSelf) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', data.sender === userName ? 'user' : 'friend');
  messageElement.setAttribute('id', data.id);

  const tickHTML = isSelf
    ? `<span class="status ${data.status}">${getStatusTick(data.status)}</span>`
    : '';

  messageElement.innerHTML = `
    <strong>${data.sender}:</strong> ${data.msg}
    <div class="timestamp">${data.time} ${tickHTML}</div>
  `;
  document.getElementById('messages').prepend(messageElement);
}

function getStatusTick(status) {
  switch (status) {
    case 'sent': return '✔';
    case 'delivered': return '✔✔';
    case 'seen': return '<span style="color:#25d366;">✔✔</span>';
    default: return '';
  }
}

socket.on('chat message', (data) => {
  if (data.sender === userName) return;
  renderMessage(data, false);
  socket.emit('message delivered', { id: data.id, sender: data.sender });
});

socket.on('update status', (data) => {
  const msgEl = document.getElementById(data.id);
  if (msgEl && messageMap[data.id]) {
    messageMap[data.id].status = data.status;
    const timestamp = msgEl.querySelector('.timestamp');
    timestamp.innerHTML = messageMap[data.id].time + ' <span class="status ' + data.status + '">' + getStatusTick(data.status) + '</span>';
  }
});

window.addEventListener('focus', () => {
  Object.keys(messageMap).forEach(id => {
    const msg = messageMap[id];
    if (msg.sender !== userName && msg.status !== 'seen') {
      socket.emit('message seen', { id: id, sender: msg.sender });
    }
  });
});
