import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from './components/BottomNav';
import { useTheme } from '../context/ThemeContext';
// ถ้า error ลอง '../../context/ThemeContext'
import { supabase } from '../../supabase';
import AppText from './components/AppText';
// ถ้า error ลอง '../../components/AppText'

const { width } = Dimensions.get('window');

const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

type HolyDay = {
  date: string; // YYYY-MM-DD
  title: string;
  is_major?: boolean;
  note?: string | null;
};

export default function CalendarScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [holyDays, setHolyDays] = useState<HolyDay[]>([]);
  const [loadingHoly, setLoadingHoly] = useState(false);

  const fetchHolyDays = useCallback(async () => {
    try {
      setLoadingHoly(true);

      const start = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const end = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('holy_days')
        .select('date, title, is_major, note')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      if (error) throw error;
      setHolyDays(data || []);
    } catch (e) {
      console.log('fetch holy_days error', e);
      setHolyDays([]);
    } finally {
      setLoadingHoly(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchHolyDays();
  }, [fetchHolyDays]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const totalDays = getDaysInMonth(currentYear, currentMonth);
  const startDay = getFirstDayOfMonth(currentYear, currentMonth);

  const holyByDay: Record<number, HolyDay> = {};
  holyDays.forEach((h) => {
    const dayNum = parseInt(h.date.split('-')[2], 10);
    if (!Number.isNaN(dayNum)) holyByDay[dayNum] = h;
  });

  const holyListThisMonth = holyDays;

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarCells.push(null);
  for (let day = 1; day <= totalDays; day++) calendarCells.push(day);

  return (
    <SafeAreaView
      style={StyleSheet.flatten([
        styles.container,
        { backgroundColor: colors.background },
      ])}
      edges={['top']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText style={[styles.headerTitle, { color: colors.text }]}>
            ปฏิทินวันดี
          </AppText>
          <AppText style={[styles.headerSub, { color: colors.textSecondary }]}>
            วันพระและวันมงคลสำหรับทำบุญ
          </AppText>
        </View>
        {loadingHoly && <ActivityIndicator size="small" color="#7C3AED" />}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* สรุปวันพระเดือนนี้ */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
              borderColor: isDark ? '#4C1D95' : '#E9D5FF',
            },
          ]}
        >
          <View style={styles.summaryHeader}>
            <Text style={{ fontSize: 18 }}>🪷</Text>
            <AppText
              style={[
                styles.summaryTitle,
                { color: isDark ? '#E9D5FF' : '#5B21B6' },
              ]}
            >
              วันพระเดือน{thaiMonths[currentMonth]}
            </AppText>
          </View>
          {holyListThisMonth.length === 0 ? (
            <AppText style={[styles.summaryEmpty, { color: colors.textSecondary }]}>
              ไม่มีข้อมูลวันพระในเดือนนี้
            </AppText>
          ) : (
            <View style={styles.holyChipRow}>
              {holyListThisMonth.map((h) => {
                const d = parseInt(h.date.split('-')[2], 10);
                return (
                  <View
                    key={h.date}
                    style={[
                      styles.holyChip,
                      {
                        backgroundColor: h.is_major
                          ? '#7C3AED'
                          : isDark
                          ? '#4C1D95'
                          : '#EDE9FE',
                      },
                    ]}
                  >
                    {/* ชื่อวันพระจาก DB → Text */}
                    <Text
                      style={{
                        color: h.is_major || isDark ? '#fff' : '#5B21B6',
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                    >
                      {d} {h.is_major ? `· ${h.title}` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ปฏิทิน */}
        <View
          style={[
            styles.calendarContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.monthSelectorRow}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={[
                styles.arrowBtn,
                { backgroundColor: isDark ? '#4C1D95' : '#F3E8FF' },
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={isDark ? '#E9D5FF' : '#7C3AED'}
              />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              {/* ชื่อเดือน/ปี → Text (ค่าตัวเลข/ชื่อเดือน) */}
              <Text style={[styles.monthText, { color: colors.text }]}>
                {thaiMonths[currentMonth]}
              </Text>
              <Text style={[styles.yearText, { color: colors.textSecondary }]}>
                {currentYear + 543}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={[
                styles.arrowBtn,
                { backgroundColor: isDark ? '#4C1D95' : '#F3E8FF' },
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={isDark ? '#E9D5FF' : '#7C3AED'}
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.weekDaysRow, { borderBottomColor: colors.border }]}>
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((w, index) => (
              <AppText
                key={index}
                style={[styles.weekDayText, { color: colors.textSecondary }]}
              >
                {w}
              </AppText>
            ))}
          </View>

          <View style={styles.gridDays}>
            {calendarCells.map((day, index) => {
              const holy = day !== null ? holyByDay[day] : undefined;
              const isHolyDay = !!holy;
              const isMajor = !!holy?.is_major;
              const isToday =
                day === today.getDate() &&
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear();

              return (
                <View
                  key={index}
                  style={[
                    styles.dayCell,
                    isToday && styles.todayCell,
                    isMajor && styles.majorCell,
                  ]}
                >
                  {day !== null ? (
                    <>
                      <Text
                        style={[
                          styles.dayText,
                          { color: colors.text },
                          isToday && styles.todayText,
                          isMajor && styles.majorText,
                        ]}
                      >
                        {day}
                      </Text>

                      {isHolyDay && (
                        <View style={styles.holyIconContainer}>
                          <Text style={{ fontSize: isMajor ? 14 : 12 }}>
                            {isMajor ? '🪷' : '🙏'}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            <AppText style={[styles.legendText, { color: colors.textSecondary }]}>
              🙏 วันพระ · 🪷 วันสำคัญ (มาฆบูชา วิสาขฯ)
            </AppText>
          </View>
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 2 },

  scrollView: { flex: 1 },

  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700' },
  summaryEmpty: { fontSize: 13 },
  holyChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  holyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },

  calendarContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 100,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  monthSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: { fontSize: 18, fontWeight: '700' },
  yearText: { fontSize: 13, fontWeight: '500' },

  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  weekDayText: {
    width: (width - 64) / 7,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },

  gridDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  dayCell: {
    width: (width - 64) / 7,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#FF4D94',
    borderRadius: 12,
  },
  majorCell: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: 12,
  },
  dayText: { fontSize: 14, fontWeight: '600' },
  todayText: { color: '#FF4D94', fontWeight: '800' },
  majorText: { color: '#7C3AED', fontWeight: '800' },
  holyIconContainer: {
    position: 'absolute',
    bottom: 2,
  },
  legendRow: {
    marginTop: 8,
    alignItems: 'center',
  },
  legendText: { fontSize: 12 },
});