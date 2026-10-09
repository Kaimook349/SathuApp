import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../supabase';

import BottomNav from './components/BottomNav';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&h=400&fit=crop';

// ภาพ local ต้องใช้ require() เท่านั้น
const LOY_BANNER = require('../../assets/images/Gemini_Generated_Image_q6mq7mq6mq7mq6mq.jpeg');
const FORTUNE_BANNER = require('../../assets/images/Gemini_Generated_Image_a7uf4pa7uf4pa7uf.jpeg');

const MeritScreen = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [donationActivities, setDonationActivities] = useState<any[]>([]);
  const [adminProjects, setAdminProjects] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    fetchDonationActivities();
    fetchAdminProjects();

    const subscription = supabase
      .channel('public:merit_screen')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'temples_activities' },
        () => fetchDonationActivities()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_projects' },
        () => fetchAdminProjects()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchDonationActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('temples_activities')
        .select('*')
        .eq('category', 'donation')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonationActivities(data || []);
    } catch (error) {
      console.error('Error fetching donation activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminProjects = async () => {
    try {
      setLoadingProjects(true);
      const { data, error } = await supabase
        .from('admin_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminProjects(data || []);
    } catch (error) {
      console.error('Error fetching admin projects:', error);
      setAdminProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const formatDateTH = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatMoney = (n?: number | null) => {
    const v = Number(n) || 0;
    return v.toLocaleString('th-TH');
  };

  const calcProgress = (raised?: number | null, goal?: number | null) => {
    const g = Number(goal) || 0;
    const r = Number(raised) || 0;
    if (g <= 0) return 0;
    return Math.min(100, Math.round((r / g) * 100));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <AppText style={[styles.title, { color: colors.text }]}>
              ทำบุญ & สักการะ
            </AppText>
            <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>
              เสริมดวงชะตา สร้างบุญกุศลออนไลน์
            </AppText>
          </View>

          <TouchableOpacity
            style={styles.historyButton}
            activeOpacity={0.8}
            onPress={() => router.push('/history' as any)}
          >
            <Feather name="clock" size={15} color="#fff" />
            <AppText style={styles.historyButtonText}>ประวัติ</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          {/* 1) กิจกรรมพิเศษ */}
          <View style={styles.sectionHeader}>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>
              กิจกรรมพิเศษ
            </AppText>
            <AppText style={[styles.sectionHint, { color: colors.textSecondary }]}>
              ทำได้ทันที
            </AppText>
          </View>

          <TouchableOpacity
            style={[
              styles.cardWrapper,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
            activeOpacity={0.9}
            onPress={() => router.push('/loy-krathong' as any)}
          >
            <View style={styles.heroCard}>
              <Image source={LOY_BANNER} style={styles.cardImage} resizeMode="cover" />
              <View
                style={[
                  styles.heroOverlay,
                  { backgroundColor: 'rgba(76, 29, 149, 0.45)' },
                ]}
              >
                <View style={styles.tagRow}>
                  <MaterialCommunityIcons name="spa" size={16} color="#FCE7F3" />
                  <AppText style={styles.tagText}>เทศกาลพิเศษ • 2569</AppText>
                </View>
                <AppText style={styles.heroTitle}>ลอยกระทงออนไลน์ & ทำบุญ</AppText>
                <AppText style={styles.heroDesc}>
                  นับถอยหลัง · บริจาค · ลอยเสมือนจริง
                </AppText>
              </View>
            </View>
          </TouchableOpacity>

          {/* 2) โครงการบริจาค */}
          <View style={styles.sectionHeader}>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>
              โครงการบริจาค
            </AppText>
            <AppText style={[styles.sectionHint, { color: colors.textSecondary }]}>
              ระดมทุนช่วยเหลือ
            </AppText>
          </View>

          {loadingProjects ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary || '#7C3AED'} />
              <AppText style={[styles.loadingText, { color: colors.textSecondary }]}>
                กำลังโหลดโครงการ...
              </AppText>
            </View>
          ) : adminProjects.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="heart-outline" size={32} color={colors.textSecondary} />
              <AppText style={[styles.emptyText, { color: colors.textSecondary }]}>
                ยังไม่มีโครงการบริจาคในขณะนี้
              </AppText>
            </View>
          ) : (
            adminProjects.map((item) => {
              const progress = calcProgress(item.raised, item.goal);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.projectCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: '/admin-project-detail' as any,
                      params: { id: item.id },
                    })
                  }
                >
                  <Image
                    source={{ uri: item.image || FALLBACK_IMAGE }}
                    style={styles.projectImage}
                  />
                  <View style={styles.projectBody}>
                    {!!item.category && (
                      <View
                        style={[
                          styles.badge,
                          {
                            alignSelf: 'flex-start',
                            backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2',
                            marginBottom: 6,
                          },
                        ]}
                      >
                        <Ionicons name="heart" size={12} color="#EF4444" />
                        <AppText
                          style={[
                            styles.badgeText,
                            { color: isDark ? '#FCA5A5' : '#EF4444' },
                          ]}
                        >
                          {item.category}
                        </AppText>
                      </View>
                    )}

                    <Text style={[styles.projectTitle, { color: colors.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>

                    {!!item.description && (
                      <Text
                        style={[styles.projectDesc, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    )}

                    <View style={styles.moneyRow}>
                      <Text style={[styles.raisedText, { color: '#16A34A' }]}>
                        ฿{formatMoney(item.raised)}
                      </Text>
                      <Text style={[styles.goalText, { color: colors.textSecondary }]}>
                        / ฿{formatMoney(item.goal)}
                      </Text>
                    </View>

                    <View style={styles.progressWrap}>
                      <View
                        style={[
                          styles.progressTrack,
                          { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                        ]}
                      >
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                      </View>
                      <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                        {progress}%
                      </Text>
                    </View>

                    <View style={styles.projectFooter}>
                      <View style={styles.metaRow}>
                        <Ionicons
                          name="people-outline"
                          size={14}
                          color={colors.textSecondary}
                        />
                        <AppText style={[styles.metaText, { color: colors.textSecondary }]}>
                          {Number(item.donors) || 0} ผู้ร่วมบุญ
                        </AppText>
                      </View>
                      {(item.start_date || item.end_date) && (
                        <Text style={[styles.dateRange, { color: colors.textSecondary }]}>
                          {formatDateTH(item.start_date)}
                          {item.end_date ? ` - ${formatDateTH(item.end_date)}` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* 3) ร่วมบุญ & บริจาค */}
          <View style={styles.sectionHeader}>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>
              ร่วมบุญ & บริจาค
            </AppText>
            <AppText style={[styles.sectionHint, { color: colors.textSecondary }]}>
              สนับสนุนกิจกรรม
            </AppText>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary || '#7C3AED'} />
              <AppText style={[styles.loadingText, { color: colors.textSecondary }]}>
                กำลังโหลดข้อมูลบุญ...
              </AppText>
            </View>
          ) : donationActivities.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="heart-dislike-outline"
                size={32}
                color={colors.textSecondary}
              />
              <AppText style={[styles.emptyText, { color: colors.textSecondary }]}>
                ยังไม่มีรายการบริจาคในขณะนี้
              </AppText>
            </View>
          ) : (
            donationActivities.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.cardWrapper,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: '/activity-detail' as any,
                    params: { id: item.id },
                  })
                }
              >
                <View style={styles.heroCard}>
                  <Image
                    source={{
                      uri: item.image_url || 'https://picsum.photos/id/237/600/300',
                    }}
                    style={styles.cardImage}
                  />
                  <View
                    style={[
                      styles.heroOverlay,
                      { backgroundColor: 'rgba(15, 23, 42, 0.55)' },
                    ]}
                  >
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2' },
                      ]}
                    >
                      <Ionicons name="heart" size={12} color="#EF4444" />
                      <AppText
                        style={[
                          styles.badgeText,
                          { color: isDark ? '#FCA5A5' : '#EF4444' },
                        ]}
                      >
                        {item.donation_purpose || 'ร่วมบุญช่วยเหลือ'}
                      </AppText>
                    </View>
                    <Text style={styles.heroTitle} numberOfLines={1}>
                      {item.activity_name}
                    </Text>
                    <Text style={styles.heroDesc} numberOfLines={1}>
                      📍 {item.temple_name}
                      {item.province ? ` (${item.province})` : ''}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* 4) ดูดวง — ใช้ FORTUNE_BANNER */}
          <View style={styles.sectionHeader}>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>เสริมดวง</AppText>
          </View>

          <TouchableOpacity
            style={[
              styles.cardWrapper,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
            activeOpacity={0.9}
            onPress={() => router.push('/fortune' as any)}
          >
            <View style={[styles.heroCard, { height: 150 }]}>
              <Image source={FORTUNE_BANNER} style={styles.cardImage} resizeMode="cover" />
              <View
                style={[
                  styles.heroOverlay,
                  { backgroundColor: 'rgba(30, 27, 75, 0.55)' },
                ]}
              >
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: isDark ? '#78350F' : '#FEF3C7' },
                  ]}
                >
                  <Ionicons name="sparkles" size={12} color="#F59E0B" />
                  <AppText
                    style={[
                      styles.badgeText,
                      { color: isDark ? '#FCD34D' : '#D97706' },
                    ]}
                  >
                    สายมู
                  </AppText>
                </View>
                <AppText style={styles.heroTitle}>ดูดวงรายวัน & เซียมซีออนไลน์</AppText>
              </View>
            </View>
          </TouchableOpacity>

          {/* 5) สถานะของฉัน */}
          <TouchableOpacity
            style={[
              styles.statusButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            activeOpacity={0.9}
            onPress={() => router.push('/activity-status' as any)}
          >
            <View style={styles.statusButtonContent}>
              <View
                style={[
                  styles.statusIconBox,
                  { backgroundColor: isDark ? '#4C1D95' : '#F3E8FF' },
                ]}
              >
                <Feather
                  name="clipboard"
                  size={20}
                  color={isDark ? '#E9D5FF' : '#7C3AED'}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <AppText style={[styles.statusButtonTitle, { color: colors.text }]}>
                  สถานะกิจกรรมของฉัน
                </AppText>
                <AppText
                  style={[styles.statusButtonSubtitle, { color: colors.textSecondary }]}
                >
                  ตรวจสอบคำขอสร้างกิจกรรมและสถานะอนุมัติ
                </AppText>
              </View>
              <View
                style={[
                  styles.chevronBox,
                  { backgroundColor: isDark ? '#4C1D95' : '#FAF5FF' },
                ]}
              >
                <Feather
                  name="chevron-right"
                  size={18}
                  color={isDark ? '#E9D5FF' : '#7C3AED'}
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/add-temple' as any)}
      >
        <View style={styles.fabInner}>
          <Ionicons name="add" size={30} color="#fff" />
        </View>
      </TouchableOpacity>

      <BottomNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  historyButton: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  contentContainer: { paddingHorizontal: 16, paddingBottom: 120 },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionHint: { fontSize: 12, fontWeight: '600' },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: { fontSize: 13 },
  emptyCard: {
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  emptyText: { fontSize: 13, marginTop: 8, fontWeight: '500' },
  cardWrapper: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  heroCard: { borderRadius: 20, overflow: 'hidden', height: 170 },
  cardImage: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    justifyContent: 'flex-end',
    padding: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    marginBottom: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  tagText: { color: '#FCE7F3', fontSize: 11, fontWeight: '700' },
  heroTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  heroDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: { fontSize: 12, flex: 1 },
  projectCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
  },
  projectImage: { width: '100%', height: 140, backgroundColor: '#E2E8F0' },
  projectBody: { padding: 14 },
  projectTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  projectDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  raisedText: { fontSize: 18, fontWeight: '800' },
  goalText: { fontSize: 13, marginLeft: 4 },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRange: { fontSize: 11 },
  statusButton: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  statusButtonContent: { flexDirection: 'row', alignItems: 'center' },
  statusIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusButtonTitle: { fontSize: 15, fontWeight: '700' },
  statusButtonSubtitle: { fontSize: 12, marginTop: 2 },
  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 95,
    right: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#E9D5FF',
  },
  fabInner: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
  },
});

export default MeritScreen;