import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

type MeritType = {
  key: string;
  label: string;
  icon: string;
  points: number;
  color: string;
};

const MERIT_TYPES: MeritType[] = [
  { key: 'prayer', label: 'สวดมนต์', icon: '🙏', points: 1, color: '#7C3AED' },
  { key: 'donate', label: 'ให้ทาน', icon: '❤️', points: 2, color: '#EC4899' },
  { key: 'precept', label: 'ถือศีล', icon: '🧘', points: 1, color: '#0EA5E9' },
  { key: 'metta', label: 'แผ่เมตตา', icon: '💛', points: 1, color: '#F59E0B' },
  { key: 'temple', label: 'ไปวัด', icon: '🏛️', points: 3, color: '#10B981' },
];

const LEVELS = [
  { level: 1, name: 'เมล็ดบุญ', min: 0 },
  { level: 2, name: 'ดอกบัว', min: 10 },
  { level: 3, name: 'โคมไฟ', min: 30 },
  { level: 4, name: 'พระจันทร์', min: 60 },
];

const BADGES = [
  { id: 'streak3', title: 'เริ่มต้นบุญ', desc: 'เช็คอิน 3 วันติด', need: 3 },
  { id: 'streak7', title: 'สัปดาห์แห่งสติ', desc: 'เช็คอิน 7 วันติด', need: 7 },
  { id: 'streak30', title: 'เดือนแห่งเมตตา', desc: 'เช็คอิน 30 วันติด', need: 30 },
  { id: 'points30', title: 'ผู้สั่งสมบุญ', desc: 'คะแนนรวม 30+', needPoints: 30 },
];

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getLevelInfo(totalPoints: number) {
  let current = LEVELS[0];
  for (const lv of LEVELS) {
    if (totalPoints >= lv.min) current = lv;
  }
  const next = LEVELS.find((l) => l.min > totalPoints);
  const progress = next
    ? (totalPoints - current.min) / (next.min - current.min)
    : 1;
  return { ...current, next, progress: Math.min(progress, 1) };
}

export default function DailyMeritScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [streak, setStreak] = useState<any>(null);
  const [todayMerits, setTodayMerits] = useState<any[]>([]);
  const [weekDates, setWeekDates] = useState<
    { date: string; label: string; done: boolean }[]
  >([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อน');
        router.back();
        return;
      }

      let { data: streakData } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!streakData) {
        const { data: created } = await supabase
          .from('user_streaks')
          .insert({
            user_id: user.id,
            current_streak: 0,
            longest_streak: 0,
            total_points: 0,
            level: 1,
          })
          .select()
          .single();
        streakData = created;
      }
      setStreak(streakData);

      const today = getTodayStr();
      const { data: merits } = await supabase
        .from('daily_merits')
        .select('*')
        .eq('user_id', user.id)
        .eq('merit_date', today)
        .order('created_at', { ascending: false });

      setTodayMerits(merits || []);

      const days: { date: string; label: string; done: boolean }[] = [];
      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('th-TH', { weekday: 'narrow' });
        days.push({ date: dateStr, label, done: false });
      }

      const from = days[0].date;
      const { data: weekMerits } = await supabase
        .from('daily_merits')
        .select('merit_date')
        .eq('user_id', user.id)
        .gte('merit_date', from);

      const doneSet = new Set((weekMerits || []).map((m) => m.merit_date));
      setWeekDates(
        days.map((d) => ({
          ...d,
          done: doneSet.has(d.date),
        }))
      );
    } catch (e) {
      console.error(e);
      Alert.alert('ผิดพลาด', 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const goJournal = () => {
    router.push('/journal' as any);
  };

  const checkIn = async (merit: MeritType) => {
    try {
      setChecking(merit.key);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = getTodayStr();

      const { error: insertError } = await supabase.from('daily_merits').insert({
        user_id: user.id,
        merit_type: merit.key,
        points: merit.points,
        merit_date: today,
      });
      if (insertError) throw insertError;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let current = streak?.current_streak || 0;
      let longest = streak?.longest_streak || 0;
      let total = (streak?.total_points || 0) + merit.points;
      const last = streak?.last_checkin_date;

      if (last === today) {
        // เช็คอินซ้ำวันเดียวกัน ไม่เพิ่ม streak
      } else if (last === yesterdayStr) {
        current += 1;
      } else {
        current = 1;
      }

      longest = Math.max(longest, current);
      const levelInfo = getLevelInfo(total);

      const { data: updated, error: upsertError } = await supabase
        .from('user_streaks')
        .upsert({
          user_id: user.id,
          current_streak: current,
          longest_streak: longest,
          total_points: total,
          last_checkin_date: today,
          level: levelInfo.level,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setStreak(updated);
      await loadData();

      Alert.alert(
        'อนุโมทนา 🙏',
        `บันทึก「${merit.label}」แล้ว (+${merit.points} แต้ม)\nStreak ปัจจุบัน ${current} วัน`,
        [
          { text: 'ปิด', style: 'cancel' },
          {
            text: 'เขียนบันทึกสั้น',
            onPress: goJournal,
          },
        ]
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert('ผิดพลาด', e.message || 'เช็คอินไม่สำเร็จ');
    } finally {
      setChecking(null);
    }
  };

  const levelInfo = getLevelInfo(streak?.total_points || 0);
  const doneTypesToday = new Set(todayMerits.map((m) => m.merit_type));

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText style={[styles.loadingText, { color: colors.textSecondary }]}>
          กำลังโหลดบุญประจำวัน...
        </AppText>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <AppText style={styles.headerTitle}>บุญประจำวัน</AppText>
            <TouchableOpacity onPress={goJournal} style={styles.backBtn}>
              <Ionicons name="book-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.streakBox}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View style={{ flex: 1 }}>
              <AppText style={styles.streakNumber}>
                {streak?.current_streak || 0} วันติดต่อกัน
              </AppText>
              <AppText style={styles.streakSub}>
                สูงสุด {streak?.longest_streak || 0} วัน · คะแนนรวม{' '}
                {streak?.total_points || 0}
              </AppText>
            </View>
          </View>

          <View style={styles.levelBox}>
            <View style={styles.levelTop}>
              <AppText style={styles.levelName}>
                ระดับ {levelInfo.level} · {levelInfo.name}
              </AppText>
              <AppText style={styles.levelPoints}>
                {streak?.total_points || 0}
                {levelInfo.next ? ` / ${levelInfo.next.min}` : ''} แต้ม
              </AppText>
            </View>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(levelInfo.progress * 100)}%` },
                ]}
              />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* การ์ดไป Journal */}
        <TouchableOpacity activeOpacity={0.9} onPress={goJournal} style={styles.journalWrap}>
          <LinearGradient
            colors={['#EC4899', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.journalCard}
          >
            <View style={styles.journalIconBox}>
              <Text style={{ fontSize: 22 }}>📝</Text>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.journalTitle}>บันทึกใจวันนี้</AppText>
              <AppText style={styles.journalSub}>
                เขียนสั้น ๆ แล้วให้ AI เป็นเพื่อนตอบกลับ
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        </TouchableOpacity>

        <AppText style={[styles.sectionTitle, { color: colors.text }]}>7 วันล่าสุด</AppText>
        <View
          style={[
            styles.weekRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {weekDates.map((d) => (
            <View key={d.date} style={styles.weekItem}>
              <Text style={[styles.weekLabel, { color: colors.textSecondary }]}>
                {d.label}
              </Text>
              <View
                style={[
                  styles.weekDot,
                  {
                    backgroundColor: d.done
                      ? colors.primary
                      : isDark
                      ? '#334155'
                      : '#F1F5F9',
                  },
                ]}
              >
                {d.done ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <AppText style={[styles.sectionTitle, { color: colors.text }]}>
          วันนี้ทำบุญอะไรดี
        </AppText>
        <View style={styles.meritGrid}>
          {MERIT_TYPES.map((m) => {
            const done = doneTypesToday.has(m.key);
            return (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.meritCard,
                  {
                    backgroundColor: done
                      ? isDark
                        ? '#14532D'
                        : '#F0FDF4'
                      : colors.card,
                    borderColor: done
                      ? isDark
                        ? '#166534'
                        : '#BBF7D0'
                      : isDark
                      ? '#4C1D95'
                      : '#F3E8FF',
                  },
                ]}
                onPress={() => checkIn(m)}
                disabled={!!checking}
                activeOpacity={0.85}
              >
                {checking === m.key ? (
                  <ActivityIndicator color={m.color} />
                ) : (
                  <View style={styles.meritInner}>
                    <Text style={styles.meritIcon}>{m.icon}</Text>
                    <AppText style={[styles.meritLabel, { color: colors.text }]}>
                      {m.label}
                    </AppText>
                    <AppText style={[styles.meritPoints, { color: colors.primary }]}>
                      +{m.points}
                    </AppText>
                    {done ? (
                      <View style={styles.doneBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={isDark ? '#4ADE80' : '#16A34A'}
                        />
                      </View>
                    ) : null}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <AppText style={[styles.sectionTitle, { color: colors.text }]}>บันทึกบุญวันนี้</AppText>
        {todayMerits.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <AppText style={[styles.emptyText, { color: colors.text }]}>
              ยังไม่บันทึกบุญวันนี้
            </AppText>
            <AppText style={[styles.emptySub, { color: colors.textSecondary }]}>
              เริ่มจากอย่างน้อย 1 อย่างก็ได้
            </AppText>
          </View>
        ) : (
          todayMerits.map((item) => {
            const meta = MERIT_TYPES.find((x) => x.key === item.merit_type);
            return (
              <View
                key={item.id}
                style={[
                  styles.historyItem,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={styles.historyIcon}>{meta?.icon || '✨'}</Text>
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.historyTitle, { color: colors.text }]}>
                    {meta?.label || item.merit_type}
                  </AppText>
                  <Text style={[styles.historyTime, { color: colors.textSecondary }]}>
                    {new Date(item.created_at).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.historyPoints,
                    { color: isDark ? '#4ADE80' : '#16A34A' },
                  ]}
                >
                  +{item.points}
                </Text>
              </View>
            );
          })
        )}

        <AppText style={[styles.sectionTitle, { color: colors.text }]}>เหรียญตรา</AppText>
        <View style={styles.badgeGrid}>
          {BADGES.map((b) => {
            const unlocked = b.need
              ? (streak?.longest_streak || 0) >= b.need
              : (streak?.total_points || 0) >= (b.needPoints || 0);
            return (
              <View
                key={b.id}
                style={[
                  styles.badgeCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: unlocked
                      ? isDark
                        ? '#92400E'
                        : '#FEF3C7'
                      : colors.border,
                  },
                  !unlocked && styles.badgeLocked,
                ]}
              >
                <MaterialCommunityIcons
                  name={unlocked ? 'medal' : 'medal-outline'}
                  size={28}
                  color={unlocked ? '#F59E0B' : isDark ? '#475569' : '#CBD5E1'}
                />
                <AppText style={[styles.badgeTitle, { color: colors.text }]}>
                  {b.title}
                </AppText>
                <AppText style={[styles.badgeDesc, { color: colors.textSecondary }]}>
                  {b.desc}
                </AppText>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 10 },

  header: {
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

  streakBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  streakEmoji: { fontSize: 32 },
  streakNumber: { color: '#fff', fontSize: 20, fontWeight: '800' },
  streakSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },

  levelBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 12,
  },
  levelTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  levelPoints: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  progressBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F9A8D4',
    borderRadius: 4,
  },

  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 8,
  },

  journalWrap: {
    marginBottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
  },
  journalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  journalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  journalTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  journalSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    marginTop: 2,
  },

  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  weekItem: { alignItems: 'center', gap: 8 },
  weekLabel: { fontSize: 12, fontWeight: '600' },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  meritGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  meritCard: {
    width: '31%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
  },
  meritInner: {
    alignItems: 'center',
    width: '100%',
  },
  meritIcon: { fontSize: 26, marginBottom: 6 },
  meritLabel: { fontSize: 13, fontWeight: '700' },
  meritPoints: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  doneBadge: { position: 'absolute', top: 0, right: 8 },

  emptyBox: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyText: { fontSize: 15, fontWeight: '700' },
  emptySub: { fontSize: 13, marginTop: 4 },

  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
  },
  historyIcon: { fontSize: 22 },
  historyTitle: { fontSize: 14, fontWeight: '700' },
  historyTime: { fontSize: 12, marginTop: 2 },
  historyPoints: { fontSize: 14, fontWeight: '800' },

  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  badgeLocked: {
    opacity: 0.45,
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});