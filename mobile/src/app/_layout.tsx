import { useEffect, useRef } from 'react';
import { Slot, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext';
import { scheduleHolyDayReminders } from '../utils/holyDayNotifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Layout() {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    const setup = async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;

        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('Notification permission not granted');
          return;
        }

        await scheduleHolyDayReminders();
      } catch (e) {
        console.log('notification setup error', e);
      }
    };

    setup();
  }, []);

  useEffect(() => {
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as any;

        if (data?.type === 'holy_day') {
          if (data.screen === 'calendar') {
            router.push('/calendar' as any);
          } else {
            router.push('/home' as any);
          }
        }
      });

    return () => {
      responseListener.current?.remove();
    };
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LanguageProvider>
          <Slot />
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}