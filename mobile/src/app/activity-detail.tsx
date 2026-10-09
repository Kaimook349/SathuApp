import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';
import LiveDonationWall from './LiveDonationWall';
import { useTheme } from '../context/ThemeContext';
// ถ้า error ลอง '../../context/ThemeContext'
import AppText from './components/AppText';
// ถ้า error ลอง '../../components/AppText'

const { width } = Dimensions.get('window');

export default function ActivityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();

  const [activity, setActivity] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [donatedTotal, setDonatedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  const fetchReviewsData = async (activityId: string) => {
    try {
      // นับทั้งหมด + ค่าเฉลี่ย
      const { data: allReviews, error: countError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('activity_id', activityId);

      if (countError) throw countError;

      const totalCount = allReviews?.length || 0;
      setReviewCount(totalCount);

      if (totalCount > 0) {
        const avg =
          (allReviews || []).reduce((acc, curr) => acc + Number(curr.rating || 0), 0) /
          totalCount;
        setAverageRating(Number(avg.toFixed(1)));
      } else {
        setAverageRating(0);
      }

      // ดึง 3 รายการล่าสุดมาโชว์
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id, rating, comment, created_at,
          profiles:user_id (username, first_name, last_name, avatar_url)
        `)
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.log('Error fetching reviews:', err);
      setReviews([]);
      setReviewCount(0);
      setAverageRating(0);
    }
  };

  const fetchActivityDetail = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('temples_activities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        setActivity(null);
        return;
      }

      setActivity(data);

      if (data.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url, image_url')
          .eq('id', data.created_by)
          .single();
        setCreator(profile);
      }

      const { data: donations } = await supabase
        .from('donations')
        .select('amount')
        .eq('activity_id', id)
        .eq('status', 'success');

      const total = (donations || []).reduce(
        (sum, d) => sum + Number(d.amount || 0),
        0
      );
      setDonatedTotal(total);

      await fetchReviewsData(id as string);
    } catch (error) {
      console.log('Error fetching activity detail:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchActivityDetail();
  }, [id, fetchActivityDetail]);

  const getCreatorName = () => {
    if (!creator) return 'สมาชิกผู้จัดงาน';
    return (
      creator.username ||
      [creator.first_name, creator.last_name].filter(Boolean).join(' ') ||
      'สมาชิกผู้จัดงาน'
    );
  };

  const getCreatorAvatar = () => {
    if (creator?.avatar_url || creator?.image_url) {
      return creator.avatar_url || creator.image_url;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      getCreatorName()
    )}&background=7C3AED&color=fff`;
  };

  const formatThaiDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusInfo = (status?: string) => {
    switch (status) {
      case 'approved':
      case 'passed':
        return {
          label: 'ผ่านการอนุมัติ',
          color: isDark ? '#4ADE80' : '#166534',
          bg: isDark ? '#14532D' : '#DCFCE7',
        };
      case 'pending':
        return {
          label: 'รออนุมัติ',
          color: isDark ? '#FBBF24' : '#92400E',
          bg: isDark ? '#78350F' : '#FEF3C7',
        };
      case 'rejected':
        return {
          label: 'ไม่อนุมัติ',
          color: isDark ? '#F87171' : '#991B1B',
          bg: isDark ? '#7F1D1D' : '#FEE2E2',
        };
      default:
        return {
          label: status || 'ไม่ระบุ',
          color: colors.textSecondary,
          bg: isDark ? '#334155' : '#F1F5F9',
        };
    }
  };

  const getFullAddress = () => {
    const parts = [
      activity?.village,
      activity?.subdistrict,
      activity?.district,
      activity?.province,
    ].filter(Boolean);
    return parts.join(' · ') || activity?.province || '-';
  };

  const handleAddFriend = async () => {
    try {
      if (!activity?.created_by) {
        Alert.alert('แจ้งเตือน', 'ไม่พบข้อมูลผู้สร้างกิจกรรม');
        return;
      }

      setIsSendingRequest(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      if (user.id === activity.created_by) {
        Alert.alert('แจ้งเตือน', 'คุณไม่สามารถเพิ่มเพื่อนกับตัวเองได้');
        return;
      }

      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${activity.created_by}),and(user_id.eq.${activity.created_by},friend_id.eq.${user.id})`
        );

      if (existing && existing.length > 0) {
        Alert.alert('แจ้งเตือน', 'คุณได้ส่งคำขอหรือเป็นเพื่อนกันอยู่แล้ว');
        return;
      }

      const { error } = await supabase.from('friendships').insert([
        {
          user_id: user.id,
          friend_id: activity.created_by,
          status: 'pending',
        },
      ]);

      if (error) throw error;
      Alert.alert('สำเร็จ', `ส่งคำขอเป็นเพื่อนถึง "${getCreatorName()}" แล้ว`);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ส่งคำขอไม่สำเร็จ');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const goDonate = () => {
    router.push({
      pathname: '/donation' as any,
      params: {
        activityId: activity.id,
        activityName: activity.activity_name,
        templeName: activity.temple_name,
        province: activity.province,
        imageUrl: activity.image_url || '',
        description: activity.description || '',
        bankName: activity.bank_name || '',
        bankAccount: activity.bank_account || '',
        accountName: activity.account_name || '',
        donationPurpose: activity.donation_purpose || '',
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText style={[styles.loadingText, { color: colors.textSecondary }]}>
          กำลังโหลดข้อมูลกิจกรรม...
        </AppText>
      </SafeAreaView>
    );
  }

  if (!activity) {
    return (
      <SafeAreaView
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <Ionicons name="alert-circle-outline" size={50} color={colors.textSecondary} />
        <AppText style={[styles.errorText, { color: colors.textSecondary }]}>
          ไม่พบข้อมูลกิจกรรมนี้
        </AppText>
        <TouchableOpacity
          style={[styles.backBtnInline, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <AppText style={styles.backBtnInlineText}>ย้อนกลับ</AppText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusInfo(activity.status);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Banner */}
      <View style={styles.bannerWrap}>
        <Image
          source={{
            uri:
              activity.image_url ||
              'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09',
          }}
          style={styles.bannerImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.65)']}
          style={styles.bannerGradient}
        />

        <SafeAreaView edges={['top']} style={styles.bannerTopBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#1E2937" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => Alert.alert('แชร์', 'ฟีเจอร์แชร์จะเปิดใช้งานเร็ว ๆ นี้')}
          >
            <Ionicons name="share-outline" size={20} color="#1E2937" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Badge */}
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <AppText style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </AppText>
            </View>
            {activity.category ? (
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: isDark ? '#4C1D95' : '#EDE9FE' },
                ]}
              >
                <AppText
                  style={[
                    styles.categoryText,
                    { color: isDark ? '#E9D5FF' : '#6D28D9' },
                  ]}
                >
                  {activity.category === 'event' ? 'กิจกรรม' : activity.category}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* ชื่อกิจกรรมจาก DB ไม่แปล */}
          <Text style={[styles.activityName, { color: colors.text }]}>
            {activity.activity_name}
          </Text>

          <View style={styles.templeRow}>
            <Ionicons name="business" size={16} color={colors.primary} />
            <Text style={[styles.templeText, { color: colors.primary }]}>
              {activity.temple_name}
            </Text>
          </View>

          {/* Info chips */}
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
              <Ionicons name="calendar" size={16} color={colors.primary} />
              <View>
                <AppText style={[styles.chipLabel, { color: colors.textSecondary }]}>
                  วันที่
                </AppText>
                <Text style={[styles.chipValue, { color: colors.text }]}>
                  {formatThaiDate(activity.event_date)}
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
              <View>
                <AppText style={[styles.chipLabel, { color: colors.textSecondary }]}>
                  เวลา
                </AppText>
                <Text style={[styles.chipValue, { color: colors.text }]}>
                  {activity.event_time || 'ไม่ระบุ'}
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
                  {getFullAddress()}
                </Text>
              </View>
            </View>
          </View>

          {/* ยอดบริจาคสรุป */}
          <View
            style={[
              styles.donateStatBox,
              {
                backgroundColor: isDark ? '#4A044E' : '#FDF2F8',
                borderColor: isDark ? '#86198F' : '#FBCFE8',
              },
            ]}
          >
            <View>
              <AppText
                style={[
                  styles.donateStatLabel,
                  { color: isDark ? '#F9A8D4' : '#9D174D' },
                ]}
              >
                ยอดบริจาครวม (อนุมัติแล้ว)
              </AppText>
              <Text
                style={[
                  styles.donateStatValue,
                  { color: isDark ? '#FBCFE8' : '#BE185D' },
                ]}
              >
                ฿{donatedTotal.toLocaleString()}
              </Text>
            </View>
            <MaterialCommunityIcons name="hand-heart" size={32} color="#EC4899" />
          </View>

          {/* Live Donation Wall */}
          <View style={styles.liveWallWrapper}>
            <LiveDonationWall activityId={activity.id} />
          </View>

          {/* รายละเอียด */}
          <View style={styles.section}>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>
              รายละเอียดกิจกรรม
            </AppText>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
              {activity.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
            </Text>
          </View>

          {/* วัตถุประสงค์การบริจาค */}
          {activity.donation_purpose ? (
            <View style={styles.section}>
              <AppText style={[styles.sectionTitle, { color: colors.text }]}>
                วัตถุประสงค์การบริจาค
              </AppText>
              <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
                {activity.donation_purpose}
              </Text>
            </View>
          ) : null}

          {/* ข้อมูลบัญชี */}
          {(activity.bank_name || activity.bank_account || activity.account_name) && (
            <View
              style={[
                styles.bankBox,
                {
                  backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
                  borderColor: isDark ? '#4C1D95' : '#EDE9FE',
                },
              ]}
            >
              <AppText style={[styles.sectionTitle, { color: colors.text }]}>
                ช่องทางรับบริจาค
              </AppText>
              {activity.bank_name ? (
                <InfoLine
                  icon="business-outline"
                  label="ธนาคาร"
                  value={activity.bank_name}
                  colors={colors}
                  isDark={isDark}
                />
              ) : null}
              {activity.account_name ? (
                <InfoLine
                  icon="person-outline"
                  label="ชื่อบัญชี"
                  value={activity.account_name}
                  colors={colors}
                  isDark={isDark}
                />
              ) : null}
              {activity.bank_account ? (
                <InfoLine
                  icon="card-outline"
                  label="เลขบัญชี / พร้อมเพย์"
                  value={activity.bank_account}
                  colors={colors}
                  isDark={isDark}
                />
              ) : null}
            </View>
          )}

          {/* รีวิว */}
          <View style={[styles.reviewsSection, { borderColor: colors.border }]}>
            <View style={styles.reviewsHeaderRow}>
              <View>
                <AppText
                  style={[styles.sectionTitle, { color: colors.text, marginBottom: 2 }]}
                >
                  ความคิดเห็น & รีวิว
                </AppText>
                <View style={styles.ratingSummaryRow}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={[styles.ratingAvgText, { color: colors.text }]}>
                    {averageRating > 0 ? averageRating : '0.0'}
                  </Text>
                  <AppText
                    style={[styles.ratingCountText, { color: colors.textSecondary }]}
                  >
                    ({reviewCount} รีวิว)
                  </AppText>
                </View>
              </View>

              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/reviews' as any,
                    params: { activityId: activity.id },
                  })
                }
              >
                <AppText style={[styles.seeAllReviewsText, { color: colors.primary }]}>
                  ดูทั้งหมด &gt;
                </AppText>
              </TouchableOpacity>
            </View>

            {reviews.length === 0 ? (
              <View
                style={[
                  styles.emptyReviewBox,
                  { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
                ]}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={28}
                  color={colors.textSecondary}
                />
                <AppText
                  style={[styles.emptyReviewText, { color: colors.textSecondary }]}
                >
                  ยังไม่มีความคิดเห็น เป็นคนแรกที่มารีวิวเลย!
                </AppText>
              </View>
            ) : (
              reviews.map((item) => {
                const profile = item.profiles;
                const displayName =
                  profile?.username ||
                  [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
                  'ผู้ใช้งาน';
                const avatar = profile?.avatar_url || 'https://i.pravatar.cc/150';

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.reviewCardItem,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.reviewCardTop}>
                      <Image source={{ uri: avatar }} style={styles.reviewAvatar} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text
                          style={[styles.reviewUserName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {displayName}
                        </Text>
                        <View style={{ flexDirection: 'row', marginTop: 2, gap: 2 }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons
                              key={s}
                              name={s <= item.rating ? 'star' : 'star-outline'}
                              size={12}
                              color="#F59E0B"
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                    <Text
                      style={[styles.reviewCommentText, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {item.comment}
                    </Text>
                  </View>
                );
              })
            )}

            <TouchableOpacity
              style={[
                styles.writeReviewDirectBtn,
                {
                  backgroundColor: isDark ? '#4C1D95' : '#F3E8FF',
                  borderColor: colors.primary,
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: '/write-review' as any,
                  params: { activityId: activity.id },
                })
              }
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <AppText style={[styles.writeReviewDirectText, { color: colors.primary }]}>
                เขียนรีวิวความประทับใจ
              </AppText>
            </TouchableOpacity>
          </View>

          {/* ผู้สร้าง */}
          <View
            style={[
              styles.creatorBox,
              {
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderColor: colors.border,
              },
            ]}
          >
            <Image source={{ uri: getCreatorAvatar() }} style={styles.creatorAvatar} />
            <View style={{ flex: 1 }}>
              <AppText style={[styles.creatorTitle, { color: colors.textSecondary }]}>
                ผู้จัดกิจกรรม
              </AppText>
              <Text style={[styles.creatorName, { color: colors.text }]}>
                {getCreatorName()}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addFriendBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddFriend}
              disabled={isSendingRequest}
            >
              <Ionicons name="person-add" size={14} color="#fff" />
              <AppText style={styles.addFriendText}>
                {isSendingRequest ? '...' : 'เพิ่มเพื่อน'}
              </AppText>
            </TouchableOpacity>
          </View>

          <AppText style={[styles.metaText, { color: colors.textSecondary }]}>
            สร้างเมื่อ{' '}
            {activity.created_at
              ? new Date(activity.created_at).toLocaleDateString('th-TH')
              : '-'}
          </AppText>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity style={styles.donateBtn} onPress={goDonate} activeOpacity={0.9}>
          <LinearGradient
            colors={['#EC4899', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.donateBtnGradient}
          >
            <Ionicons name="heart" size={18} color="#fff" />
            <AppText style={styles.donateBtnText}>ร่วมทำบุญ / สนับสนุน</AppText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const InfoLine = ({
  icon,
  label,
  value,
  colors,
  isDark,
}: {
  icon: any;
  label: string;
  value: string;
  colors: any;
  isDark: boolean;
}) => (
  <View
    style={[
      styles.infoLine,
      { borderBottomColor: isDark ? '#4C1D95' : '#EDE9FE' },
    ]}
  >
    <Ionicons name={icon} size={16} color={colors.primary} />
    <AppText style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</AppText>
    <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 10 },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 16,
  },
  backBtnInline: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnInlineText: { color: '#fff', fontWeight: '700' },

  bannerWrap: { height: 260, backgroundColor: '#E2E8F0' },
  bannerImage: { width: '100%', height: '100%' },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  bannerTopBar: {
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
    minHeight: 500,
  },

  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: { fontSize: 12, fontWeight: '700' },

  activityName: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: 32,
  },
  templeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  templeText: { fontSize: 15, fontWeight: '600' },

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

  donateStatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  donateStatLabel: { fontSize: 12, fontWeight: '600' },
  donateStatValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },

  liveWallWrapper: {
    marginBottom: 20,
    marginHorizontal: -4,
  },

  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionContent: { fontSize: 14, lineHeight: 22 },

  bankBox: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 13, width: 110 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '600' },

  reviewsSection: {
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ratingSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingAvgText: {
    fontSize: 14,
    fontWeight: '700',
  },
  ratingCountText: {
    fontSize: 12,
  },
  seeAllReviewsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyReviewBox: {
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  emptyReviewText: {
    fontSize: 13,
    textAlign: 'center',
  },
  reviewCardItem: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  reviewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CBD5E1',
  },
  reviewUserName: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewCommentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  writeReviewDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  writeReviewDirectText: {
    fontSize: 14,
    fontWeight: '700',
  },

  creatorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
  },
  creatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE9FE',
  },
  creatorTitle: { fontSize: 11 },
  creatorName: { fontSize: 14, fontWeight: '700' },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  addFriendText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  metaText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  donateBtn: { borderRadius: 16, overflow: 'hidden' },
  donateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  donateBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});