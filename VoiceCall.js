let seconds = 0;
let minutes = 0;

const timer = document.getElementById('call-timer');

const interval = setInterval(() => {
  seconds++;
  if (seconds === 60) {
    seconds = 0;
    minutes++;
  }
  timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}, 1000);

// Button handlers
document.getElementById('mute-btn').addEventListener('click', () => {
  alert('🔇 Mute toggled (functionality to be added)');
});

document.getElementById('speaker-btn').addEventListener('click', () => {
  alert('🔈 Speaker toggled (functionality to be added)');
});

document.getElementById('end-call-btn').addEventListener('click', () => {
  clearInterval(interval);
  window.close(); // For now — later integrate full logic
});
