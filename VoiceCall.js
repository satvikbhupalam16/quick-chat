const socket = io();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callerName = document.getElementById('caller-name');
const callTimer = document.getElementById('call-timer');
const acceptCallBtn = document.getElementById('acceptCall');
const declineCallBtn = document.getElementById('declineCall');
const muteBtn = document.getElementById('mute-btn');
const speakerBtn = document.getElementById('speaker-btn');
const endCallBtn = document.getElementById('end-call-btn');

let localStream;
let peerConnection;
let timerInterval;
let callAccepted = false;
let callerId = null;

const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

function startTimer() {
  let seconds = 0, minutes = 0;
  callTimer.textContent = '00:00';

  timerInterval = setInterval(() => {
    seconds++;
    if (seconds === 60) {
      seconds = 0;
      minutes++;
    }
    callTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, 1000);
}

async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  } catch (err) {
    console.error('Error accessing media devices:', err);
  }
}

function createPeerConnection(to) {
  const pc = new RTCPeerConnection(config);

  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('call:ice-candidate', { to, candidate: e.candidate });
    }
  };

  pc.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
  };

  return pc;
}

function endCall() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  if (remoteVideo.srcObject) {
    remoteVideo.srcObject.getTracks().forEach(track => track.stop());
    remoteVideo.srcObject = null;
  }

  localVideo.srcObject = null;
  remoteVideo.srcObject = null;

  clearInterval(timerInterval);
  callTimer.textContent = '00:00';
  callAccepted = false;
  document.querySelector('.incoming-controls').style.display = 'none';
  callerName.textContent = 'Call Ended';
}

// === Socket Events ===

// Incoming call offer
socket.on('call:offer', async ({ from, offer }) => {
  callerId = from;
  callerName.textContent = `Incoming Call from ${from}`;
  document.querySelector('.incoming-controls').style.display = 'flex';

  acceptCallBtn.onclick = async () => {
    await startLocalStream();
    peerConnection = createPeerConnection(from);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('call:answer', { to: from, answer });
    document.querySelector('.incoming-controls').style.display = 'none';
    callAccepted = true;
    startTimer();
  };

  declineCallBtn.onclick = () => {
    socket.emit('call:declined', { to: from });
    endCall();
  };
});

// Call answer received
socket.on('call:answer', async ({ answer }) => {
  if (peerConnection) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    startTimer();
  }
});

// ICE candidate received
socket.on('call:ice-candidate', ({ candidate }) => {
  if (peerConnection) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

// Call ended or declined by remote
socket.on('call:ended', endCall);

socket.on('call:declined', () => {
  alert('Call was declined.');
  endCall();
});

// === UI Button Actions ===

endCallBtn.onclick = () => {
  if (callerId) {
    socket.emit('call:ended', { to: callerId });
  }
  endCall();
};

muteBtn.onclick = () => alert('🔇 Mute toggled (not implemented)');
speakerBtn.onclick = () => alert('🔈 Speaker toggled (not implemented)');

// === Manual Call Initiation ===
async function initiateCall(toUserId) {
  await startLocalStream();
  peerConnection = createPeerConnection(toUserId);

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit('call:offer', { to: toUserId, offer });
  callerId = toUserId;
  callAccepted = true;
  startTimer();
}

// Optional: Start stream immediately for testing (if desired)
startLocalStream();
