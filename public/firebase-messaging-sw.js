importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  // your firebase config
  apiKey: "AIzaSyBJbPXwvZHtc7Dw-7Pl8xhGjdG-Qk_IQIE",
  authDomain: "juheehur-portfolio.firebaseapp.com",
  projectId: "juheehur-portfolio",
  storageBucket: "juheehur-portfolio.appspot.com",
  messagingSenderId: "1098332409348",
  appId: "1:1098332409348:web:c7c1e8f0f7c4d7f5c7c4d7"
});

const messaging = firebase.messaging();

// 백그라운드 메시지 처리
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/diatomicarbon-icon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
}); 