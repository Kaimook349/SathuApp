import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from './components/BottomNav';
import { supabase } from '../../supabase';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';
import AppText from './components/AppText';
// ถ้า path ไม่ตรง ลอง '../../components/AppText'

export default function ActivitiesScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dates, setDates] = useState<any[]>([]);
  const [currentMonthYear, setCurrentMonthYear] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [reminderVisible, setReminderVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderHour, setReminderHour] = useState('08');
  const [reminderMinute, setReminderMinute] = useState('00');

  useEffect(() => {
    setupNotifications();
    loadUnreadCount();

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const dateList = [];
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const date = new Date(year, month, day);
      dateList.push({
        date,
        day,
        weekday: date.toLocaleString('th-TH', { weekday: 'narrow' }),
      });
    }

    setDates(dateList);
    updateMonthYearDisplay(today);
  }, []);

  useEffect(() => {
    fetchEventsFromSupabase(selectedDate);
  }, [selectedDate]);

  const setupNotifications = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('activities', {
        name: 'กิจกรรมวัด',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  };

  const requestNotificationPermission = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('activities', {
        name: 'กิจกรรมวัด',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  };

  const loadUnreadCount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    } catch (error) {
      console.log('Error loading unread count:', error);
    }
  };

  const fetchEventsFromSupabase = async (date: Date) => {
    try {
      setLoading(true);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const { data: templeData, error: templeError } = await supabase
        .from('temples_activities')
        .select('*')
        .eq('category', 'event')
        .eq('event_date', dateString)
        .eq('status', 'approved');

      if (templeError) throw templeError;

      const { data: adminData, error: adminError } = await supabase
        .from('admin_activities')
        .select('*')
        .eq('date', dateString)
        .eq('status', 'published');

      if (adminError) throw adminError;

      const fromTemple = (templeData || []).map((item: any) => ({
        ...item,
        activity_name: item.activity_name,
        event_time: item.event_time || '08:00',
        image_url: item.image_url,
        temple_name: item.temple_name,
        description: item.description,
      }));

      const fromAdmin = (adminData || []).map((item: any) => ({
        id: item.id,
        activity_name: item.title,
        event_time: item.time || '08:00',
        event_date: item.date,
        image_url: item.image,
        temple_name: item.location,
        location: item.location,
        description: item.description,
        province: '',
      }));

      const merged = [...fromAdmin, ...fromTemple];
      const uniqueEvents = Array.from(
        new Map(merged.map((item) => [item.id, item])).values()
      );

      setEvents(uniqueEvents);
    } catch (error) {
      console.log('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const openReminderModal = (event: any) => {
    const timeStr = event.event_time || '08:00';
    const [h, m] = String(timeStr).split(':');
    setSelectedEvent(event);
    setReminderTitle(event.activity_name || '');
    setReminderHour(String(h || '08').padStart(2, '0'));
    setReminderMinute(String(m || '00').padStart(2, '0'));
    setReminderVisible(true);
  };

  const confirmReminder = async () => {
    try {
      if (!selectedEvent) return;

      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'ต้องการสิทธิ์แจ้งเตือน',
          'กรุณาอนุญาตการแจ้งเตือนในการตั้งค่าเครื่อง'
        );
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('กรุณาเข้าสู่ระบบ');
        return;
      }

      const hours = Math.min(23, Math.max(0, parseInt(reminderHour, 10) || 0));
      const minutes = Math.min(59, Math.max(0, parseInt(reminderMinute, 10) || 0));
      const title =
        reminderTitle.trim() || selectedEvent.activity_name || 'แจ้งเตือนกิจกรรม';

      let triggerDate: Date;
      if (selectedEvent.event_date) {
        const [yy, mm, dd] = String(selectedEvent.event_date)
          .split('-')
          .map(Number);
        triggerDate = new Date(yy, (mm || 1) - 1, dd || 1, hours, minutes, 0, 0);
      } else {
        triggerDate = new Date(selectedDate);
        triggerDate.setHours(hours, minutes, 0, 0);
      }

      if (triggerDate.getTime() <= Date.now()) {
        Alert.alert('เวลาผ่านแล้ว', 'กรุณาเลือกเวลาในอนาคต');
        return;
      }

      const { error: dbError } = await supabase.from('notifications').insert({
        user_id: user.id,
        title: `🔔 ${title}`,
        body: `จัดขึ้นที่ ${selectedEvent.temple_name || ''} (${
          selectedEvent.province || ''
        })`,
        type: 'activity_reminder',
        related_id: selectedEvent.id?.toString() || null,
        is_read: false,
        scheduled_at: triggerDate.toISOString(),
      });

      if (dbError) throw dbError;

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 ${title}`,
            body: `จัดขึ้นที่ ${selectedEvent.temple_name || ''} (${
              selectedEvent.province || ''
            })`,
            sound: true,
            ...(Platform.OS === 'android' ? { channelId: 'activities' } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
      } catch {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 ${title}`,
            body: `จัดขึ้นที่ ${selectedEvent.temple_name || ''} (${
              selectedEvent.province || ''
            })`,
            sound: true,
          },
          trigger: {
            date: triggerDate,
            channelId: Platform.OS === 'android' ? 'activities' : undefined,
          } as any,
        });
      }

      setReminderVisible(false);
      loadUnreadCount();

      Alert.alert(
        'สำเร็จ',
        `ตั้งเตือน "${title}"\nเวลา ${triggerDate.toLocaleString(
          'th-TH'
        )}\nจะปรากฏในหน้าข้อความด้วย`
      );
    } catch (error: any) {
      console.error('Reminder error:', error);
      Alert.alert(
        'เกิดข้อผิดพลาด',
        error?.message || 'ไม่สามารถตั้งเวลาแจ้งเตือนได้'
      );
    }
  };

  const updateMonthYearDisplay = (date: Date) => {
    const formatted = date.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric',
    });
    setCurrentMonthYear(formatted);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const formatThaiDate = (date: Date) => {
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const hasEventOnDate = (_date: Date) => false;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View>
          <AppText style={[styles.headerTitle, { color: colors.text }]}>
            กิจกรรม
          </AppText>
          <AppText
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            ปฏิทินกิจกรรมวัดศาลาลอย
          </AppText>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
            ]}
            onPress={() => router.push('/messages' as any)}
          >
            <Ionicons
              name="mail-outline"
              size={22}
              color={colors.textSecondary}
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Month Selector */}
      <TouchableOpacity
        style={[styles.monthSelector, { backgroundColor: colors.card }]}
      >
        <Text style={[styles.monthText, { color: colors.text }]}>
          {currentMonthYear}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Calendar */}
      <View
        style={[styles.calendarContainer, { backgroundColor: colors.card }]}
      >
        <FlatList
          data={dates}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          style={{ height: 88 }}
          renderItem={({ item }) => {
            const isSelected =
              item.date.toDateString() === selectedDate.toDateString();
            return (
              <TouchableOpacity
                style={[
                  styles.dateItem,
                  {
                    backgroundColor: isSelected
                      ? '#4C1D95'
                      : isDark
                      ? '#334155'
                      : '#F1F5F9',
                  },
                ]}
                onPress={() => handleSelectDate(item.date)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    { color: isSelected ? '#fff' : colors.text },
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    styles.weekday,
                    {
                      color: isSelected
                        ? 'rgba(255,255,255,0.85)'
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {item.weekday}
                </Text>
                {hasEventOnDate(item.date) && <View style={styles.eventDot} />}
              </TouchableOpacity>
            );
          }}
          initialScrollIndex={Math.max(0, new Date().getDate() - 3)}
          getItemLayout={(_, index) => ({
            length: 60,
            offset: 60 * index,
            index,
          })}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        style={{ flex: 1 }}
      >
        <View style={styles.selectedDateRow}>
          <View style={styles.selectedDateLeft}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <AppText style={[styles.selectedDateText, { color: colors.text }]}>
              วันที่ {formatThaiDate(selectedDate)}
            </AppText>
          </View>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
            ]}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={colors.textSecondary}
            />
            <AppText style={[styles.filterText, { color: colors.textSecondary }]}>
              ตัวกรอง
            </AppText>
          </TouchableOpacity>
        </View>

        <AppText style={[styles.eventCount, { color: colors.textSecondary }]}>
          {loading ? 'กำลังโหลด...' : `${events.length} กิจกรรม`}
        </AppText>

        <View style={styles.timeline}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginTop: 40 }}
            />
          ) : events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="calendar-blank-outline"
                size={56}
                color={isDark ? '#475569' : '#CBD5E1'}
              />
              <AppText style={[styles.emptyText, { color: colors.text }]}>
                ยังไม่มีกิจกรรมในวันนี้
              </AppText>
              <AppText
                style={[styles.emptySubText, { color: colors.textSecondary }]}
              >
                สามารถเพิ่มข้อมูลกิจกรรมได้ที่เมนูเพิ่มข้อมูล
              </AppText>
            </View>
          ) : (
            events.map((event, index) => (
              <View key={event.id || index} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                  {index !== events.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  )}
                </View>

                <View
                  style={[
                    styles.eventCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderWidth: isDark ? 1 : 0,
                    },
                  ]}
                >
                  <View style={styles.eventCardHeader}>
                    <Text style={[styles.eventTime, { color: colors.primary }]}>
                      {event.event_time || '08:00'}
                    </Text>
                    <TouchableOpacity>
                      <Ionicons name="heart-outline" size={20} color="#FF4D94" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.eventContent}>
                    <Image
                      source={{
                        uri:
                          event.image_url ||
                          'https://picsum.photos/seed/' +
                            (event.id || index) +
                            '/200/200',
                      }}
                      style={styles.eventImage}
                    />

                    <View style={styles.eventInfo}>
                      {/* ชื่อกิจกรรมจาก DB ไม่แปล */}
                      <Text
                        style={[styles.eventTitle, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {event.activity_name}
                      </Text>

                      <View style={styles.locationRow}>
                        <Ionicons
                          name="location-outline"
                          size={14}
                          color={colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.locationText,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {event.temple_name ||
                            event.location ||
                            'ไม่ระบุสถานที่'}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.eventDesc,
                          { color: colors.textSecondary },
                        ]}
                        numberOfLines={2}
                      >
                        {event.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                      </Text>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[
                            styles.reminderBtn,
                            {
                              backgroundColor: isDark ? '#4C1D95' : '#F3E8FF',
                            },
                          ]}
                          onPress={() => openReminderModal(event)}
                        >
                          <Ionicons
                            name="notifications-outline"
                            size={14}
                            color={isDark ? '#E9D5FF' : '#7C3AED'}
                          />
                          <AppText
                            style={[
                              styles.reminderText,
                              { color: isDark ? '#E9D5FF' : '#7C3AED' },
                            ]}
                          >
                            ตั้งเตือน
                          </AppText>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.shareBtn,
                            {
                              backgroundColor: isDark ? '#334155' : '#F1F5F9',
                            },
                          ]}
                        >
                          <Ionicons
                            name="share-outline"
                            size={14}
                            color={colors.textSecondary}
                          />
                          <AppText
                            style={[
                              styles.shareText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            แชร์
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal ตั้งเตือน */}
      <Modal
        visible={reminderVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReminderVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <AppText style={[styles.modalTitle, { color: colors.text }]}>
              ตั้งค่าการแจ้งเตือน
            </AppText>

            <AppText style={[styles.modalLabel, { color: colors.textSecondary }]}>
              ชื่อแจ้งเตือน
            </AppText>
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                },
              ]}
              value={reminderTitle}
              onChangeText={setReminderTitle}
              placeholder="เช่น งานทอดกฐิน"
              placeholderTextColor="#94A3B8"
            />

            <AppText style={[styles.modalLabel, { color: colors.textSecondary }]}>
              เวลา (ชม. : นาที)
            </AppText>
            <View style={styles.timeRow}>
              <TextInput
                style={[
                  styles.timeInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  },
                ]}
                value={reminderHour}
                onChangeText={setReminderHour}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="08"
                placeholderTextColor="#94A3B8"
              />
              <Text style={[styles.timeColon, { color: colors.text }]}>:</Text>
              <TextInput
                style={[
                  styles.timeInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  },
                ]}
                value={reminderMinute}
                onChangeText={setReminderMinute}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="00"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setReminderVisible(false)}
              >
                <AppText style={styles.modalCancelText}>ยกเลิก</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSave]}
                onPress={confirmReminder}
              >
                <AppText style={styles.modalSaveText}>ตั้งเตือน</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  monthText: { fontSize: 16, fontWeight: '600' },

  calendarContainer: {
    paddingVertical: 12,
    height: 110,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  dateItem: {
    width: 52,
    height: 72,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  dayNumber: { fontSize: 18, fontWeight: '700' },
  weekday: { fontSize: 12, marginTop: 4 },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EC4899',
    marginTop: 4,
  },

  selectedDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  selectedDateLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedDateText: { fontSize: 16, fontWeight: '700' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterText: { fontSize: 13 },

  eventCount: {
    paddingHorizontal: 20,
    fontSize: 13,
    marginBottom: 12,
  },

  timeline: { paddingHorizontal: 20 },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 18,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },

  eventCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    marginLeft: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventTime: {
    fontSize: 13,
    fontWeight: '700',
  },

  eventContent: {
    flexDirection: 'row',
    gap: 12,
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  eventInfo: { flex: 1 },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: { fontSize: 12, flex: 1 },
  eventDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },

  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  reminderText: { fontSize: 12, fontWeight: '600' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  shareText: { fontSize: 12, fontWeight: '500' },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    width: 64,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  timeColon: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: '#F1F5F9',
  },
  modalSave: {
    backgroundColor: '#7C3AED',
  },
  modalCancelText: {
    color: '#64748B',
    fontWeight: '700',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '700',
  },
});