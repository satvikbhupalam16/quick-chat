// service-worker.js
self.addEventListener('install', (e) => {
    console.log('✅ Service Worker installed');
    self.skipWaiting();
  });
  
  self.addEventListener('activate', (e) => {
    console.log('✅ Service Worker activated');
  });
  
  self.addEventListener('fetch', (e) => {
    // Allow default fetch to go through
  });
  