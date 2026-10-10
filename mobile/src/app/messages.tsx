import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

export default function MessagesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
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
      await supabase.rpc('mark_all_notifications_as_read');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch (error) {
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
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'activity_reminder':
        return 'calendar';
      case 'friend_request':
        return 'person-add';
      case 'friend_accepted':
        return 'checkmark-circle';
      case 'message':
        return 'chatbubble';
      default:
        return 'notifications';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: item.is_read
            ? colors.card
            : isDark
            ? '#1E293B'
            : '#F0F9FF',
          borderColor: colors.border,
        },
      ]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: isDark ? '#334155' : '#E0E7FF' },
        ]}
      >
        <Ionicons
          name={getIcon(item.type) as any}
          size={22}
          color={isDark ? '#A5B4FC' : '#4F46E5'}
        />
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
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
            style={[styles.body, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.body}
          </Text>
        ) : null}
        <Text style={[styles.time, { color: colors.textSecondary }]}>
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
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>
          ข้อความ / แจ้งเตือน
        </AppText>
        <TouchableOpacity onPress={markAllAsRead}>
          <AppText style={[styles.markAll, { color: colors.primary }]}>
            อ่านทั้งหมด
          </AppText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="notifications-off-outline"
                size={56}
                color={isDark ? '#475569' : '#CBD5E1'}
              />
              <AppText style={[styles.emptyText, { color: colors.text }]}>
                ยังไม่มีแจ้งเตือน
              </AppText>
              <AppText
                style={[styles.emptySub, { color: colors.textSecondary }]}
              >
                เมื่อมีการตั้งเตือนหรือมีข้อความใหม่ จะแสดงที่นี่
              </AppText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  markAll: { fontSize: 14, fontWeight: '600' },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  title: { fontSize: 15, marginBottom: 3 },
  body: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  time: { fontSize: 11 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginTop: 6,
    marginLeft: 8,
  },

  empty: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 30,
  },
  emptyText: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6 },
});