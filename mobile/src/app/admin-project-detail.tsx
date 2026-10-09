import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StatusBar,
  Share,
  Alert,
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

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&h=500&fit=crop';

export default function AdminProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();

  const [project, setProject] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [donatedTotal, setDonatedTotal] = useState(0);
  const [donorCount, setDonorCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  const fetchReviews = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(
          `
          id,
          rating,
          comment,
          created_at,
          profiles:user_id (
            username,
            first_name,
            last_name,
            avatar_url,
            image_url
          )
        `
        )
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      const list = data || [];
      setReviews(list);

      const { count } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id);

      if (typeof count === 'number') setReviewCount(count);
      else setReviewCount(list.length);

      if (count && count > 0) {
        const { data: allRatings } = await supabase
          .from('reviews')
          .select('rating')
          .eq('project_id', id);
        if (allRatings?.length) {
          const avg =
            allRatings.reduce((s, r) => s + (Number(r.rating) || 0), 0) /
            allRatings.length;
          setAverageRating(Math.round(avg * 10) / 10);
        }
      } else {
        setAverageRating(0);
      }
    } catch (e) {
      console.log('fetchReviews error', e);
      setReviews([]);
      setAverageRating(0);
      setReviewCount(0);
    }
  }, [id]);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data, error } = await supabase
        .from('admin_projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);

      if (data?.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url, image_url')
          .eq('id', data.created_by)
          .maybeSingle();
        setOwner(profile || null);
      } else {
        setOwner(null);
      }

      const { data: donations, error: dErr } = await supabase
        .from('donations')
        .select('amount')
        .eq('project_id', id)
        .eq('status', 'success');

      if (!dErr && donations) {
        const total = donations.reduce(
          (sum, row) => sum + (Number(row.amount) || 0),
          0
        );
        setDonatedTotal(total);
        setDonorCount(donations.length);
      } else {
        setDonatedTotal(Number(data?.raised) || 0);
        setDonorCount(Number(data?.donors) || 0);
      }

      await fetchReviews();
    } catch (e) {
      console.log('fetchProject error', e);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id, fetchReviews]);

  useEffect(() => {
    fetchProject();
    if (!id) return;

    const channel = supabase
      .channel(`project-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donations',
          filter: `project_id=eq.${id}`,
        },
        () => fetchProject()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_projects',
          filter: `id=eq.${id}`,
        },
        () => fetchProject()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: `project_id=eq.${id}`,
        },
        () => fetchReviews()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchProject, fetchReviews]);

  const formatMoney = (n?: number | null) =>
    (Number(n) || 0).toLocaleString('th-TH');

  const formatDateTH = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatReviewDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const getOwnerDisplayName = () => {
    if (!owner) return project?.owner_name || 'เจ้าของโครงการ';
    const full = [owner.first_name, owner.last_name].filter(Boolean).join(' ');
    return full || owner.username || project?.owner_name || 'เจ้าของโครงการ';
  };

  const getReviewerName = (item: any) => {
    const p = item?.profiles;
    if (!p) return 'ผู้ใช้งาน';
    const full = [p.first_name, p.last_name].filter(Boolean).join(' ');
    return full || p.username || 'ผู้ใช้งาน';
  };

  const goal = Number(project?.goal) || 0;
  const progress =
    goal > 0 ? Math.min(100, Math.round((donatedTotal / goal) * 100)) : 0;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `ร่วมบริจาคโครงการ "${project?.title || ''}" ผ่านแอป Sathu 🙏`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  const goDonate = () => {
    if (!project) return;
    router.push({
      pathname: '/donation' as any,
      params: {
        projectId: project.id,
        activityName: project.title,
        templeName: project.category || 'โครงการบริจาค',
        imageUrl: project.image || '',
        goal: String(goal || 0),
        bankName: project.bank_name || '',
        bankAccount: project.bank_account || '',
        accountName: project.account_name || '',
      },
    });
  };

  const goChatWithOwner = () => {
    if (!project?.created_by) {
      Alert.alert(
        'ยังไม่พร้อม',
        'โครงการนี้ยังไม่ได้ผูกเจ้าของในระบบ กรุณาติดต่อแอดมิน'
      );
      return;
    }
    if (currentUserId && project.created_by === currentUserId) {
      Alert.alert('แจ้งเตือน', 'คุณเป็นเจ้าของโครงการนี้แล้ว');
      return;
    }

    router.push({
      pathname: '/chat' as any,
      params: {
        receiverId: project.created_by,
        receiverName: getOwnerDisplayName(),
        receiverAvatar: owner?.avatar_url || owner?.image_url || '',
      },
    });
  };

  const goAllReviews = () => {
    router.push({
      pathname: '/reviews' as any,
      params: { projectId: String(id) },
    });
  };

  const goWriteReview = () => {
    router.push({
      pathname: '/write-review' as any,
      params: { projectId: String(id) },
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color="#7C3AED" />
        <AppText style={{ color: colors.textSecondary, marginTop: 10 }}>
          กำลังโหลดโครงการ...
        </AppText>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <AppText style={{ color: colors.text, marginTop: 12, fontWeight: '700' }}>
          ไม่พบโครงการ
        </AppText>
        <TouchableOpacity style={styles.backSimple} onPress={() => router.back()}>
          <AppText style={{ color: '#7C3AED', fontWeight: '700' }}>ย้อนกลับ</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <View style={styles.heroWrap}>
        <Image
          source={{ uri: project.image || FALLBACK_IMAGE }}
          style={styles.heroImage}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.55)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <SafeAreaView edges={['top']} style={styles.heroTopBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>

        <View style={styles.heroBottom}>
          {!!project.category && (
            <View style={styles.categoryBadge}>
              <Ionicons name="heart" size={12} color="#EF4444" />
              <Text style={styles.categoryText}>{project.category}</Text>
            </View>
          )}
          <Text style={styles.heroTitle} numberOfLines={2}>
            {project.title}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {/* ยอด */}
        <View
          style={[
            styles.totalCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={{ flex: 1 }}>
            <AppText style={[styles.totalLabel, { color: colors.textSecondary }]}>
              ยอดบริจาครวม (อนุมัติแล้ว)
            </AppText>
            <Text style={styles.totalValue}>฿{formatMoney(donatedTotal)}</Text>
            <AppText style={[styles.goalLine, { color: colors.textSecondary }]}>
              เป้าหมาย ฿{formatMoney(goal)} · {progress}% · {donorCount} ผู้ร่วมบุญ
            </AppText>
          </View>
          <View style={styles.totalIcon}>
            <MaterialCommunityIcons name="hand-heart" size={26} color="#EC4899" />
          </View>
        </View>

        <View style={styles.progressSection}>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
            ]}
          >
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* วันที่ */}
        <View style={styles.dateRow}>
          <View
            style={[
              styles.dateBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="calendar-outline" size={16} color="#7C3AED" />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <AppText style={[styles.dateLabel, { color: colors.textSecondary }]}>
                เริ่มต้น
              </AppText>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {formatDateTH(project.start_date)}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.dateBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="flag-outline" size={16} color="#EC4899" />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <AppText style={[styles.dateLabel, { color: colors.textSecondary }]}>
                สิ้นสุด
              </AppText>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {formatDateTH(project.end_date)}
              </Text>
            </View>
          </View>
        </View>

        {/* เจ้าของโครงการ */}
        <View
          style={[
            styles.ownerCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.ownerLeft}>
            {owner?.avatar_url || owner?.image_url ? (
              <Image
                source={{ uri: owner.avatar_url || owner.image_url }}
                style={styles.ownerAvatar}
              />
            ) : (
              <View style={[styles.ownerAvatar, styles.ownerAvatarPlaceholder]}>
                <Ionicons name="person" size={22} color="#7C3AED" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <AppText style={[styles.ownerLabel, { color: colors.textSecondary }]}>
                เจ้าของโครงการ
              </AppText>
              <Text style={[styles.ownerName, { color: colors.text }]} numberOfLines={1}>
                {getOwnerDisplayName()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.chatBtn, { opacity: project.created_by ? 1 : 0.5 }]}
            activeOpacity={0.85}
            onPress={goChatWithOwner}
          >
            <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
            <AppText style={styles.chatBtnText}>แชท</AppText>
          </TouchableOpacity>
        </View>

        {/* รายละเอียด */}
        <View style={styles.section}>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>
            รายละเอียดโครงการ
          </AppText>
          <Text style={[styles.descText, { color: colors.textSecondary }]}>
            {project.description || 'ยังไม่มีรายละเอียดเพิ่มเติม'}
          </Text>
        </View>

        {/* หมายเหตุ */}
        <View
          style={[
            styles.noteBox,
            {
              backgroundColor: isDark ? '#422006' : '#FFFBEB',
              borderColor: isDark ? '#78350F' : '#FDE68A',
            },
          ]}
        >
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={18}
            color="#D97706"
          />
          <AppText style={[styles.noteText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
            ทุกยอดบริจาคจะถูกตรวจสอบก่อนนับเข้าโครงการ
            เมื่ออนุมัติแล้ว ยอดและจำนวนผู้ร่วมบุญจะอัปเดตให้อัตโนมัติ
          </AppText>
        </View>

        {/* Live wall */}
        <View style={styles.section}>
          <LiveDonationWall activityId={String(id)} />
        </View>

        {/* ช่องทางรับบริจาค */}
        {(project.bank_name || project.bank_account || project.account_name) && (
          <View
            style={[
              styles.payCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <AppText
              style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}
            >
              ช่องทางรับบริจาค
            </AppText>
            {!!project.bank_name && (
              <View style={styles.payRow}>
                <Ionicons name="business-outline" size={18} color="#7C3AED" />
                <AppText style={[styles.payLabel, { color: colors.textSecondary }]}>
                  ธนาคาร
                </AppText>
                <Text style={[styles.payValue, { color: colors.text }]}>
                  {project.bank_name}
                </Text>
              </View>
            )}
            {!!project.account_name && (
              <View style={styles.payRow}>
                <Ionicons name="person-outline" size={18} color="#7C3AED" />
                <AppText style={[styles.payLabel, { color: colors.textSecondary }]}>
                  ชื่อบัญชี
                </AppText>
                <Text style={[styles.payValue, { color: colors.text }]}>
                  {project.account_name}
                </Text>
              </View>
            )}
            {!!project.bank_account && (
              <View style={styles.payRow}>
                <Ionicons name="card-outline" size={18} color="#7C3AED" />
                <AppText style={[styles.payLabel, { color: colors.textSecondary }]}>
                  เลขบัญชี / พร้อมเพย์
                </AppText>
                <Text style={[styles.payValue, { color: colors.text }]}>
                  {project.bank_account}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* รีวิว */}
        <View
          style={[
            styles.reviewCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.reviewHeader}>
            <AppText
              style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}
            >
              ความคิดเห็น & รีวิว
            </AppText>
            <TouchableOpacity onPress={goAllReviews}>
              <AppText style={styles.seeAllText}>ดูทั้งหมด {'>'}</AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={[styles.ratingValue, { color: colors.text }]}>
              {averageRating.toFixed(1)}
            </Text>
            <AppText style={[styles.ratingCount, { color: colors.textSecondary }]}>
              ({reviewCount} รีวิว)
            </AppText>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.reviewEmpty}>
              <Ionicons name="chatbubble-outline" size={28} color={colors.textSecondary} />
              <AppText style={[styles.reviewEmptyText, { color: colors.textSecondary }]}>
                ยังไม่มีความคิดเห็น เป็นคนแรกที่มารีวิวเลย!
              </AppText>
            </View>
          ) : (
            reviews.map((item) => (
              <View
                key={item.id}
                style={[styles.reviewItem, { borderBottomColor: colors.border }]}
              >
                <View style={styles.reviewItemTop}>
                  {item.profiles?.avatar_url || item.profiles?.image_url ? (
                    <Image
                      source={{
                        uri: item.profiles.avatar_url || item.profiles.image_url,
                      }}
                      style={styles.reviewAvatar}
                    />
                  ) : (
                    <View style={[styles.reviewAvatar, styles.ownerAvatarPlaceholder]}>
                      <Ionicons name="person" size={16} color="#7C3AED" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reviewName, { color: colors.text }]}>
                      {getReviewerName(item)}
                    </Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= (item.rating || 0) ? 'star' : 'star-outline'}
                          size={12}
                          color="#F59E0B"
                        />
                      ))}
                      <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                        {formatReviewDate(item.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>
                  {item.comment}
                </Text>
              </View>
            ))
          )}

          <TouchableOpacity
            style={[styles.writeReviewBtn, { borderColor: '#C4B5FD' }]}
            activeOpacity={0.85}
            onPress={goWriteReview}
          >
            <Ionicons name="create-outline" size={18} color="#7C3AED" />
            <AppText style={styles.writeReviewText}>เขียนรีวิวความประทับใจ</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.bottomChatBtn, { borderColor: colors.border }]}
          activeOpacity={0.85}
          onPress={goChatWithOwner}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#7C3AED" />
          <AppText style={styles.bottomChatText}>คุยกับเจ้าของ</AppText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.donateBtn} activeOpacity={0.9} onPress={goDonate}>
          <LinearGradient
            colors={['#EC4899', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.donateGradient}
          >
            <Ionicons name="heart" size={18} color="#fff" />
            <AppText style={styles.donateText}>ร่วมบริจาค</AppText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  backSimple: { marginTop: 16, padding: 12 },

  heroWrap: { width: '100%', height: 260, position: 'relative' },
  heroImage: { width: '100%', height: '100%', backgroundColor: '#E2E8F0' },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBottom: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  categoryText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  totalCard: {
    marginHorizontal: 16,
    marginTop: -28,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 3,
  },
  totalLabel: { fontSize: 12, fontWeight: '600' },
  totalValue: { fontSize: 28, fontWeight: '800', color: '#EC4899', marginTop: 2 },
  goalLine: { fontSize: 12, marginTop: 4 },
  totalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressSection: { marginHorizontal: 16, marginTop: 12 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 4 },

  dateRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
  },
  dateBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  dateLabel: { fontSize: 11, fontWeight: '600' },
  dateValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  ownerCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ownerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  ownerAvatar: { width: 46, height: 46, borderRadius: 23 },
  ownerAvatarPlaceholder: {
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerLabel: { fontSize: 11, fontWeight: '600' },
  ownerName: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  descText: { fontSize: 14, lineHeight: 22 },

  noteBox: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '500' },

  payCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  payLabel: { fontSize: 13, width: 110 },
  payValue: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'right' },

  reviewCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllText: { color: '#7C3AED', fontWeight: '700', fontSize: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  ratingValue: { fontSize: 16, fontWeight: '800' },
  ratingCount: { fontSize: 13 },
  reviewEmpty: { alignItems: 'center', paddingVertical: 18, gap: 8 },
  reviewEmptyText: { fontSize: 13, textAlign: 'center' },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reviewItemTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewName: { fontSize: 14, fontWeight: '700' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  reviewDate: { fontSize: 11, marginLeft: 6 },
  reviewComment: { fontSize: 13, lineHeight: 19 },
  writeReviewBtn: {
    marginTop: 14,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
  },
  writeReviewText: { color: '#7C3AED', fontWeight: '800', fontSize: 14 },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  bottomChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    backgroundColor: '#F5F3FF',
  },
  bottomChatText: { color: '#7C3AED', fontWeight: '800', fontSize: 13 },
  donateBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  donateGradient: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  donateText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});