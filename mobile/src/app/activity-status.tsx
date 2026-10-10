import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import BottomNav from './components/BottomNav';
import { useTheme } from '../context/ThemeContext';
// ถ้า error ลอง '../../context/ThemeContext'
import AppText from './components/AppText';
// ถ้า error ลอง '../../components/AppText'

export default function ActivityStatusScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyActivities();

    const subscription = supabase
      .channel('public:temples_activities')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'temples_activities' },
        () => {
          fetchMyActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchMyActivities = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('temples_activities')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <AppText style={styles.headerTitle}>สถานะกิจกรรมของฉัน</AppText>
          <AppText style={styles.headerSubtitle}>
            ติดตามการตรวจสอบและอนุมัติกิจกรรม
          </AppText>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>
              รายการที่เสนอทั้งหมด
            </AppText>
            <View
              style={[
                styles.countBadge,
                { backgroundColor: isDark ? '#4C1D95' : '#EDE9FE' },
              ]}
            >
              <AppText
                style={[
                  styles.countText,
                  { color: isDark ? '#E9D5FF' : '#7C3AED' },
                ]}
              >
                {activities.length} รายการ
              </AppText>
            </View>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText style={[styles.loadingText, { color: colors.textSecondary }]}>
                กำลังโหลดข้อมูลกิจกรรม...
              </AppText>
            </View>
          ) : activities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconContainer,
                  { backgroundColor: isDark ? '#4C1D95' : '#F3E8FF' },
                ]}
              >
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={50}
                  color={colors.primary}
                />
              </View>
              <AppText style={[styles.emptyText, { color: colors.text }]}>
                ยังไม่มีรายการกิจกรรม
              </AppText>
              <AppText style={[styles.emptySubText, { color: colors.textSecondary }]}>
                คุณยังไม่ได้ส่งคำขอสร้างกิจกรรมใดๆ ในขณะนี้
              </AppText>
            </View>
          ) : (
            activities.map((item) => {
              const isApproved =
                item.status === 'approved' || item.status === 'passed';

              return (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.cardStripe,
                      isApproved ? styles.stripeSuccess : styles.stripePending,
                    ]}
                  />

                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.cardImage} />
                  ) : (
                    <View
                      style={[
                        styles.imagePlaceholder,
                        { backgroundColor: isDark ? '#1E1B4B' : '#FAF5FF' },
                      ]}
                    >
                      <Ionicons name="image-outline" size={28} color="#A78BFA" />
                      <AppText
                        style={[
                          styles.placeholderText,
                          { color: isDark ? '#C4B5FD' : '#A78BFA' },
                        ]}
                      >
                        ไม่มีรูปภาพประกอบ
                      </AppText>
                    </View>
                  )}

                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      {/* ชื่อกิจกรรมจาก DB ไม่แปล */}
                      <Text
                        style={[styles.activityName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.activity_name}
                      </Text>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isApproved
                              ? isDark
                                ? '#14532D'
                                : '#DCFCE7'
                              : isDark
                              ? '#78350F'
                              : '#FEF3C7',
                          },
                        ]}
                      >
                        <Ionicons
                          name={isApproved ? 'checkmark-circle' : 'time-outline'}
                          size={13}
                          color={
                            isApproved
                              ? isDark
                                ? '#4ADE80'
                                : '#16A34A'
                              : isDark
                              ? '#FBBF24'
                              : '#D97706'
                          }
                          style={{ marginRight: 4 }}
                        />
                        <AppText
                          style={[
                            styles.statusText,
                            {
                              color: isApproved
                                ? isDark
                                  ? '#4ADE80'
                                  : '#16A34A'
                                : isDark
                                ? '#FBBF24'
                                : '#D97706',
                            },
                          ]}
                        >
                          {isApproved ? 'ผ่านการอนุมัติ' : 'รออนุมัติ'}
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.templeRow}>
                      <Ionicons
                        name="location-sharp"
                        size={14}
                        color={colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[styles.templeName, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {item.temple_name} ({item.province})
                      </Text>
                    </View>

                    <Text
                      style={[styles.description, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {item.description ||
                        'ไม่มีรายละเอียดเพิ่มเติมสำหรับกิจกรรมนี้'}
                    </Text>

                    <View
                      style={[
                        styles.cardFooter,
                        { borderTopColor: isDark ? '#334155' : '#F8FAFC' },
                      ]}
                    >
                      <View style={styles.dateRow}>
                        <Feather
                          name="calendar"
                          size={12}
                          color={colors.textSecondary}
                          style={{ marginRight: 4 }}
                        />
                        <AppText
                          style={[styles.dateText, { color: colors.textSecondary }]}
                        >
                          ส่งเมื่อ{' '}
                          {new Date(item.created_at).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </AppText>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#7C3AED',
    paddingTop: 45,
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: '#E9D5FF', fontSize: 12, marginTop: 2 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 110 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { fontSize: 11, fontWeight: '600' },
  centerContainer: { paddingVertical: 60, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySubText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  cardStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    zIndex: 2,
  },
  stripeSuccess: { backgroundColor: '#10B981' },
  stripePending: { backgroundColor: '#F59E0B' },
  cardImage: { width: '100%', height: 150, resizeMode: 'cover' },
  imagePlaceholder: {
    width: '100%',
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  cardBody: { padding: 16, paddingLeft: 20 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  templeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  templeName: { fontSize: 13, fontWeight: '600', flex: 1 },
  description: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 11, fontWeight: '500' },
});