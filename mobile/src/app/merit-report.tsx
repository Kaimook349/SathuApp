import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../supabase';
import AppText from './components/AppText';

const { width } = Dimensions.get('window');

const MERIT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  prayer: { label: 'สวดมนต์', icon: '🙏', color: '#7C3AED' },
  donate: { label: 'ให้ทาน', icon: '❤️', color: '#EC4899' },
  precept: { label: 'ถือศีล', icon: '🧘', color: '#0EA5E9' },
  metta: { label: 'แผ่เมตตา', icon: '💛', color: '#F59E0B' },
  temple: { label: 'ไปวัด', icon: '🏛️', color: '#10B981' },
};

export default function MeritReportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<{
    totalPoints: number;
    activityCounts: Record<string, number>;
    totalDays: number;
    topMerit: string;
    totalMoneyDonated: number;
    currentStreak: number;
  }>({
    totalPoints: 0,
    activityCounts: {},
    totalDays: 0,
    topMerit: '-',
    totalMoneyDonated: 0,
    currentStreak: 0,
  });

  useEffect(() => {
    fetchMonthlyReport();
  }, []);

  const fetchMonthlyReport = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: meritsData, error: meritsError } = await supabase
        .from('daily_merits')
        .select('merit_type, points, merit_date')
        .eq('user_id', user.id)
        .gte('created_at', firstDay);

      if (meritsError) throw meritsError;

      const totalPoints = (meritsData || []).reduce((sum, item) => sum + item.points, 0);
      
      const activityCounts = (meritsData || []).reduce((acc: Record<string, number>, item: any) => {
        acc[item.merit_type] = (acc[item.merit_type] || 0) + 1;
        return acc;
      }, {});

      const uniqueDays = new Set((meritsData || []).map((item) => item.merit_date)).size;

      let top = '-';
      let maxCount = 0;
      Object.entries(activityCounts).forEach(([type, count]) => {
        if ((count as number) > maxCount) {
          maxCount = count as number;
          top = MERIT_LABELS[type]?.label || type;
        }
      });

      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'success')
        .gte('created_at', firstDay);

      if (donationsError) console.error(donationsError);

      const totalMoneyDonated = (donationsData || []).reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

      const { data: streakData, error: streakError } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      if (streakError) console.error(streakError);

      setReport({
        totalPoints,
        activityCounts,
        totalDays: uniqueDays,
        topMerit: top,
        totalMoneyDonated,
        currentStreak: streakData?.current_streak || 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentMonthName = new Date().toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <AppText style={styles.loadingText}>กำลังรวบรวมผลบุญประจำเดือน...</AppText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>สรุปบุญประจำเดือน</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* การ์ดหลัก (Gradient Card) */}
        <LinearGradient
          colors={['#7C3AED', '#DB2777']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={15} color="#FDE047" />
            <AppText style={styles.heroBadgeText}>MONTHLY INSIGHTS</AppText>
          </View>

          <Text style={styles.heroMonth}>ประจำเดือน{currentMonthName}</Text>
          
          <Text style={styles.bigPoints}>{report.totalPoints}</Text>
          <AppText style={styles.label}>แต้มบุญสะสมเดือนนี้</AppText>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{report.totalDays} วัน</Text>
              <AppText style={styles.statLabel}>วันที่ทำบุญ</AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{report.topMerit}</Text>
              <AppText style={styles.statLabel}>กิจเด่นประจำเดือน</AppText>
            </View>
          </View>
        </LinearGradient>

        {/* การ์ดสถิติเสริม (ยอดบริจาค & Streak) */}
        <View style={styles.subStatsRow}>
          <View style={styles.subStatCard}>
            <MaterialCommunityIcons name="hand-heart" size={24} color="#EC4899" />
            <Text style={styles.subStatValue}>฿{report.totalMoneyDonated.toLocaleString()}</Text>
            <AppText style={styles.subStatLabel}>ยอดทำบุญร่วมบริจาค</AppText>
          </View>
          <View style={styles.subStatCard}>
            <MaterialCommunityIcons name="fire" size={24} color="#F59E0B" />
            <Text style={styles.subStatValue}>{report.currentStreak} วันติด</Text>
            <AppText style={styles.subStatLabel}>ความต่อเนื่อง (Streak)</AppText>
          </View>
        </View>

        {/* รายละเอียดสัดส่วนการทำบุญ */}
        <AppText style={styles.sectionTitle}>สถิติการสั่งสมความดี</AppText>
        
        {Object.keys(report.activityCounts).length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="moon-outline" size={36} color="#94A3B8" />
            <AppText style={styles.emptyText}>ยังไม่มีบันทึกบุญในเดือนนี้ เริ่มต้นทำความดีกันเลย!</AppText>
          </View>
        ) : (
          Object.entries(report.activityCounts).map(([type, count]) => {
            const meta = MERIT_LABELS[type] || { label: type, icon: '✨', color: '#7C3AED' };
            return (
              <View key={type} style={styles.rowCard}>
                <View style={[styles.iconBox, { backgroundColor: meta.color + '20' }]}>
                  <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <AppText style={styles.rowTitle}>{meta.label}</AppText>
                  <AppText style={styles.rowSub}>ทำกิจกรรมนี้อย่างต่อเนื่อง</AppText>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{count as number} ครั้ง</Text>
                </View>
              </View>
            );
          })
        )}

        {/* คำอวยพร / ข้อคิดท้ายรีพอร์ต */}
        <View style={styles.quoteCard}>
          <MaterialCommunityIcons name="flower-tulip" size={24} color="#7C3AED" style={{ marginBottom: 6 }} />
          <AppText style={styles.quoteText}>
            "การสะสมบุญทีละน้อย เปรียบเสมือนหยาดน้ำที่ตุ่มเต็มทีละหยด ย่อมเต็มได้ด้วยความเพียร"
          </AppText>
        </View>

        {/* ปุ่มแชร์ */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => Alert.alert('แชร์สำเร็จ', 'ฟีเจอร์แชร์ภาพสรุปบุญจะเปิดให้ใช้งานเร็วๆ นี้!')}
          activeOpacity={0.85}
        >
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <AppText style={styles.shareText}>แชร์ความสุข & ผลบุญนี้</AppText>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, color: '#64748B', fontWeight: '600' },

  header: {
    backgroundColor: '#4C1D95',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

  scrollContent: { padding: 16, paddingBottom: 40 },

  heroCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  heroBadgeText: { color: '#FDE047', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroMonth: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  bigPoints: { fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  label: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginBottom: 24 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },

  subStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  subStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  subStatValue: { fontSize: 16, fontWeight: '800', color: '#1E2937', marginTop: 8 },
  subStatLabel: { fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 12 },

  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#1E2937' },
  rowSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  countBadge: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  countText: { color: '#7C3AED', fontWeight: '800', fontSize: 13 },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  emptyText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 8, fontWeight: '500' },

  quoteCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginVertical: 10,
  },
  quoteText: { fontSize: 13, color: '#6B21A8', textAlign: 'center', fontStyle: 'italic', lineHeight: 20 },

  shareButton: {
    backgroundColor: '#EC4899',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    gap: 8,
    marginTop: 10,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  shareText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});