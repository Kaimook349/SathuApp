import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';
import BottomNav from './components/BottomNav';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

const { width } = Dimensions.get('window');

const getMeritTitle = (points: number) => {
  if (points >= 10000)
    return { title: 'มหาบุญญานุภาพ', color: '#B45309', bg: '#FEF3C7', icon: 'crown' };
  if (points >= 5000)
    return { title: 'มหาศรัทธา', color: '#C2410C', bg: '#FFEDD5', icon: 'star-circle' };
  if (points >= 1000)
    return { title: 'บุญญานุภาพ', color: '#6D28D9', bg: '#EDE9FE', icon: 'shield-star' };
  if (points >= 500)
    return { title: 'ศรัทธาแรงกล้า', color: '#1D4ED8', bg: '#DBEAFE', icon: 'heart-circle' };
  if (points >= 100)
    return { title: 'ผู้มีจิตศรัทธา', color: '#047857', bg: '#D1FAE5', icon: 'hand-heart' };
  return { title: 'ผู้เริ่มต้นบุญ', color: '#64748B', bg: '#F1F5F9', icon: 'sprout' };
};

const getNextMerit = (points: number) => {
  const levels = [
    { min: 0, title: 'ผู้เริ่มต้นบุญ' },
    { min: 100, title: 'ผู้มีจิตศรัทธา' },
    { min: 500, title: 'ศรัทธาแรงกล้า' },
    { min: 1000, title: 'บุญญานุภาพ' },
    { min: 5000, title: 'มหาศรัทธา' },
    { min: 10000, title: 'มหาบุญญานุภาพ' },
  ];

  for (let i = 0; i < levels.length; i++) {
    if (points < levels[i].min) {
      const prevMin = i === 0 ? 0 : levels[i - 1].min;
      const nextMin = levels[i].min;
      const progress = ((points - prevMin) / (nextMin - prevMin)) * 100;
      const remaining = nextMin - points;

      return {
        nextTitle: levels[i].title,
        progress: Math.min(Math.max(progress, 0), 100),
        remaining,
        isMax: false,
      };
    }
  }

  return {
    nextTitle: 'ถึงระดับสูงสุดแล้ว',
    progress: 100,
    remaining: 0,
    isMax: true,
  };
};

const ProfileScreen = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const next = getNextMerit(totalPoints);
    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: next.progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [totalPoints]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        const combinedData = { ...user, ...profile };
        setUserProfile(combinedData);
        setEditData(combinedData);

        await fetchMeritPoints(user.id);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeritPoints = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'success');

      if (error) throw error;

      const points = (data || []).reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );
      setTotalPoints(points);
    } catch (error) {
      console.error('Error fetching merit points:', error);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงคลังรูปภาพ');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!userProfile?.id) return;

    setUploading(true);
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userProfile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${userProfile.id}/${fileName}`;

      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ image_url: publicUrl })
        .eq('id', userProfile.id);
      if (updateError) throw updateError;

      setUserProfile((prev: any) => ({ ...prev, image_url: publicUrl }));
      Alert.alert('สำเร็จ', 'อัปโหลดรูปภาพเรียบร้อยแล้ว');
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editData.username,
          birth_date: editData.birth_date,
          gender: editData.gender,
          nationality: editData.nationality,
          phone: editData.phone,
          address: editData.address,
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      setUserProfile({ ...userProfile, ...editData });
      setEditModalVisible(false);
      Alert.alert('สำเร็จ', 'แก้ไขโปรไฟล์เรียบร้อยแล้ว');
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    }
  };

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            router.replace('/');
          } catch (error: any) {
            Alert.alert('เกิดข้อผิดพลาด', error.message || 'ออกจากระบบไม่สำเร็จ');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const username =
    userProfile?.username ||
    userProfile?.first_name ||
    userProfile?.email?.split('@')[0] ||
    'ผู้ใช้งาน';
  const avatarUrl = userProfile?.image_url || userProfile?.avatar_url;
  const merit = getMeritTitle(totalPoints);
  const nextMerit = getNextMerit(totalPoints);

  const meritBg = isDark
    ? merit.bg === '#FEF3C7'
      ? '#78350F'
      : merit.bg === '#FFEDD5'
      ? '#7C2D12'
      : merit.bg === '#EDE9FE'
      ? '#4C1D95'
      : merit.bg === '#DBEAFE'
      ? '#1E3A8A'
      : merit.bg === '#D1FAE5'
      ? '#064E3B'
      : '#334155'
    : merit.bg;

  const meritColor = isDark
    ? merit.color === '#B45309'
      ? '#FCD34D'
      : merit.color === '#C2410C'
      ? '#FDBA74'
      : merit.color === '#6D28D9'
      ? '#C4B5FD'
      : merit.color === '#1D4ED8'
      ? '#93C5FD'
      : merit.color === '#047857'
      ? '#6EE7B7'
      : '#94A3B8'
    : merit.color;

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.headerBackground}>
        <SafeAreaView edges={['top']}>
          <View style={styles.topBar}>
            <Text style={styles.appName}>
              Sa<Text style={{ color: '#F9A8D4' }}>thu</Text>
            </Text>
            <TouchableOpacity onPress={() => router.push('/requests' as any)}>
              <View style={styles.notification}>
                <Feather name="bell" size={22} color="#fff" />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>3</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { borderColor: isDark ? colors.card : '#fff' }]}>
              {uploading ? (
                <ActivityIndicator size="small" color="#7C3AED" />
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <LinearGradient colors={['#A78BFA', '#7C3AED']} style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>{username.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              )}
            </View>
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={pickImage}
              disabled={uploading}
            >
              <Feather name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Text style={[styles.userName, { color: colors.text }]}>{username}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>
          {userProfile?.email || '-'}
        </Text>

        {/* แต้มบุญ + ฉายา */}
        <View style={styles.meritCard}>
          <LinearGradient
            colors={['#7C3AED', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.meritGradient}
          >
            <View style={styles.meritTop}>
              <View>
                <AppText style={styles.meritLabel}>แต้มบุญสะสม</AppText>
                <Text style={styles.meritPoints}>
                  {totalPoints.toLocaleString()}
                  <AppText style={styles.meritUnit}> แต้ม</AppText>
                </Text>
              </View>
              <View style={styles.meritIconCircle}>
                <MaterialCommunityIcons name="hand-heart" size={28} color="#fff" />
              </View>
            </View>

            <View style={[styles.titleBadge, { backgroundColor: meritBg }]}>
              <MaterialCommunityIcons name={merit.icon as any} size={16} color={meritColor} />
              <Text style={[styles.titleText, { color: meritColor }]}>{merit.title}</Text>
            </View>

            {!nextMerit.isMax ? (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <AppText style={styles.progressLabel}>
                    ไปสู่ฉายา “{nextMerit.nextTitle}”
                  </AppText>
                  <Text style={styles.progressPercent}>
                    {Math.round(nextMerit.progress)}%
                  </Text>
                </View>

                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>

                <AppText style={styles.progressHint}>
                  อีก {nextMerit.remaining.toLocaleString()} แต้ม จะได้ฉายาใหม่
                </AppText>
              </View>
            ) : (
              <AppText style={styles.maxLevelText}>คุณถึงระดับสูงสุดแล้ว สาธุ!</AppText>
            )}
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={[
            styles.editProfileBtn,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? colors.border : '#EDE9FE',
            },
          ]}
          onPress={() => setEditModalVisible(true)}
          activeOpacity={0.85}
        >
          <Feather name="edit-2" size={16} color={isDark ? '#C4B5FD' : '#7C3AED'} />
          <AppText
            style={[
              styles.editProfileText,
              { color: isDark ? '#C4B5FD' : '#7C3AED' },
            ]}
          >
            แก้ไขโปรไฟล์
          </AppText>
        </TouchableOpacity>

        {/* ข้อมูลส่วนตัว */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>ข้อมูลส่วนตัว</AppText>
          <InfoRow
            icon="calendar"
            label="วันเกิด"
            value={
              userProfile?.birth_date
                ? new Date(userProfile.birth_date).toLocaleDateString('th-TH')
                : '-'
            }
            colors={colors}
            isDark={isDark}
          />
          <InfoRow
            icon="user"
            label="เพศ"
            value={userProfile?.gender || '-'}
            colors={colors}
            isDark={isDark}
          />
          <InfoRow
            icon="globe"
            label="สัญชาติ"
            value={userProfile?.nationality || 'ไทย'}
            colors={colors}
            isDark={isDark}
          />
        </View>

        {/* ข้อมูลติดต่อ */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>ข้อมูลติดต่อ</AppText>
          <InfoRow
            icon="phone"
            label="เบอร์โทร"
            value={userProfile?.phone || '-'}
            colors={colors}
            isDark={isDark}
          />
          <InfoRow
            icon="map-pin"
            label="ที่อยู่"
            value={userProfile?.address || '-'}
            colors={colors}
            isDark={isDark}
          />
        </View>

        {/* เมนูลัด */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>เมนู</AppText>

          {[
            {
              label: 'ประวัติการบริจาค',
              icon: 'receipt',
              bg: isDark ? '#14532D' : '#DCFCE7',
              color: isDark ? '#4ADE80' : '#16A34A',
              path: '/history',
            },
            {
              label: 'เพื่อน & คำขอ',
              icon: 'people',
              bg: isDark ? '#831843' : '#FCE7F3',
              color: '#EC4899',
              path: '/requests',
            },
            {
              label: 'สรุปบุญประจำเดือน',
              icon: 'stats-chart',
              bg: isDark ? '#312E81' : '#E0E7FF',
              color: isDark ? '#818CF8' : '#4F46E5',
              path: '/merit-report',
            },
            {
              label: 'สาธุ AI',
              icon: 'sparkles',
              bg: isDark ? '#4C1D95' : '#EDE9FE',
              color: isDark ? '#C4B5FD' : '#7C3AED',
              path: '/ai-chat',
            },
            {
              label: 'การตั้งค่า',
              icon: 'settings-outline',
              bg: isDark ? '#312E81' : '#E0E7FF',
              color: isDark ? '#A5B4FC' : '#4F46E5',
              path: '/settings',
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push(item.path as any)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <AppText style={[styles.menuText, { color: colors.text }]}>{item.label}</AppText>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ออกจากระบบ */}
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2',
              borderColor: isDark ? '#991B1B' : '#FECACA',
            },
          ]}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.85}
        >
          {loggingOut ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <>
              <Feather name="log-out" size={18} color={isDark ? '#FCA5A5' : '#EF4444'} />
              <AppText
                style={[
                  styles.logoutText,
                  { color: isDark ? '#FCA5A5' : '#EF4444' },
                ]}
              >
                ออกจากระบบ
              </AppText>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BottomNav />

      {/* Modal แก้ไข */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.modalHandle,
                { backgroundColor: isDark ? '#475569' : '#E2E8F0' },
              ]}
            />
            <AppText style={[styles.modalTitle, { color: colors.text }]}>แก้ไขโปรไฟล์</AppText>

            {[
              { key: 'username', placeholder: 'ชื่อผู้ใช้', keyboard: 'default' as const },
              { key: 'gender', placeholder: 'เพศ', keyboard: 'default' as const },
              { key: 'nationality', placeholder: 'สัญชาติ', keyboard: 'default' as const },
              { key: 'phone', placeholder: 'เบอร์โทร', keyboard: 'phone-pad' as const },
              { key: 'address', placeholder: 'ที่อยู่', keyboard: 'default' as const },
            ].map((field) => (
              <TextInput
                key={field.key}
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType={field.keyboard}
                value={editData[field.key] || ''}
                onChangeText={(t) => setEditData({ ...editData, [field.key]: t })}
              />
            ))}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setEditModalVisible(false)}
              >
                <AppText style={[styles.cancelText, { color: colors.textSecondary }]}>
                  ยกเลิก
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
                <AppText style={styles.saveText}>บันทึก</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const InfoRow = ({
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
  <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
    <View
      style={[
        styles.infoIconBox,
        { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF' },
      ]}
    >
      <Feather name={icon} size={16} color={isDark ? '#C4B5FD' : '#7C3AED'} />
    </View>
    <AppText style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</AppText>
    <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerBackground: {
    paddingBottom: 50,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 16,
  },
  appName: { fontSize: 26, fontWeight: '800', color: '#fff' },
  notification: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  avatarContainer: { alignItems: 'center', position: 'relative' },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 40, fontWeight: '800', color: '#fff' },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 4,
    right: width / 2 - 70,
    backgroundColor: '#EC4899',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },

  scroll: { flex: 1, marginTop: -20 },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
  },
  email: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },

  meritCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  meritGradient: { padding: 20 },
  meritTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  meritLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  meritPoints: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  meritUnit: { fontSize: 16, fontWeight: '600' },
  meritIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
  },
  titleText: { fontSize: 14, fontWeight: '700' },

  progressSection: { marginTop: 14 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
  },
  maxLevelText: {
    fontSize: 13,
    color: '#FEF3C7',
    fontWeight: '600',
    marginTop: 12,
  },

  editProfileBtn: {
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
    borderWidth: 1,
  },
  editProfileText: { fontWeight: '700', fontSize: 14 },

  section: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: { flex: 1, marginLeft: 12, fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600', maxWidth: 150 },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: '600' },

  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  logoutText: { fontWeight: '700', fontSize: 15 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    fontSize: 15,
  },
  modalButtons: { flexDirection: 'row', marginTop: 16, gap: 10 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
  },
  cancelText: { fontWeight: '600' },
  saveBtn: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 14,
  },
  saveText: { color: '#fff', fontWeight: '700' },
});

export default ProfileScreen;