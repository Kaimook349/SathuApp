import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { supabase } from '../../supabase';
import BottomNav from './components/BottomNav';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

const { width } = Dimensions.get('window');

const FALLBACK_TEMPLE_IMAGE =
  'https://images.unsplash.com/photo-1548013146-72479768bada?w=400&h=300&fit=crop';

const safeDecode = (text: string | null | undefined) => {
  if (!text) return '';
  try {
    if (text.includes('%')) return decodeURIComponent(text);
    return text;
  } catch {
    return text;
  }
};

interface NearbyTemple {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  image: string;
}

const HomeScreen = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [userProfile, setUserProfile] = useState<any>(null);
  const [donationCount, setDonationCount] = useState(0);
  const [upcomingActivity, setUpcomingActivity] = useState<any>(null);
  const [currentDateText, setCurrentDateText] = useState('');
  const [buddhistHolyDayText, setBuddhistHolyDayText] = useState('');
  const [chantsList, setChantsList] = useState<any[]>([]);
  const [currentChant, setCurrentChant] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [nearbyTemples, setNearbyTemples] = useState<NearbyTemple[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [streak, setStreak] = useState<any>(null);
  const [meritJoinCount, setMeritJoinCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUserProfile();
    fetchDonationStats();
    fetchUpcomingActivity();
    calculateBuddhistDay();
    fetchStreak();
    fetchChantsWisdom();
    loadNearbyTemples();
    fetchMeritJoinCount();
    fetchUnreadCount();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      fetchDonationStats();
      fetchMeritJoinCount();
    }, [])
  );

  const fetchUnreadCount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUnreadCount(0);
        return;
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        setUnreadCount(0);
        return;
      }
      setUnreadCount(count ?? 0);
    } catch {
      setUnreadCount(0);
    }
  };

  const fetchMeritJoinCount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMeritJoinCount(0);
        return;
      }
      const { data } = await supabase
        .from('donations')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'success');
      setMeritJoinCount(data?.length || 0);
    } catch {
      setMeritJoinCount(0);
    }
  };

  const fetchDonationStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setDonationCount(0);
        return;
      }
      const { data, error } = await supabase
        .from('donations')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'success');
      setDonationCount(!error && data ? data.length : 0);
    } catch {
      setDonationCount(0);
    }
  };

  const fetchChantsWisdom = async () => {
    try {
      const { data, error } = await supabase
        .from('chants')
        .select('id, title, summary, content, category');
      if (error) throw error;
      if (data?.length) {
        setChantsList(data);
        setCurrentChant(data[Math.floor(Math.random() * data.length)]);
      }
    } catch (e) {
      console.log('chants error', e);
    }
  };

  const refreshChantQuote = () => {
    if (chantsList.length === 0) return;
    let next = currentChant;
    while (next === currentChant && chantsList.length > 1) {
      next = chantsList[Math.floor(Math.random() * chantsList.length)];
    }
    setCurrentChant(next);
  };

  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 10) / 10;
    },
    []
  );

  const fetchTempleImage = async (templeName: string): Promise<string> => {
    try {
      const cleanName = templeName.replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!cleanName) return FALLBACK_TEMPLE_IMAGE;
      const title = encodeURIComponent(cleanName);
      let res = await fetch(`https://th.wikipedia.org/api/rest_v1/page/summary/${title}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
          headers: { Accept: 'application/json' },
        });
      }
      if (!res.ok) return FALLBACK_TEMPLE_IMAGE;
      const data = await res.json();
      return data?.thumbnail?.source || data?.originalimage?.source || FALLBACK_TEMPLE_IMAGE;
    } catch {
      return FALLBACK_TEMPLE_IMAGE;
    }
  };

  const fetchStreak = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setStreak(data);
    } catch (e) {
      console.log('streak error', e);
    }
  };

  const loadNearbyTemples = async () => {
    setLoadingNearby(true);
    setLocationError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('กรุณาอนุญาตการเข้าถึงตำแหน่ง');
        setLoadingNearby(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      const delta = 0.08;
      const viewbox = `${longitude - delta},${latitude + delta},${longitude + delta},${latitude - delta}`;
      const url =
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent('วัด')}&format=json&limit=20` +
        `&countrycodes=th&addressdetails=1&extratags=1&accept-language=th` +
        `&viewbox=${viewbox}&bounded=1`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SathuApp/1.0 (student-project)',
          'Accept-Language': 'th',
        },
      });
      const text = await res.text();
      if (!text || text.trim().startsWith('<')) {
        setNearbyTemples([]);
        setLoadingNearby(false);
        return;
      }
      const data = JSON.parse(text);
      if (!Array.isArray(data) || data.length === 0) {
        await searchTemplesFallback(latitude, longitude);
        return;
      }

      const templesRaw = data
        .map((item: any) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          let name = item.display_name?.split(',')[0]?.trim() || 'วัดไม่ระบุชื่อ';
          if (item.address) {
            const a = item.address;
            name = a.amenity || a.building || a.tourism || a.place || name;
          }
          return {
            id: String(item.place_id || Math.random()),
            name,
            address: item.display_name || '',
            latitude: lat,
            longitude: lon,
            distance: calculateDistance(latitude, longitude, lat, lon),
            image: FALLBACK_TEMPLE_IMAGE,
          };
        })
        .filter((t: NearbyTemple) => t.distance <= 15)
        .sort((a: NearbyTemple, b: NearbyTemple) => a.distance - b.distance)
        .slice(0, 8);

      const temples = await Promise.all(
        templesRaw.map(async (t) => ({ ...t, image: await fetchTempleImage(t.name) }))
      );
      setNearbyTemples(temples);
    } catch (e) {
      console.warn('Nearby temples error:', e);
      setLocationError('ไม่สามารถโหลดวัดใกล้คุณได้');
    } finally {
      setLoadingNearby(false);
    }
  };

  const searchTemplesFallback = async (latitude: number, longitude: number) => {
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent('วัด')}&format=json&limit=25` +
        `&countrycodes=th&addressdetails=1&accept-language=th` +
        `&lat=${latitude}&lon=${longitude}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SathuApp/1.0 (student-project)',
          'Accept-Language': 'th',
        },
      });
      const data = await res.json();
      if (!Array.isArray(data)) {
        setNearbyTemples([]);
        return;
      }
      const templesRaw = data
        .map((item: any) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          let name = item.display_name?.split(',')[0]?.trim() || 'วัด';
          if (item.address) {
            const a = item.address;
            name = a.amenity || a.building || a.tourism || name;
          }
          return {
            id: String(item.place_id || Math.random()),
            name,
            address: item.display_name || '',
            latitude: lat,
            longitude: lon,
            distance: calculateDistance(latitude, longitude, lat, lon),
            image: FALLBACK_TEMPLE_IMAGE,
          };
        })
        .filter((t: NearbyTemple) => t.distance <= 20)
        .sort((a: NearbyTemple, b: NearbyTemple) => a.distance - b.distance)
        .slice(0, 8);

      const temples = await Promise.all(
        templesRaw.map(async (t) => ({ ...t, image: await fetchTempleImage(t.name) }))
      );
      setNearbyTemples(temples);
    } catch {
      setNearbyTemples([]);
    } finally {
      setLoadingNearby(false);
    }
  };

  const openTempleOnMap = (temple: NearbyTemple) => {
    router.push({
      pathname: '/temple-detail' as any,
      params: {
        templeName: temple.name,
        address: temple.address,
        lat: String(temple.latitude),
        lng: String(temple.longitude),
        distance: String(temple.distance),
        image: temple.image,
      },
    });
  };

  const fetchUserProfile = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setUserProfile(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      setUserProfile({ ...user, ...(profile || {}), email: user.email });
    } catch (error) {
      console.error('profile error', error);
    }
  };

  const fetchUpcomingActivity = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('temples_activities')
        .select('*')
        .eq('is_active', true)
        .eq('category', 'event')
        .in('status', ['approved', 'passed'])
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true })
        .limit(1);
      setUpcomingActivity(!error && data?.length ? data[0] : null);
    } catch {
      setUpcomingActivity(null);
    }
  };

  const calculateBuddhistDay = async () => {
    const today = new Date();
    setCurrentDateText(
      today.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })
    );
    const todayStr = today.toISOString().split('T')[0];
    try {
      const { data: todayHoly } = await supabase
        .from('holy_days')
        .select('title, note, is_major')
        .eq('date', todayStr)
        .maybeSingle();
      if (todayHoly) {
        setBuddhistHolyDayText(
          todayHoly.is_major
            ? `${todayHoly.title} · วันสำคัญ`
            : `${todayHoly.title} · ธรรมสวนะ`
        );
        return;
      }
      const { data: nextHoly } = await supabase
        .from('holy_days')
        .select('date, title')
        .gt('date', todayStr)
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (nextHoly) {
        const next = new Date(nextHoly.date + 'T00:00:00');
        const startToday = new Date();
        startToday.setHours(0, 0, 0, 0);
        const diff = Math.ceil((next.getTime() - startToday.getTime()) / 86400000);
        setBuddhistHolyDayText(
          diff === 1 ? `พรุ่งนี้${nextHoly.title}` : `อีก ${diff} วันถึง${nextHoly.title}`
        );
      } else {
        setBuddhistHolyDayText('วันธรรมดา · เตรียมใจทำบุญ');
      }
    } catch {
      setBuddhistHolyDayText('วันธรรมดา · เตรียมใจทำบุญ');
    }
  };

  const rawUsername =
    userProfile?.username ||
    userProfile?.full_name ||
    userProfile?.display_name ||
    (userProfile?.first_name && userProfile?.last_name
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : null) ||
    userProfile?.first_name ||
    userProfile?.email?.split('@')[0] ||
    'สมาชิก';
  const username = safeDecode(rawUsername);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'อรุณสวัสดิ์' : hour < 17 ? 'สวัสดีช่วงบ่าย' : 'สวัสดีช่วงเย็น';

  const streakDays = streak?.current_streak || 0;
  const totalPoints = streak?.total_points || 0;
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  const cardBg = isDark ? colors.card : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(124, 58, 237, 0.06)';
  const mainBg = isDark ? colors.background : '#FBF9FD';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: mainBg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBadge}
          >
            <MaterialCommunityIcons name="hands-pray" size={18} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <Text style={[styles.logoText, { color: colors.text }]}>
              Sa<Text style={{ color: '#8B5CF6' }}>thu</Text>
            </Text>
            <Text style={[styles.logoSub, { color: colors.textSecondary }]}>ทำบุญ · วัด · ธรรมะ</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => router.push('/scan' as any)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="line-scan" size={20} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => router.push('/requests')}
            activeOpacity={0.8}
          >
            <View style={styles.bellWrapper}>
              <Ionicons
                name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                size={20}
                color={unreadCount > 0 ? '#7C3AED' : colors.text}
              />
              {unreadCount > 0 && (
                <View style={styles.redBadge}>
                  <Text style={styles.redBadgeText}>{badgeLabel}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.85}>
            <LinearGradient colors={['#A78BFA', '#7C3AED']} style={styles.userAvatar}>
              <Text style={styles.avatarLetter}>{(username || 'ส').charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollArea}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Greeting Box */}
          <View style={styles.greetingContainer}>
            <AppText style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>
              {greeting} 🙏
            </AppText>
            <Text style={[styles.greetingTitle, { color: colors.text }]} numberOfLines={1}>
              คุณ {username}
            </Text>
            <AppText style={[styles.greetingDesc, { color: colors.textSecondary }]}>
              ขอให้วันนี้เต็มไปด้วยบุญและความสงบในจิตใจ
            </AppText>
          </View>

          {/* Hero Card: Buddhist Day */}
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => router.push('/calendar' as any)}
            style={styles.horizontalWrap}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6D28D9', '#581C87']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroGlowCircle} />
              
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <MaterialCommunityIcons name="flower-tulip" size={14} color="#FBCFE8" />
                  <AppText style={styles.heroBadgeText}>ปฏิทินธรรมวันนี้</AppText>
                </View>
                <View style={styles.heroCalIcon}>
                  <Ionicons name="calendar-clear" size={15} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.heroDateTitle}>{currentDateText}</Text>

              <View style={styles.heroStatusChip}>
                <View style={styles.dotIndicator} />
                <AppText style={styles.heroStatusText}>{buddhistHolyDayText}</AppText>
              </View>

              <View style={styles.heroActionFooter}>
                <AppText style={styles.heroFooterLabel}>ดูปฏิทินวันพระและฤกษ์มงคล</AppText>
                <Ionicons name="arrow-forward-circle" size={18} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Mindful Habit & Streak */}
          <View style={styles.horizontalWrap}>
            <View style={[styles.mindfulCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <TouchableOpacity
                style={styles.mindfulLeft}
                activeOpacity={0.85}
                onPress={() => router.push('/focus' as any)}
              >
                <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={styles.mindfulIconWrap}>
                  <Text style={{ fontSize: 24 }}>🧘‍♂️</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.mindfulTitle, { color: colors.text }]}>
                    ตั้งจิตอธิษฐานสั้นๆ วันนี้
                  </AppText>
                  <AppText style={[styles.mindfulSub, { color: colors.textSecondary }]}>
                    เจริญสติ 1 นาที เพื่อใจสงบ
                  </AppText>
                </View>
              </TouchableOpacity>

              <View style={styles.vDivider} />

              <TouchableOpacity
                style={styles.streakRight}
                activeOpacity={0.85}
                onPress={() => router.push('/daily-merit' as any)}
              >
                <View style={styles.streakBadge}>
                  <Text style={{ fontSize: 16 }}>🔥</Text>
                  <Text style={styles.streakNumber}>{streakDays}</Text>
                </View>
                <AppText style={[styles.streakText, { color: colors.textSecondary }]}>
                  วันต่อเนื่อง
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary Badges */}
          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={[styles.statTile, { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={() => router.push('/donation-history' as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="heart" size={17} color="#EF4444" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{donationCount}</Text>
              <AppText style={[styles.statName, { color: colors.textSecondary }]}>บริจาค</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statTile, { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={() => router.push('/merit' as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                <FontAwesome5 name="hands" size={15} color="#D97706" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{meritJoinCount}</Text>
              <AppText style={[styles.statName, { color: colors.textSecondary }]}>ร่วมบุญ</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statTile, { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={() => router.push('/daily-merit' as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.statIconBox, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="trophy" size={17} color="#7C3AED" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalPoints}</Text>
              <AppText style={[styles.statName, { color: colors.textSecondary }]}>แต้มบุญ</AppText>
            </TouchableOpacity>
          </View>

          {/* Quick Navigation Short-cuts */}
          <View style={styles.shortcutsRow}>
            {[
              {
                title: 'แผนที่วัด',
                colors: ['#EEF2FF', '#E0E7FF'],
                icon: <Ionicons name="map" size={20} color="#4F46E5" />,
                onPress: () => router.push('/map'),
              },
              {
                title: 'สวดมนต์',
                colors: ['#FDF2F8', '#FCE7F3'],
                icon: <MaterialCommunityIcons name="book-open-variant" size={20} color="#DB2777" />,
                onPress: () => router.push('/chants' as any),
              },
              {
                title: 'สะสมบุญ',
                colors: ['#F5F3FF', '#EDE9FE'],
                icon: <MaterialCommunityIcons name="flower-tulip-outline" size={20} color="#7C3AED" />,
                onPress: () => router.push('/daily-merit' as any),
              },
              {
                title: 'นั่งสมาธิ',
                colors: ['#ECFDF5', '#D1FAE5'],
                icon: <MaterialCommunityIcons name="meditation" size={20} color="#059669" />,
                onPress: () => router.push('/focus' as any),
              },
            ].map((item, idx) => (
              <TouchableOpacity key={idx} style={styles.shortcutBtn} onPress={item.onPress} activeOpacity={0.85}>
                <LinearGradient colors={item.colors as any} style={styles.shortcutIconBg}>
                  {item.icon}
                </LinearGradient>
                <AppText style={[styles.shortcutTitle, { color: colors.text }]}>{item.title}</AppText>
              </TouchableOpacity>
            ))}
          </View>

          {/* วัดใกล้คุณ (Horizontal Cards) */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionLeftHeader}>
              <View style={styles.titleIconBadge}>
                <Ionicons name="location" size={14} color="#7C3AED" />
              </View>
              <AppText style={[styles.sectionTitleText, { color: colors.text }]}>วัดใกล้คุณ</AppText>
            </View>
            <TouchableOpacity
              onPress={loadNearbyTemples}
              style={[styles.smallRefreshBtn, { backgroundColor: isDark ? '#312E81' : '#F5F3FF' }]}
            >
              <Ionicons name="reload" size={13} color="#7C3AED" />
            </TouchableOpacity>
          </View>

          {loadingNearby ? (
            <View style={styles.centerStateBox}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <AppText style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6 }}>
                กำลังค้นหาวัดรอบตัวคุณ...
              </AppText>
            </View>
          ) : locationError ? (
            <TouchableOpacity
              style={[styles.centerStateBox, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }]}
              onPress={loadNearbyTemples}
            >
              <Ionicons name="location-outline" size={24} color={colors.textSecondary} />
              <AppText style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{locationError}</AppText>
              <AppText style={{ color: '#7C3AED', fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                แตะเพื่อค้นหาใหม่อีกครั้ง
              </AppText>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templesScrollTrack}
            >
              {nearbyTemples.map((temple) => (
                <TouchableOpacity
                  key={temple.id}
                  style={[styles.templeItemCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                  onPress={() => openTempleOnMap(temple)}
                  activeOpacity={0.9}
                >
                  <View style={styles.templeCoverWrap}>
                    <Image source={{ uri: temple.image }} style={styles.templeCoverImg} />
                    <LinearGradient
                      colors={['transparent', 'rgba(15,23,42,0.65)']}
                      style={styles.templeGradientCover}
                    />
                    <View style={styles.templeDistanceBadge}>
                      <Ionicons name="navigate" size={10} color="#FFFFFF" />
                      <Text style={styles.distanceBadgeText}>{temple.distance} กม.</Text>
                    </View>
                  </View>
                  <View style={styles.templeContentBox}>
                    <Text style={[styles.templeTitleText, { color: colors.text }]} numberOfLines={1}>
                      {temple.name}
                    </Text>
                    <Text style={[styles.templeSubText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {temple.address.split(',').slice(1, 3).join(',').trim() || 'ประเทศไทย'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[
                  styles.exploreMoreCard,
                  {
                    backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
                    borderColor: isDark ? '#4C1D95' : '#DDD6FE',
                  },
                ]}
                onPress={() => router.push('/map')}
              >
                <View style={styles.exploreIconCircle}>
                  <Ionicons name="compass" size={22} color="#7C3AED" />
                </View>
                <AppText style={{ color: '#7C3AED', fontWeight: '800', textAlign: 'center', fontSize: 12 }}>
                  สำรวจวัด{'\n'}ทั้งหมด
                </AppText>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Interactive Feature Cards (Dual Column) */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionLeftHeader}>
              <View style={[styles.titleIconBadge, { backgroundColor: '#FDF2F8' }]}>
                <Ionicons name="sparkles" size={14} color="#EC4899" />
              </View>
              <AppText style={[styles.sectionTitleText, { color: colors.text }]}>ฟีเจอร์เด่น</AppText>
            </View>
          </View>

          <View style={styles.featuresDualRow}>
            <TouchableOpacity
              style={styles.dualCardTouch}
              activeOpacity={0.9}
              onPress={() => router.push('/ai-chat' as any)}
            >
              <LinearGradient
                colors={['#EC4899', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dualCardInner}
              >
                <View style={styles.cardHeaderSmall}>
                  <View style={styles.dualIconBox}>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
                </View>
                <View style={styles.cardBottomMeta}>
                  <AppText style={styles.dualCardTitle}>AI ผู้ช่วยบุญ</AppText>
                  <AppText style={styles.dualCardDesc} numberOfLines={2}>
                    ไขข้อข้องใจธรรมะ ปรึกษาข้อคิดชีวิต
                  </AppText>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dualCardTouch}
              activeOpacity={0.9}
              onPress={() => router.push('/fortune' as any)}
            >
              <LinearGradient
                colors={['#7C3AED', '#4338CA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dualCardInner}
              >
                <View style={styles.cardHeaderSmall}>
                  <View style={styles.dualIconBox}>
                    <Ionicons name="moon" size={16} color="#FFFFFF" />
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
                </View>
                <View style={styles.cardBottomMeta}>
                  <AppText style={styles.dualCardTitle}>ดูดวง & เซียมซี</AppText>
                  <AppText style={styles.dualCardDesc} numberOfLines={2}>
                    คำทำนายมงคล เสริมดวงเพิ่มพลังใจ
                  </AppText>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Mindful Reminders / Daily Chant */}
          <View style={styles.horizontalWrap}>
            <View style={[styles.quoteCardBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.quoteCardHeader}>
                <View style={styles.quoteTitleRow}>
                  <View style={styles.quoteIconCircle}>
                    <Ionicons name="book" size={13} color="#7C3AED" />
                  </View>
                  <AppText style={[styles.quoteCardTitle, { color: isDark ? '#DDD6FE' : '#6D28D9' }]}>
                    {currentChant?.title || 'ธรรมะเตือนสติประจำวัน'}
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={refreshChantQuote}
                  style={[styles.smallRefreshBtn, { backgroundColor: isDark ? '#312E81' : '#F5F3FF' }]}
                >
                  <Ionicons name="reload" size={13} color="#7C3AED" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.quoteBodyText, { color: colors.text }]} numberOfLines={3}>
                “{safeDecode(currentChant?.summary || currentChant?.content) || 'ใช้ชีวิตอย่างมีสติ รู้ทันอารมณ์ และเจริญเมตตาภาวนา'}”
              </Text>

              <TouchableOpacity
                style={styles.quoteFooterLink}
                onPress={() => router.push('/chants' as any)}
              >
                <AppText style={styles.quoteLinkStyle}>อ่านบทสวดฉบับเต็ม</AppText>
                <Ionicons name="arrow-forward" size={14} color="#7C3AED" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Upcoming Event Alert */}
          <View style={styles.horizontalWrap}>
            <TouchableOpacity
              style={[styles.activityTileWrap, !upcomingActivity && { opacity: 0.9 }]}
              disabled={!upcomingActivity}
              onPress={() =>
                upcomingActivity &&
                router.push({
                  pathname: '/activity-detail' as any,
                  params: { id: upcomingActivity.id },
                })
              }
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={upcomingActivity ? ['#312E81', '#1E1B4B'] : ['#475569', '#334155']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activityTileInner}
              >
                <View style={styles.activityIconCircle}>
                  <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.activityMetaLabel}>
                    {upcomingActivity ? 'งานบุญและกิจกรรมที่กำลังจะถึง' : 'กิจกรรมบุญเร็วๆ นี้'}
                  </AppText>
                  <Text style={styles.activityMainName} numberOfLines={1}>
                    {upcomingActivity ? upcomingActivity.activity_name : 'ยังไม่มีกิจกรรมที่กำลังเริ่ม'}
                  </Text>
                  <Text style={styles.activityLocationInfo} numberOfLines={1}>
                    {upcomingActivity
                      ? `📍 ${upcomingActivity.temple_name || ''} (${upcomingActivity.province || ''})`
                      : 'ติดตามข่าวสารงานบุญเร็วๆ นี้'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { paddingBottom: 120 },
  horizontalWrap: { paddingHorizontal: 18, marginBottom: 14 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 10,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { fontSize: 22, fontWeight: '900', letterSpacing: 0.3 },
  logoSub: { fontSize: 10, fontWeight: '600', marginTop: -2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  bellWrapper: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  redBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  redBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  greetingContainer: { paddingHorizontal: 20, marginTop: 4, marginBottom: 12 },
  greetingSubtitle: { fontSize: 13, fontWeight: '600' },
  greetingTitle: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  greetingDesc: { fontSize: 12, marginTop: 3 },

  heroCard: {
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  heroGlowCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -20,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  heroCalIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroDateTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', marginBottom: 10 },
  heroStatusChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  dotIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F472B6' },
  heroStatusText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  heroActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  heroFooterLabel: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: '600' },

  mindfulCard: {
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  mindfulLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  mindfulIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mindfulTitle: { fontSize: 13, fontWeight: '700' },
  mindfulSub: { fontSize: 11, marginTop: 2 },
  vDivider: { width: 1, height: 34, backgroundColor: 'rgba(124, 58, 237, 0.1)', marginHorizontal: 8 },
  streakRight: { alignItems: 'center', paddingHorizontal: 6 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakNumber: { fontSize: 16, fontWeight: '800', color: '#D97706' },
  streakText: { fontSize: 10, fontWeight: '600', marginTop: 1 },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    gap: 10,
    marginBottom: 16,
  },
  statTile: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statName: { fontSize: 11, marginTop: 2, fontWeight: '600' },

  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  shortcutBtn: { alignItems: 'center', width: '22%' },
  shortcutIconBg: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  shortcutTitle: { fontSize: 12, fontWeight: '700' },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  sectionLeftHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleText: { fontSize: 16, fontWeight: '800' },
  smallRefreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerStateBox: {
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
  },
  templesScrollTrack: { paddingHorizontal: 18, paddingBottom: 16, gap: 12 },
  templeItemCard: {
    width: 154,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  templeCoverWrap: { width: '100%', height: 96, position: 'relative' },
  templeCoverImg: { width: '100%', height: '100%', backgroundColor: '#EDE9FE' },
  templeGradientCover: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 40 },
  templeDistanceBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distanceBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  templeContentBox: { padding: 10 },
  templeTitleText: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  templeSubText: { fontSize: 10 },

  exploreMoreCard: {
    width: 110,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  exploreIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  featuresDualRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    gap: 12,
    marginBottom: 16,
  },
  dualCardTouch: { flex: 1 },
  dualCardInner: {
    borderRadius: 20,
    padding: 14,
    height: 115,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  cardHeaderSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dualIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBottomMeta: {},
  dualCardTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  dualCardDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 2, lineHeight: 14 },

  quoteCardBox: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  quoteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quoteTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  quoteIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteCardTitle: { fontSize: 12, fontWeight: '800' },
  quoteBodyText: { fontSize: 13, lineHeight: 21, fontStyle: 'italic' },
  quoteFooterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  quoteLinkStyle: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },

  activityTileWrap: { borderRadius: 20, overflow: 'hidden' },
  activityTileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderRadius: 20,
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityMetaLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  activityMainName: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginTop: 1 },
  activityLocationInfo: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
});

export default HomeScreen;