import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext'; // ถ้า error ลอง '../../context/ThemeContext'

const ChatScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isDark } = useTheme();

  const receiverId = params.receiverId as string;
  const receiverName = (params.receiverName as string) || 'ผู้ใช้งาน';
  const receiverAvatar = (params.receiverAvatar as string) || '';

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setup = async () => {
      cleanup = await initChat();
    };
    setup();

    return () => {
      if (cleanup) cleanup();
    };
  }, [receiverId]);

  const initChat = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      if (receiverId) {
        await fetchMessages(user.id, receiverId);
        await markMessagesAsRead(user.id, receiverId);

        const channel = supabase
          .channel(`room:${user.id}-${receiverId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => {
              const newMessage = payload.new;
              const msgText = newMessage.message || newMessage.content || '';

              if (
                (newMessage.sender_id === user.id &&
                  newMessage.receiver_id === receiverId) ||
                (newMessage.sender_id === receiverId &&
                  newMessage.receiver_id === user.id)
              ) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === newMessage.id)) return prev;
                  return [
                    ...prev,
                    {
                      id: newMessage.id,
                      text: msgText,
                      isMe: newMessage.sender_id === user.id,
                      time: new Date(
                        newMessage.created_at || Date.now()
                      ).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    },
                  ];
                });

                if (newMessage.sender_id === receiverId) {
                  markMessagesAsRead(user.id, receiverId);
                }
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    } catch (error) {
      console.error('Error init chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (myId: string, targetId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${myId})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const formatted = data.map((msg) => ({
          id: msg.id,
          text: msg.message || msg.content || '',
          isMe: msg.sender_id === myId,
          time: new Date(msg.created_at || Date.now()).toLocaleTimeString(
            'th-TH',
            {
              hour: '2-digit',
              minute: '2-digit',
            }
          ),
        }));
        setMessages(formatted);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markMessagesAsRead = async (myId: string, targetId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', targetId)
        .eq('receiver_id', myId)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking read:', error);
    }
  };

  const sendMessage = async () => {
    if (inputText.trim() === '' || !currentUserId || !receiverId || sending)
      return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text: textToSend,
        isMe: true,
        time: new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        pending: true,
      },
    ]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: currentUserId,
            receiver_id: receiverId,
            message: textToSend,
            is_read: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  id: data.id,
                  text: data.message || textToSend,
                  isMe: true,
                  time: new Date(data.created_at || Date.now()).toLocaleTimeString(
                    'th-TH',
                    { hour: '2-digit', minute: '2-digit' }
                  ),
                }
              : m
          )
        );
      }
    } catch (error: any) {
      console.error('Error sending message:', error.message);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert('ส่งไม่สำเร็จ', error.message || 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSending(false);
    }
  };

  const handleCall = () => {
    Alert.alert('โทรออก', `ต้องการโทรหา ${receiverName} ใช่หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'โทร',
        onPress: () =>
          Alert.alert('เร็ว ๆ นี้', 'ฟีเจอร์โทรศัพท์จะเปิดใช้งานในเวอร์ชันถัดไป'),
      },
    ]);
  };

  const handleVideoCall = () => {
    Alert.alert('วิดีโอคอล', `ต้องการวิดีโอคอลกับ ${receiverName} ใช่หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'เริ่ม',
        onPress: () =>
          Alert.alert('เร็ว ๆ นี้', 'ฟีเจอร์วิดีโอคอลจะเปิดใช้งานในเวอร์ชันถัดไป'),
      },
    ]);
  };

  const handleMore = () => {
    Alert.alert(receiverName, undefined, [
      { text: 'ดูโปรไฟล์', onPress: () => {} },
      { text: 'ปิดการแจ้งเตือน', onPress: () => {} },
      { text: 'บล็อก', style: 'destructive', onPress: () => {} },
      { text: 'ยกเลิก', style: 'cancel' },
    ]);
  };

  const avatarUri =
    receiverAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      receiverName
    )}&background=7C3AED&color=fff&size=128`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.userInfo} activeOpacity={0.8}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <View style={styles.userTextBox}>
            <Text style={styles.userName} numberOfLines={1}>
              {receiverName}
            </Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.status}>ออนไลน์</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleCall}>
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleVideoCall}>
            <Ionicons name="videocam" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleMore}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Messages */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            กำลังโหลดข้อความ...
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <View
                style={[
                  styles.emptyIconBox,
                  { backgroundColor: isDark ? '#4C1D95' : '#EDE9FE' },
                ]}
              >
                <MaterialCommunityIcons
                  name="message-text-outline"
                  size={40}
                  color={isDark ? '#E9D5FF' : '#A78BFA'}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                เริ่มต้นการสนทนา
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                ส่งข้อความทักทายถึง {receiverName} ได้เลย
              </Text>
            </View>
          ) : (
            messages.map((msg, index) => {
              const showAvatar =
                !msg.isMe &&
                (index === 0 || messages[index - 1]?.isMe === true);
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    msg.isMe ? styles.myRow : styles.otherRow,
                  ]}
                >
                  {!msg.isMe && (
                    <View style={styles.sideAvatarBox}>
                      {showAvatar ? (
                        <Image source={{ uri: avatarUri }} style={styles.sideAvatar} />
                      ) : (
                        <View style={styles.sideAvatarPlaceholder} />
                      )}
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      msg.isMe
                        ? [styles.myMessage, { backgroundColor: colors.primary }]
                        : [
                            styles.otherMessage,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ],
                      msg.pending && styles.pendingBubble,
                    ]}
                  >
                    <Text
                      style={[
                        msg.isMe ? styles.myMessageText : styles.otherMessageText,
                        !msg.isMe && { color: colors.text },
                      ]}
                    >
                      {msg.text}
                    </Text>
                    <Text
                      style={[
                        msg.isMe ? styles.myTime : styles.otherTime,
                        !msg.isMe && { color: colors.textSecondary },
                      ]}
                    >
                      {msg.time}
                      {msg.isMe && !msg.pending ? ' ✓' : ''}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Input */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() =>
            Alert.alert('แนบไฟล์', 'ฟีเจอร์แนบรูปจะเปิดใช้งานในเวอร์ชันถัดไป')
          }
        >
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>

        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={styles.emojiBtn}
            onPress={() => setInputText((t) => t + ' 🙏')}
          >
            <Text style={{ fontSize: 20 }}>🙏</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            (!inputText.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: '#A78BFA',
  },
  userTextBox: { marginLeft: 10, flex: 1 },
  userName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 5 },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  status: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },

  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 14 },

  messagesContainer: { flex: 1 },
  messagesContent: { padding: 14, paddingBottom: 20 },

  emptyChat: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 30,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  myRow: { justifyContent: 'flex-end' },
  otherRow: { justifyContent: 'flex-start' },

  sideAvatarBox: { width: 32, marginRight: 8 },
  sideAvatar: { width: 28, height: 28, borderRadius: 14 },
  sideAvatarPlaceholder: { width: 28, height: 28 },

  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myMessage: {
    borderBottomRightRadius: 5,
  },
  otherMessage: {
    borderBottomLeftRadius: 5,
    borderWidth: 1,
  },
  pendingBubble: { opacity: 0.7 },

  myMessageText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  otherMessageText: { fontSize: 15, lineHeight: 21 },
  myTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  otherTime: { fontSize: 10, marginTop: 4 },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 42,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 6,
  },
  emojiBtn: {
    paddingLeft: 6,
    paddingBottom: 4,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
});

export default ChatScreen;