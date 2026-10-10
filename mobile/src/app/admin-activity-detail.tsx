import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';
// ถ้า error ลอง '../../context/ThemeContext'
import AppText from './components/AppText';
// ถ้า error ลอง '../../components/AppText'

const { width } = Dimensions.get('window');
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&h=500&fit=crop';

export default function AdminActivityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadDetail();
  }, [id]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_activities')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      setItem(data);
    } catch (e) {
      console.log('admin activity detail error', e);
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTH = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleShare = async () => {
    if (!item) return;
    try {
      await Share.share({
        message: `${item.title}\n${item.location || ''}\n${formatDateTH(item.date)}${
          item.time ? ` · ${item.time}` : ''
        }`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <AppText style={{ color: colors.textSecondary, marginTop: 10 }}>
          กำลังโหลด...
        </AppText>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <AppText style={[styles.errorText, { color: colors.text }]}>
          ไม่พบกิจกรรมนี้ หรือยังไม่ได้เผยแพร่
        </AppText>
        <TouchableOpacity style={styles.backPill} onPress={() => router.back()}>
          <AppText style={styles.backPillText}>ย้อนกลับ</AppText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const progress = Math.min(100, Math.max(0, Number(item.completeness) || 0));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Banner */}
      <View style={styles.bannerWrap}>
        <Image
          source={{ uri: item.image || FALLBACK_IMAGE }}
          style={styles.bannerImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.bannerGradient}
        />

        <SafeAreaView edges={['top']} style={styles.topBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#1E2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#1E2937" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: isDark ? '#4C1D95' : '#EDE9FE' },
              ]}
            >
              <Ionicons
                name="business"
                size={12}
                color={isDark ? '#E9D5FF' : '#7C3AED'}
              />
              <AppText
                style={[
                  styles.badgeText,
                  { color: isDark ? '#E9D5FF' : '#7C3AED' },
                ]}
              >
                กิจกรรมจากวัด
              </AppText>
            </View>
          </View>

          {/* ชื่อกิจกรรมจาก DB ไม่แปล */}
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>

          {/* Meta chips */}
          <View style={styles.chipGrid}>
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="calendar" size={16} color="#7C3AED" />
              <View style={{ flex: 1 }}>
                <AppText style={[styles.chipLabel, { color: colors.textSecondary }]}>
                  วันที่
                </AppText>
                <Text style={[styles.chipValue, { color: colors.text }]}>
                  {formatDateTH(item.date)}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.chip,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="time" size={16} color="#EC4899" />
              <View style={{ flex: 1 }}>
                <AppText style={[styles.chipLabel, { color: colors.textSecondary }]}>
                  เวลา
                </AppText>
                <Text style={[styles.chipValue, { color: colors.text }]}>
                  {item.time || 'ไม่ระบุ'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.chip,
                {
                  width: '100%',
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="location" size={16} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <AppText style={[styles.chipLabel, { color: colors.textSecondary }]}>
                  สถานที่
                </AppText>
                <Text style={[styles.chipValue, { color: colors.text }]}>
                  {item.location || '-'}
                </Text>
              </View>
            </View>
          </View>

          {/* Progress */}
          {typeof item.completeness === 'number' && (
            <View
              style={[
                styles.progressBox,
                {
                  backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
                  borderColor: isDark ? '#4C1D95' : '#EDE9FE',
                },
              ]}
            >
              <View style={styles.progressHeader}>
                <AppText style={[styles.progressTitle, { color: colors.text }]}>
                  ความคืบหน้า
                </AppText>
                <Text style={styles.progressPercent}>{progress}%</Text>
              </View>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
              >
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>
              รายละเอียด
            </AppText>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
              {item.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
            </Text>
          </View>
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
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  backPill: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backPillText: { color: '#fff', fontWeight: '700' },

  bannerWrap: { height: 260, backgroundColor: '#E2E8F0' },
  bannerImage: { width: '100%', height: '100%' },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scroll: { flex: 1, marginTop: -24 },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    minHeight: 400,
  },

  badgeRow: { flexDirection: 'row', marginBottom: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  title: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 16,
  },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    width: (width - 60) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 11 },
  chipValue: { fontSize: 13, fontWeight: '700', marginTop: 1 },

  progressBox: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTitle: { fontSize: 14, fontWeight: '700' },
  progressPercent: { fontSize: 14, fontWeight: '800', color: '#7C3AED' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 4,
  },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  sectionBody: { fontSize: 14, lineHeight: 22 },
});