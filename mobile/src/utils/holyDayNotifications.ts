import * as Notifications from 'expo-notifications';
import { supabase } from '../../supabase'; // ปรับ path ให้ถูก

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** ตั้งแจ้งเตือนวันพระล่วงหน้า */
export async function scheduleHolyDayReminders() {
  const ok = await requestNotificationPermission();
  if (!ok) return;

  // ลบแจ้งเตือนวันพระเก่า
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content?.data?.type === 'holy_day') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('holy_days')
    .select('date, title, note, is_major')
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(10);

  if (error || !data?.length) {
    console.log('holy_days fetch error', error);
    return;
  }

  for (const row of data) {
    const holy = new Date(row.date + 'T00:00:00');

    // 1) เย็นวันก่อน 18:00
    const eve = new Date(holy);
    eve.setDate(eve.getDate() - 1);
    eve.setHours(18, 0, 0, 0);

    if (eve.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: row.is_major ? `${row.title} ใกล้แล้ว 🙏` : 'วันพระใกล้แล้ว 🙏',
          body:
            row.note ||
            `พรุ่งนี้เป็น${row.title} · เปิดปฏิทินดูกิจกรรมบุญได้`,
          data: { type: 'holy_day', date: row.date, screen: 'calendar' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: eve,
        },
      });
    }

    // 2) เช้าวันนั้น 07:00
    const morning = new Date(holy);
    morning.setHours(7, 0, 0, 0);

    if (morning.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: row.is_major ? `วันนี้${row.title} 🪷` : 'วันนี้วันพระ 🪷',
          body: 'ขอเชิญร่วมทำบุญ สวดมนต์ หรือไปวัดใกล้บ้าน',
          data: { type: 'holy_day', date: row.date, screen: 'home' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: morning,
        },
      });
    }
  }
}