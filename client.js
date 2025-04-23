
const socket = io();
let userName = '';

// Add sample logic for demonstration purposes
document.getElementById('send-btn').addEventListener('click', () => {
  const msgInput = document.getElementById('message');
  const message = msgInput.value.trim();
  if (message) {
    addMessageToDOM({ sender: userName || 'You', msg: message });
    msgInput.value = '';
  }
});

// === Add Message to DOM ===
function addMessageToDOM(data) {
  const isUser = data.sender === userName;
  const message = document.createElement('div');
  message.classList.add('message', isUser ? 'user' : 'friend');
  message.textContent = `${data.sender}: ${data.msg}`;

  const messagesArea = document.getElementById('messages');
  messagesArea.appendChild(message);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}
