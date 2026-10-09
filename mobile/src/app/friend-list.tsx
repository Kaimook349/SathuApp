import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext'; // ถ้า error ลอง '../../context/ThemeContext'

export default function FriendListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriendsWithUnread();
  }, []);

  const fetchFriendsWithUnread = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: friendshipsData, error: fsError } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (fsError) throw fsError;

      if (friendshipsData && friendshipsData.length > 0) {
        const friendIds = friendshipsData.map((item) => {
          return item.user_id === user.id ? item.friend_id : item.user_id;
        });

        const { data: profilesData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url, image_url')
          .in('id', friendIds);

        if (profileError) throw profileError;

        const { data: messagesData } = await supabase
          .from('messages')
          .select('*')
          .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`);

        const formattedFriends = profilesData.map((profile: any) => {
          const displayName =
            profile.username ||
            [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
            'ผู้ใช้งาน';

          const chatWithFriend =
            messagesData?.filter(
              (m) => m.sender_id === profile.id || m.receiver_id === profile.id
            ) || [];

          const lastMsg = chatWithFriend.sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];

          const unreadCount = chatWithFriend.filter(
            (m) => m.sender_id === profile.id && m.is_read === false
          ).length;

          return {
            id: profile.id,
            name: displayName,
            avatar:
              profile.avatar_url ||
              profile.image_url ||
              `https://i.pravatar.cc/150?u=${profile.id}`,
            lastMessage: lastMsg
              ? lastMsg.message || lastMsg.content
              : 'เริ่มการสนทนาเลย',
            time: lastMsg
              ? new Date(lastMsg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '',
            unreadCount: unreadCount,
          };
        });

        setFriends(formattedFriends);
      } else {
        setFriends([]);
      }
    } catch (error: any) {
      console.error('Error fetching friends:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (friendId: string, friendName: string) => {
    router.push({
      pathname: '/chat' as any,
      params: { receiverId: friendId, receiverName: friendName },
    });
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#0F172A' : '#1E293B' },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={isDark ? '#0F172A' : '#1E293B'} />

      <View
        style={[
          styles.header,
          { backgroundColor: isDark ? '#0F172A' : '#1E293B' },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>แชทกับเพื่อน</Text>
      </View>

      <View
        style={[
          styles.content,
          { backgroundColor: colors.background },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#FF4D94"
            style={{ marginTop: 40 }}
          />
        ) : friends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              ยังไม่มีรายชื่อเพื่อนในแชท
            </Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.friendCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => handleStartChat(item.id, item.name)}
              >
                <View>
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                  {item.unreadCount > 0 && <View style={styles.onlineDot} />}
                </View>

                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[styles.name, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                      {item.time}
                    </Text>
                  </View>
                  <View style={styles.msgRow}>
                    <Text
                      style={[
                        styles.lastMsg,
                        { color: colors.textSecondary },
                        item.unreadCount > 0 && {
                          fontWeight: '700',
                          color: colors.text,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessage}
                    </Text>
                    {item.unreadCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

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
  content: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E2E8F0' },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  timeText: { fontSize: 11, marginLeft: 8 },
  msgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  lastMsg: { fontSize: 13, flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: '#FF4D94',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
});