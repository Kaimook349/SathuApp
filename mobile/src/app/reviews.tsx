import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

type FilterType = 'all' | 'highest' | 'lowest';

export default function ReviewsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();

  const activityId = (params.activityId as string) || '';
  const projectId = (params.projectId as string) || '';

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useFocusEffect(
    useCallback(() => {
      fetchReviews();
    }, [filter, activityId, projectId])
  );

  const fetchReviews = async () => {
    try {
      setLoading(true);

      let query = supabase.from('reviews').select(`
          id,
          rating,
          comment,
          created_at,
          profiles:user_id (
            username,
            first_name,
            last_name,
            avatar_url
          )
        `);

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (activityId) {
        query = query.eq('activity_id', activityId);
      }

      if (filter === 'highest') {
        query = query.order('rating', { ascending: false });
      } else if (filter === 'lowest') {
        query = query.order('rating', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (profile: any) => {
    if (!profile) return 'ผู้ใช้งาน';
    return (
      profile.username ||
      (profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile.first_name) ||
      'ผู้ใช้งาน'
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear() + 543).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const goWriteReview = () => {
    router.push({
      pathname: '/write-review' as any,
      params: {
        ...(projectId ? { projectId } : {}),
        ...(activityId ? { activityId } : {}),
      },
    });
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'highest', label: 'สูงสุด' },
    { key: 'lowest', label: 'ต่ำสุด' },
  ];

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.background : '#FFFFFF' },
      ]}
      edges={['top']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>
          รีวิวทั้งหมด
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                active
                  ? styles.filterChipActive
                  : {
                      backgroundColor: isDark ? colors.card : '#F1F5F9',
                    },
              ]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.85}
            >
              <AppText
                style={[
                  styles.filterText,
                  active
                    ? styles.filterTextActive
                    : { color: colors.textSecondary },
                ]}
              >
                {f.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#7C3AED" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {reviews.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={48}
                color={colors.textSecondary}
              />
              <AppText style={[styles.emptyText, { color: colors.textSecondary }]}>
                ยังไม่มีรีวิวสำหรับรายการนี้
              </AppText>
            </View>
          ) : (
            reviews.map((item, index) => {
              const isLast = index === reviews.length - 1;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.reviewItem,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: isDark ? colors.border : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.reviewHeader}>
                    {item.profiles?.avatar_url ? (
                      <Image
                        source={{ uri: item.profiles.avatar_url }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.avatarPlaceholder,
                          {
                            backgroundColor: isDark ? '#334155' : '#E2E8F0',
                          },
                        ]}
                      >
                        <Ionicons
                          name="person"
                          size={20}
                          color={isDark ? '#94A3B8' : '#64748B'}
                        />
                      </View>
                    )}

                    <View style={styles.meta}>
                      <Text style={[styles.userName, { color: colors.text }]}>
                        {getDisplayName(item.profiles)}
                      </Text>

                      <View style={styles.starDateRow}>
                        <View style={styles.stars}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons
                              key={s}
                              name={s <= item.rating ? 'star' : 'star-outline'}
                              size={12}
                              color="#FBBF24"
                              style={{ marginRight: 1 }}
                            />
                          ))}
                        </View>
                        <Text
                          style={[
                            styles.dateText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {formatDate(item.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {!!item.comment && (
                    <Text style={[styles.comment, { color: colors.text }]}>
                      {item.comment}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.writeButton}
        activeOpacity={0.9}
        onPress={goWriteReview}
      >
        <Ionicons name="create-outline" size={18} color="#fff" />
        <AppText style={styles.writeButtonText}>เขียนรีวิว</AppText>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: '#7C3AED',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },

  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  emptyBox: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },

  reviewItem: {
    paddingVertical: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  meta: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  starDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
  },
  comment: {
    marginTop: 8,
    marginLeft: 52,
    fontSize: 14,
    lineHeight: 20,
  },

  writeButton: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 6,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  writeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});