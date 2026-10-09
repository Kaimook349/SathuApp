import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';

const RequestsScreen = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchRealData();
    }, [])
  );

  useEffect(() => {
    let channel: any;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('requests-donation-notifs')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'donations',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const oldStatus = payload.old?.status;
            const newStatus = payload.new?.status;

            if (oldStatus === 'pending' && newStatus === 'success') {
              Alert.alert('🎉 อนุมัติแล้ว', 'การบริจาคของคุณได้รับการอนุมัติแล้ว');
              fetchRealData();
            }

            if (oldStatus === 'pending' && newStatus === 'rejected') {
              Alert.alert('ไม่ผ่านการอนุมัติ', 'สลิปของคุณไม่ผ่านการตรวจสอบ');
              fetchRealData();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchRealData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchRealData();
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'เมื่อสักครู่';
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
    });
  };

  const fetchRealData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setFriendRequests([]);
        setSuggestions([]);
        setNotifications([]);
        return;
      }

      // 1. คำขอเป็นเพื่อน
      const { data: reqData, error: reqError } = await supabase
        .from('friendships')
        .select('id, user_id')
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (reqError) throw reqError;

      if (reqData && reqData.length > 0) {
        const senderIds = reqData.map((item) => item.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url, image_url')
          .in('id', senderIds);

        const formattedReqs = reqData.map((item: any) => {
          const profile = profilesData?.find((p) => p.id === item.user_id);
          const displayName =
            profile?.username ||
            [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
            'ผู้ใช้งาน';

          return {
            id: item.id,
            name: displayName,
            desc: 'ส่งคำขอเป็นเพื่อนถึงคุณ',
            avatar: profile?.avatar_url || profile?.image_url || null,
          };
        });
        setFriendRequests(formattedReqs);
      } else {
        setFriendRequests([]);
      }

      // 2. แนะนำเพื่อน
      const { data: existingFriends } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const excludeIds = new Set<string>([user.id]);
      existingFriends?.forEach((f) => {
        excludeIds.add(f.user_id);
        excludeIds.add(f.friend_id);
      });

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url, image_url, phone')
        .neq('id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (profileError) {
        console.log('Profiles error:', profileError);
        setSuggestions([]);
      } else if (profileData && profileData.length > 0) {
        const filtered = profileData.filter((item) => !excludeIds.has(item.id));
        const shuffled = [...filtered].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, 3);

        const formattedSuggestions = picked.map((item: any) => {
          const displayName =
            item.username ||
            [item.first_name, item.last_name].filter(Boolean).join(' ') ||
            (item.phone ? `ผู้ใช้ ${String(item.phone).slice(-4)}` : 'ผู้ใช้งาน');

          return {
            id: item.id,
            name: displayName,
            desc: 'คนที่คุณอาจรู้จัก',
            avatar: item.avatar_url || item.image_url || null,
          };
        });

        setSuggestions(formattedSuggestions);
      } else {
        setSuggestions([]);
      }

      // 3. แจ้งเตือน — ใช้เฉพาะตาราง notifications
      const { data: systemNotifs, error: notifError } = await supabase
        .from('notifications')
        .select('id, title, body, type, related_id, is_read, created_at, read_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notifError) {
        console.log('notifications error:', notifError.message);
        setNotifications([]);
      } else {
        const formattedSystemNotifs = (systemNotifs || []).map((item: any) => ({
          id: `notif-${item.id}`,
          title: item.title || 'แจ้งเตือน',
          desc: item.body || '',
          time: formatRelativeTime(item.created_at),
          icon:
            item.type === 'activity_reminder' || item.type === 'activity'
              ? 'calendar'
              : item.type === 'friend_request' || item.type === 'friend'
              ? 'account-plus'
              : item.type === 'donation'
              ? 'check-circle'
              : 'bell',
          isSystem: true,
          isRead: !!item.is_read,
          source: 'notifications',
          rawId: item.id,
          createdAt: item.created_at,
          type: item.type,
        }));

        setNotifications(formattedSystemNotifs);
      }
    } catch (error) {
      console.error('Error fetching real data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRealData();
  };

  const markAsRead = async (item: any) => {
    if (item.source !== 'notifications' || !item.rawId || item.isRead) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', item.rawId);

    if (error) {
      console.log('markAsRead error', error.message);
      fetchRealData();
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      if (error) throw error;
      Alert.alert('สำเร็จ', 'ยอมรับคำขอเป็นเพื่อนแล้ว');
      fetchRealData();
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.from('friendships').delete().eq('id', requestId);
      if (error) throw error;
      fetchRealData();
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('friendships').insert([
        {
          user_id: user.id,
          friend_id: targetUserId,
          status: 'pending',
        },
      ]);

      if (error) {
        if (error.code === '23505') {
          Alert.alert('แจ้งเตือน', 'คุณได้ส่งคำขอหรือเป็นเพื่อนกับผู้ใช้นี้ไปแล้ว');
        } else {
          throw error;
        }
        return;
      }

      Alert.alert('สำเร็จ', 'ส่งคำขอเป็นเพื่อนเรียบร้อยแล้ว');
      setSuggestions((prev) => prev.filter((s) => s.id !== targetUserId));
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    }
  };

  const handleDismissSuggestion = (userId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== userId));
  };

  const renderAvatar = (uri: string | null) => {
    if (uri) {
      return <Image source={{ uri }} style={styles.avatarLarge} />;
    }
    return (
      <View style={[styles.avatarLarge, styles.avatarPlaceholder]}>
        <Ionicons name="person" size={26} color="#94A3B8" />
      </View>
    );
  };

  const headerBg = isDark ? '#0F172A' : '#1E293B';
  const contentBg = colors.background;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: headerBg }]}>
      <StatusBar barStyle="light-content" backgroundColor={headerBg} />

      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>ข้อความ</Text>
          <Text style={styles.headerSub}>
            {unreadCount > 0 ? `ยังไม่อ่าน ${unreadCount} รายการ` : 'อ่านครบแล้ว'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: contentBg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <TouchableOpacity
          style={[
            styles.quickAccessCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: isDark ? 1 : 0,
            },
          ]}
          onPress={() => router.push('/friend-list' as any)}
        >
          <View style={styles.quickAccessLeft}>
            <Ionicons name="people" size={20} color={colors.text} />
            <Text style={[styles.quickAccessText, { color: colors.text }]}>
              ดูเพื่อนทั้งหมด
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* คำขอเป็นเพื่อน */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>คำขอเป็นเพื่อน</Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ marginVertical: 20 }}
          />
        ) : friendRequests.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              ไม่มีคำขอเป็นเพื่อนในขณะนี้
            </Text>
          </View>
        ) : (
          friendRequests.map((item) => (
            <View
              key={item.id}
              style={[
                styles.requestCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              {renderAvatar(item.avatar)}
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.desc, { color: colors.textSecondary }]}>{item.desc}</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(item.id)}
                  >
                    <Text style={styles.acceptText}>ยอมรับ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.rejectButton,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => handleRejectRequest(item.id)}
                  >
                    <Text
                      style={[styles.rejectText, { color: isDark ? '#CBD5E1' : '#475569' }]}
                    >
                      ปฏิเสธ
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        {/* แจ้งเตือน */}
        <Text style={[styles.sectionTitle, { marginTop: 24, color: colors.text }]}>
          การแจ้งเตือน
          {unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>

        {loading ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ marginVertical: 20 }}
          />
        ) : notifications.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              ยังไม่มีการแจ้งเตือน
            </Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={[
                styles.notifCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: isDark ? 1 : 0,
                },
                !notif.isRead && {
                  backgroundColor: isDark ? '#1E3A5F' : '#F0F9FF',
                },
              ]}
              onPress={() => {
                markAsRead(notif);
                Alert.alert(notif.title, notif.desc || '—');
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.systemIconBox,
                  { backgroundColor: isDark ? '#831843' : '#FCE7F3' },
                ]}
              >
                <MaterialCommunityIcons
                  name={notif.icon as any}
                  size={22}
                  color="#FF4D94"
                />
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{notif.title}</Text>
                <Text
                  style={[styles.desc, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {notif.desc}
                </Text>
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                  {notif.time}
                </Text>
              </View>
              {!notif.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))
        )}

        {/* แนะนำเพื่อน */}
        <Text style={[styles.sectionTitle, { marginTop: 24, color: colors.text }]}>
          แนะนำเพื่อนให้คุณ
        </Text>

        {loading ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ marginVertical: 20 }}
          />
        ) : suggestions.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              ยังไม่มีคำแนะนำเพื่อนในขณะนี้
            </Text>
          </View>
        ) : (
          suggestions.map((item) => (
            <View
              key={item.id}
              style={[
                styles.requestCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              {renderAvatar(item.avatar)}
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.desc, { color: colors.textSecondary }]}>{item.desc}</Text>
              </View>

              <View style={styles.suggestionActions}>
                <TouchableOpacity
                  style={styles.addFriendButton}
                  onPress={() => handleSendRequest(item.id)}
                >
                  <Text style={styles.addFriendText}>เพิ่มเพื่อน</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dismissButton,
                    { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                  ]}
                  onPress={() => handleDismissSuggestion(item.id)}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  scrollView: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
  },

  quickAccessCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickAccessLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickAccessText: { fontSize: 16, fontWeight: '600' },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginHorizontal: 16,
    marginBottom: 10,
  },

  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarLarge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  systemIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700' },
  desc: { fontSize: 13, marginTop: 2 },
  timeText: { fontSize: 11, marginTop: 4 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },

  actionRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  acceptButton: {
    backgroundColor: '#FF4D94',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  rejectText: { fontWeight: '700', fontSize: 13 },

  suggestionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addFriendButton: {
    backgroundColor: '#FF4D94',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addFriendText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  dismissButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyText: { fontSize: 14, fontWeight: '500' },
});

export default RequestsScreen;