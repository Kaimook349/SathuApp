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
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';

export default function FriendRequestsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. คำขอเป็นเพื่อน
      const { data: reqData, error: reqError } = await supabase
        .from('friendships')
        .select(
          `
          id,
          user_id,
          profiles:user_id (id, username, avatar_url)
        `
        )
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (reqError) throw reqError;

      if (reqData) {
        const formattedReqs = reqData.map((item: any) => ({
          id: item.id,
          name: item.profiles?.username || 'ผู้ใช้งาน',
          desc: 'ได้ส่งคำขอเป็นเพื่อนถึงคุณ',
          avatar:
            item.profiles?.avatar_url ||
            'https://picsum.photos/id/64/200/200',
        }));
        setFriendRequests(formattedReqs);
      } else {
        setFriendRequests([]);
      }

      // 2. แจ้งเตือนจากตาราง notifications
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!notifError && notifData) {
        setNotifications(notifData);
      } else {
        setNotifications([]);
      }

      // 3. แนะนำเพื่อน
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .neq('id', user.id)
        .limit(10);

      if (profileError) throw profileError;

      if (profileData) {
        const formattedSuggestions = profileData.map((item: any) => ({
          id: item.id,
          name: item.username || 'ผู้ใช้งาน',
          desc: 'คนที่คุณอาจรู้จัก',
          avatar: item.avatar_url || 'https://picsum.photos/id/1005/200/200',
        }));
        setSuggestions(formattedSuggestions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      Alert.alert('สำเร็จ', 'ยอมรับคำขอเป็นเพื่อนแล้ว');
      fetchData();
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

      if (error) throw error;

      Alert.alert('สำเร็จ', 'ส่งคำขอเป็นเพื่อนแล้ว');
    } catch (error: any) {
      Alert.alert(
        'แจ้งเตือน',
        'คุณได้ส่งคำขอหรือเป็นเพื่อนกับผู้ใช้นี้ไปแล้ว'
      );
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error(error);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'activity_reminder':
        return 'calendar';
      case 'friend_request':
        return 'person-add';
      case 'friend_accepted':
        return 'checkmark-circle';
      default:
        return 'notifications';
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
        {notifications.some((n) => !n.is_read) && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>อ่านทั้งหมด</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ===== แจ้งเตือน (จากตาราง notifications) ===== */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            แจ้งเตือน
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
                },
              ]}
            >
              <Text
                style={[styles.emptyText, { color: colors.textSecondary }]}
              >
                ยังไม่มีแจ้งเตือน
              </Text>
            </View>
          ) : (
            notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.notifCard,
                  {
                    backgroundColor: item.is_read
                      ? colors.card
                      : isDark
                      ? '#1E293B'
                      : '#EFF6FF',
                    borderColor: colors.border,
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
                onPress={() => markAsRead(item.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.notifIcon,
                    { backgroundColor: isDark ? '#334155' : '#DBEAFE' },
                  ]}
                >
                  <Ionicons
                    name={getNotifIcon(item.type) as any}
                    size={20}
                    color={isDark ? '#93C5FD' : '#2563EB'}
                  />
                </View>
                <View style={styles.notifInfo}>
                  <Text
                    style={[
                      styles.notifTitle,
                      {
                        color: colors.text,
                        fontWeight: item.is_read ? '500' : '700',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {item.body ? (
                    <Text
                      style={[
                        styles.notifBody,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                  ) : null}
                  <Text
                    style={[styles.notifTime, { color: colors.textSecondary }]}
                  >
                    {new Date(item.created_at).toLocaleString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                {!item.is_read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ===== คำขอเป็นเพื่อน ===== */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            คำขอเป็นเพื่อน
          </Text>

          {loading ? null : friendRequests.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.emptyText, { color: colors.textSecondary }]}
              >
                ไม่มีคำขอเป็นเพื่อนในขณะนี้
              </Text>
            </View>
          ) : (
            friendRequests.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
              >
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.desc, { color: colors.textSecondary }]}
                  >
                    {item.desc}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptRequest(item.id)}
                >
                  <Text style={styles.acceptText}>ยอมรับ</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* ===== แนะนำ ===== */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            แนะนำ
          </Text>

          {suggestions.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.emptyText, { color: colors.textSecondary }]}
              >
                ไม่มีรายชื่อแนะนำเพิ่มเติม
              </Text>
            </View>
          ) : (
            suggestions.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
              >
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.desc, { color: colors.textSecondary }]}
                  >
                    {item.desc}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.followButton}
                  onPress={() => handleSendRequest(item.id)}
                >
                  <Text style={styles.followText}>เพิ่มเพื่อน</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: 15 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  markAllText: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '600',
  },

  scrollView: { flex: 1 },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  // แจ้งเตือน
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: 15, marginBottom: 2 },
  notifBody: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginTop: 6,
    marginLeft: 8,
  },

  // คำขอเป็นเพื่อน / แนะนำ
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  info: { flex: 1, marginLeft: 16 },
  name: { fontSize: 17, fontWeight: '600' },
  desc: { fontSize: 14, marginTop: 2 },
  acceptButton: {
    backgroundColor: '#FF4D94',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
  },
  acceptText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  followButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 30,
  },
  followText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  emptyCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyText: { fontSize: 14, fontWeight: '500' },
});