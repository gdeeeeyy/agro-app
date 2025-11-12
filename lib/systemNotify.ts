import { emitNotificationsChanged } from './notifBus';

export async function registerPushToken(userId?: number | null) {
  try {
    if (!Notifications || Platform.OS === 'web') return;
    const perm = await initNotifications();
    if (!perm) return;
    const tokRes = await Notifications.getExpoPushTokenAsync?.();
    const token = tokRes?.data || tokRes;
    if (!token) return;
    await fetch((process.env.EXPO_PUBLIC_API_URL || '') + '/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId || null, token })
    }).catch(()=>{});
    // Listen for foreground notifications and trigger badge refresh
    try {
      Notifications.addNotificationReceivedListener?.(() => emitNotificationsChanged());
    } catch {}
  } catch {}
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let Notifications: any = null as any;
let notificationHandlerSet = false;
try {
  // Dynamically require so web or missing module won't crash
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
} catch {}

export async function initNotifications() {
  try {
    if (!Notifications || Platform.OS === 'web') return false;
    if (!notificationHandlerSet) {
      try {
        Notifications.setNotificationHandler?.({
          handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false })
        });
      } catch {}
      notificationHandlerSet = true;
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      return req.status === 'granted';
    }
    return true;
  } catch {
    return false;
  }
}

export async function presentLocalNotification(title: string, body: string) {
  try {
    if (!Notifications || Platform.OS === 'web') return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, priority: Notifications.AndroidNotificationPriority.HIGH },
      trigger: null,
    });
  } catch {}
}

function keyFor(userId?: number | null) {
  const uid = userId ? String(userId) : 'all';
  return `@agro_last_notif_time_${uid}`;
}

export async function notifyNewServerNotifications(userId: number | null | undefined, rows: Array<{ title: string; message: string; title_ta?: string; message_ta?: string; created_at?: string }>) {
  try {
    const key = keyFor(userId);
    const last = await AsyncStorage.getItem(key);
    const lastTs = last ? Date.parse(last) : 0;
    const sorted = [...(rows || [])].sort((a, b) => Date.parse(a.created_at || '') - Date.parse(b.created_at || ''));
    let newest = lastTs;
    for (const r of sorted) {
      const ts = Date.parse(r.created_at || '') || Date.now();
      if (ts > lastTs) {
        const title = r.title_ta ? `${r.title} / ${r.title_ta}` : (r.title || 'Notification');
        const body = r.message_ta ? `${r.message || ''}\n\n${r.message_ta}` : (r.message || '');
        await presentLocalNotification(title, body);
        if (ts > newest) newest = ts;
      }
    }
    if (newest > lastTs) await AsyncStorage.setItem(key, new Date(newest).toISOString());
  } catch {}
}