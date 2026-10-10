import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext'; // ปรับ path ตามโปรเจกต์

const { width } = Dimensions.get('window');

export default function ScanSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isDark } = useTheme();

  // รับข้อมูลจากหน้าสแกน (ส่งมาทาง params)
  const templeName = (params.templeName as string) || 'วัดศาลาลอย';
  const province = (params.province as string) || 'นครราชสีมา';
  const distance = (params.distance as string) || '12 กิโล. จากคุณ';
  const templeImage = (params.templeImage as string) || '';
  const activityName = (params.activityName as string) || 'เข้าวัดทำบุญ';
  const activityDate = (params.activityDate as string) || '10 กรกฎาคม 2569';
  const activityTime = (params.activityTime as string) || 'เวลา 08:00 น.';
  const pointsEarned = Number(params.pointsEarned) || 3;
  const totalPoints = Number(params.totalPoints) || 123;
  const activityId = (params.activityId as string) || '';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const goToActivity = () => {
    if (activityId) {
      router.replace({
        pathname: '/activity-detail' as any,
        params: { id: activityId },
      });
    } else {
      router.replace('/activities' as any);
    }
  };

  const goHome = () => {
    router.replace('/home' as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* ปุ่มปิด */}
        <TouchableOpacity style={styles.closeBtn} onPress={goHome}>
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* หัวข้อ + ไอคอนสำเร็จ */}
          <Animated.View
            style={[
              styles.successHeader,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            {/* พลุซ้ายขวา (emoji) */}
            <Text style={styles.fireworkLeft}>🎆</Text>
            <Text style={styles.fireworkRight}>🎇</Text>

            <Text style={[styles.topTitle, { color: colors.text }]}>
              สแกนสำเร็จ
            </Text>

            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={42} color="#22C55E" />
            </View>

            <Text style={[styles.successTitle, { color: colors.text }]}>
              สแกนสำเร็จ!
            </Text>
          </Animated.View>

          {/* การ์ดข้อมูล */}
          <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
            {/* วัด */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? colors.border : '#E0E7FF',
                },
              ]}
            >
              <View style={styles.templeRow}>
                {templeImage ? (
                  <Image source={{ uri: templeImage }} style={styles.templeImg} />
                ) : (
                  <View style={[styles.templeImg, styles.templePlaceholder]}>
                    <MaterialCommunityIcons
                      name="temple-buddhist"
                      size={28}
                      color="#7C3AED"
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.templeName, { color: colors.text }]}>
                    {templeName}
                  </Text>
                  <Text style={[styles.templeSub, { color: colors.textSecondary }]}>
                    {province}
                  </Text>
                  <Text style={[styles.templeSub, { color: colors.textSecondary }]}>
                    {distance}
                  </Text>
                </View>
              </View>
            </View>

            {/* กิจกรรมที่เช็คอิน */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? colors.border : '#EDE9FE',
                },
              ]}
            >
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: isDark ? '#4C1D95' : '#F3E8FF' }]}>
                  <MaterialCommunityIcons
                    name="home-heart"
                    size={22}
                    color={isDark ? '#C4B5FD' : '#7C3AED'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                    กิจกรรมที่เช็คอิน
                  </Text>
                  <Text style={[styles.cardValue, { color: '#5B21B6' }]}>
                    {activityName}
                  </Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                    {activityDate}
                  </Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                    {activityTime}
                  </Text>
                </View>
              </View>
            </View>

            {/* ได้คะแนน */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? colors.border : '#EDE9FE',
                },
              ]}
            >
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: isDark ? '#4C1D95' : '#F3E8FF' }]}>
                  <Ionicons
                    name="star"
                    size={22}
                    color={isDark ? '#FDE68A' : '#F59E0B'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                    ได้รับคะแนน
                  </Text>
                  <Text style={styles.pointsText}>+ {pointsEarned} คะแนน</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                    คะแนนรวมของคุณ {totalPoints} คะแนน
                  </Text>
                </View>
                <Text style={{ fontSize: 28 }}>🪷</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* ปุ่มด้านล่าง */}
        <View style={styles.bottomArea}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={goToActivity}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryGradient}
            >
              <Text style={styles.primaryText}>ดูรายละเอียดกิจกรรม</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={goHome}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryText, { color: colors.text }]}>
              กลับหน้าหลัก
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  closeBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    alignItems: 'center',
  },

  successHeader: {
    alignItems: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  fireworkLeft: {
    position: 'absolute',
    left: -30,
    top: 10,
    fontSize: 36,
  },
  fireworkRight: {
    position: 'absolute',
    right: -30,
    top: 10,
    fontSize: 36,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 4,
    borderColor: '#BBF7D0',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
  },

  card: {
    width: '100%',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  templeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  templeImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  templePlaceholder: {
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templeName: {
    fontSize: 16,
    fontWeight: '800',
  },
  templeSub: {
    fontSize: 13,
    marginTop: 2,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 13,
    marginTop: 2,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7C3AED',
  },

  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  primaryBtn: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  primaryGradient: {
    height: 54,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    height: 54,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '700',
  },
});