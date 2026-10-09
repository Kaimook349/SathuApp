import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext'; // ถ้า error ลอง '../../context/ThemeContext'

export default function WriteReviewScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();

  const activityId = (params.activityId as string) || '';
  const projectId = (params.projectId as string) || '';
  const templeName = (params.templeName as string) || '';
  const titleName =
    (params.title as string) ||
    (params.activityName as string) ||
    templeName ||
    '';

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, full_name, avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();

      setUser({ ...authUser, ...(profile || {}) });
    } catch (e) {
      console.log(e);
    }
  };

  const displayName =
    user?.username ||
    user?.full_name ||
    user?.first_name ||
    user?.email?.split('@')[0] ||
    'ผู้ใช้งาน';

  const handlePost = async () => {
    if (!activityId && !projectId) {
      Alert.alert('แจ้งเตือน', 'ไม่พบรายการที่จะรีวิว');
      return;
    }
    if (rating === 0) {
      Alert.alert('แจ้งเตือน', 'กรุณาให้คะแนนดาว');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('แจ้งเตือน', 'โปรดระบุความคิดเห็น');
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        Alert.alert('กรุณาเข้าสู่ระบบก่อนเขียนรีวิว');
        return;
      }

      const payload: any = {
        user_id: authUser.id,
        rating,
        comment: comment.trim(),
      };

      // กิจกรรมวัด
      if (activityId) payload.activity_id = activityId;
      // โครงการบริจาค
      if (projectId) payload.project_id = projectId;

      const { error } = await supabase.from('reviews').insert(payload);

      if (error) throw error;

      Alert.alert('สำเร็จ', 'โพสต์รีวิวเรียบร้อยแล้ว', [
        { text: 'ตกลง', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e.message || 'ไม่สามารถโพสต์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.background : '#FFFFFF' },
      ]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            เขียนรีวิว
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!!titleName && (
            <Text style={[styles.placeName, { color: colors.textSecondary }]}>
              {titleName}
            </Text>
          )}

          {/* ผู้ใช้ */}
          <View style={styles.userRow}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
              >
                <Ionicons
                  name="person"
                  size={22}
                  color={isDark ? '#94A3B8' : '#64748B'}
                />
              </View>
            )}
            <View>
              <Text style={[styles.userName, { color: colors.text }]}>
                {displayName}
              </Text>
              <Text style={[styles.userHint, { color: colors.textSecondary }]}>
                โพสต์เป็นสาธารณะ
              </Text>
            </View>
          </View>

          {/* ดาว */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setRating(s)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons
                  name={s <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={s <= rating ? '#FBBF24' : '#CBD5E1'}
                  style={{ marginHorizontal: 4 }}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: isDark ? colors.card : '#FFFFFF',
              },
            ]}
            placeholder="แบ่งปันประสบการณ์ของคุณเกี่ยวกับที่นี่..."
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
            value={comment}
            onChangeText={setComment}
            maxLength={500}
          />
        </ScrollView>

        {/* ปุ่มล่าง */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.cancelBtn,
              { backgroundColor: isDark ? colors.card : '#F1F5F9' },
            ]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              ยกเลิก
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.postBtn,
              (rating === 0 || !comment.trim()) && styles.postBtnDisabled,
            ]}
            onPress={handlePost}
            disabled={loading || rating === 0 || !comment.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.postBtnText}>โพสต์</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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

  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },

  placeName: {
    fontSize: 14,
    marginBottom: 16,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userHint: {
    fontSize: 12,
    marginTop: 2,
  },

  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },

  input: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
  },

  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  postBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postBtnDisabled: {
    backgroundColor: '#C4B5FD',
  },
  postBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});