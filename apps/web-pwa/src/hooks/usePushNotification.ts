'use client';

import { useCallback, useEffect, useState } from 'react';

export type NotificationCategory =
  | 'postStatus'
  | 'doubleMatch'
  | 'sightingReport'
  | 'urgentSos'
  | 'weeklyMemory';

export interface NotificationSettings {
  masterEnabled: boolean;
  soundAndVibrate: boolean;
  postStatus: boolean;
  doubleMatch: boolean;
  sightingReport: boolean;
  urgentSos: boolean;
  weeklyMemory: boolean;
}

export interface NotificationLogItem {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

const SETTINGS_STORAGE_KEY = 'dom_nho_notification_settings_v1';
const HISTORY_STORAGE_KEY = 'dom_nho_notification_history_v1';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  masterEnabled: true,
  soundAndVibrate: true,
  postStatus: true,
  doubleMatch: true,
  sightingReport: true,
  urgentSos: true,
  weeklyMemory: true,
};

function playNotificationTone() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.09); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.29);
    setTimeout(() => {
      ctx.close().catch(() => null);
    }, 350);
  } catch {
    // Ignore audio context restriction if no user gesture yet
  }
}

export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [swReady, setSwReady] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [isStandalonePwa, setIsStandalonePwa] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [history, setHistory] = useState<NotificationLogItem[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' &&
        window.navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);

    if (isIos) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    const standalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
      Boolean((window.navigator as unknown as { standalone?: boolean }).standalone);
    setIsStandalonePwa(standalone);

    try {
      const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed && typeof parsed === 'object') {
          setSettings({
            ...DEFAULT_NOTIFICATION_SETTINGS,
            ...parsed,
          });
        }
      }
    } catch {
      // Keep default settings
    }

    try {
      const rawHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, 25));
        }
      }
    } catch {
      // Keep empty history
    }

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

  const updateNotificationSetting = useCallback(
    <K extends keyof NotificationSettings>(
      key: K,
      value: NotificationSettings[K]
    ) => {
      setSettings((prev) => {
        const next: NotificationSettings = {
          ...prev,
          [key]: value,
        };
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(
              SETTINGS_STORAGE_KEY,
              JSON.stringify(next)
            );
          } catch {
            // Ignore quota error
          }
        }
        return next;
      });
    },
    []
  );

  const clearNotificationHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  }, []);

  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    updateNotificationSetting('masterEnabled', true);

    if (!('Notification' in window)) {
      // Trên iOS Safari chưa ghim màn hình chính, kích hoạt thông báo trong ứng dụng & âm báo
      setPermission('granted');
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch {
      return false;
    }
  }, [updateNotificationSetting]);

  const triggerWebPushAlert = useCallback(
    async (
      title: string,
      body: string,
      category: NotificationCategory = 'postStatus'
    ): Promise<boolean> => {
      if (typeof window === 'undefined') return false;

      let currentSettings = settings;
      try {
        const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
          currentSettings = {
            ...DEFAULT_NOTIFICATION_SETTINGS,
            ...JSON.parse(raw),
          };
        }
      } catch {
        // Use in-memory settings
      }

      if (!currentSettings.masterEnabled || !currentSettings[category]) {
        return false;
      }

      const logItem: NotificationLogItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        category,
        title,
        body,
        createdAt: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        read: false,
      };

      setHistory((prev) => {
        const next = [logItem, ...prev].slice(0, 25);
        try {
          window.localStorage.setItem(
            HISTORY_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch {
          // Ignore quota error
        }
        return next;
      });

      if (currentSettings.soundAndVibrate) {
        playNotificationTone();
        if (
          typeof navigator !== 'undefined' &&
          typeof navigator.vibrate === 'function'
        ) {
          try {
            navigator.vibrate([100, 50, 100]);
          } catch {
            // Ignore vibrate restriction
          }
        }
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && typeof reg.showNotification === 'function') {
              await reg.showNotification(title, {
                body,
                icon: '/logo-dom-nho.png',
                badge: '/logo-dom-nho.png',
                tag: `dom-nho-${category}-${Date.now()}`,
              });
              return true;
            }
          }
          new Notification(title, {
            body,
            icon: '/logo-dom-nho.png',
          });
          return true;
        } catch {
          // Fallback sang thông báo trực tiếp trong ứng dụng (iOS Safari / WebView)
        }
      }

      return true;
    },
    [settings]
  );

  return {
    permission,
    swReady,
    platform,
    isStandalonePwa,
    settings,
    history,
    updateNotificationSetting,
    clearNotificationHistory,
    requestPushPermission,
    triggerWebPushAlert,
  };
}
