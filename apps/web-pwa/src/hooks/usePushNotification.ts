'use client';

import { useCallback, useEffect, useState } from 'react';

export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => setSwReady(true))
        .catch(() => setSwReady(false));
    }
  }, []);

  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch {
      return false;
    }
  }, []);

  const triggerWebPushAlert = useCallback(
    async (title: string, body: string) => {
      if (typeof window === 'undefined') return;

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              await reg.showNotification(title, {
                body,
                icon: '/icons/icon-192.svg',
                badge: '/icons/icon-192.svg',
              });
              return;
            }
          }
          new Notification(title, { body, icon: '/icons/icon-192.svg' });
        } catch {
          // Fallback to in-app banner
        }
      }
    },
    []
  );

  return {
    permission,
    swReady,
    requestPushPermission,
    triggerWebPushAlert,
  };
}

