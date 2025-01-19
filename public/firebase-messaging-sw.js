// 알림 처리를 위한 Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 알림 데이터 저장소
let scheduledNotifications = [];

// 알림 스케줄링 메시지 처리
self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { notification } = event.data;
    scheduledNotifications.push(notification);
    
    // 알림 시간 계산
    const timeUntilNotification = notification.time - Date.now();
    
    if (timeUntilNotification > 0) {
      setTimeout(() => {
        self.registration.showNotification(notification.title, {
          body: notification.body,
          icon: '/diatomicarbon-icon.ico',
          badge: '/diatomicarbon-icon.ico',
          tag: notification.id,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: notification
        });
        
        // 발송된 알림 제거
        scheduledNotifications = scheduledNotifications.filter(n => n.id !== notification.id);
      }, timeUntilNotification);
    }
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // 알림 클릭시 앱 열기
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
  );
}); 