import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
  Share,
  Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&h=500&fit=crop';

export default function TempleDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isDark } = useTheme();

  const name =
    (params.templeName as string) || (params.name as string) || 'วัด';
  const address = (params.address as string) || '';
  const lat = parseFloat((params.lat as string) || '0');
  const lng = parseFloat(
    (params.lng as string) || (params.longitude as string) || '0'
  );
  const distance = params.distance ? `${params.distance} กม.` : '';
  const imageParam = (params.image as string) || '';

  const [image, setImage] = useState(imageParam || FALLBACK_IMAGE);
  const [wikiSummary, setWikiSummary] = useState('');
  const [loadingWiki, setLoadingWiki] = useState(true);

  useEffect(() => {
    loadWikipedia();
  }, [name]);

  const loadWikipedia = async () => {
    try {
      setLoadingWiki(true);
      const title = encodeURIComponent(name.trim().slice(0, 80));

      let res = await fetch(
        `https://th.wikipedia.org/api/rest_v1/page/summary/${title}`,
        { headers: { Accept: 'application/json' } }
      );

      if (!res.ok) {
        res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
          { headers: { Accept: 'application/json' } }
        );
      }

      if (res.ok) {
        const data = await res.json();
        if (data?.extract) setWikiSummary(data.extract);
        if (
          !imageParam &&
          (data?.thumbnail?.source || data?.originalimage?.source)
        ) {
          setImage(data.thumbnail?.source || data.originalimage?.source);
        }
      }
    } catch (e) {
      console.log('wiki error', e);
    } finally {
      setLoadingWiki(false);
    }
  };

  const openMaps = async () => {
    if (!lat || !lng) {
      Alert.alert('แจ้งเตือน', 'ไม่พบพิกัดของวัดนี้');
      return;
    }

    const label = encodeURIComponent(name);
    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${label}@${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;

    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else await Linking.openURL(webUrl);
    } catch {
      await Linking.openURL(webUrl);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${name}\n${address || ''}\nพิกัด: ${lat}, ${lng}\nดูบนแผนที่: https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      });
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: image }} style={styles.heroImage} />
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(0,0,0,0.65)']}
            style={styles.heroOverlay}
          />

          <SafeAreaView edges={['top']} style={styles.heroTopBar}>
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle} onPress={handleShare}>
              <Feather name="share-2" size={18} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>

          <View style={styles.heroBottom}>
            {!!distance && (
              <View style={styles.distanceChip}>
                <Ionicons name="navigate" size={12} color="#fff" />
                <Text style={styles.distanceText}>{distance}</Text>
              </View>
            )}
            <Text style={styles.heroTitle}>{name}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.row}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF' },
                ]}
              >
                <Ionicons
                  name="location"
                  size={20}
                  color={isDark ? '#C4B5FD' : '#7C3AED'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={[styles.cardLabel, { color: colors.textSecondary }]}>
                  ที่ตั้ง
                </AppText>
                <Text style={[styles.cardValue, { color: colors.text }]}>
                  {address || 'ไม่ระบุที่อยู่ละเอียด'}
                </Text>
              </View>
            </View>

            {(lat !== 0 || lng !== 0) && (
              <View style={[styles.row, { marginTop: 14 }]}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="map-marker-radius"
                    size={20}
                    color={isDark ? '#C4B5FD' : '#7C3AED'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.cardLabel, { color: colors.textSecondary }]}>
                    พิกัด
                  </AppText>
                  <Text style={[styles.cardValue, { color: colors.text }]}>
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <AppText style={[styles.sectionTitle, { color: colors.text }]}>
            เกี่ยวกับวัด
          </AppText>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {loadingWiki ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} />
                <AppText style={[styles.loadingText, { color: colors.textSecondary }]}>
                  กำลังโหลดข้อมูล...
                </AppText>
              </View>
            ) : wikiSummary ? (
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                {wikiSummary}
              </Text>
            ) : (
              <AppText style={[styles.summaryText, { color: colors.textSecondary }]}>
                ยังไม่มีคำอธิบายจากวิกิพีเดียสำหรับวัดนี้
                คุณสามารถเปิดแผนที่เพื่อเดินทางไปสักการะได้
              </AppText>
            )}
          </View>

          <AppText style={[styles.sectionTitle, { color: colors.text }]}>
            ทำบุญต่อที่นี่
          </AppText>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/donation' as any)}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: isDark ? '#831843' : '#FCE7F3' },
                ]}
              >
                <Text style={{ fontSize: 20 }}>❤️</Text>
              </View>
              <AppText style={[styles.actionText, { color: colors.textSecondary }]}>
                บริจาค
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/daily-merit' as any)}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: isDark ? '#78350F' : '#FEF3C7' },
                ]}
              >
                <Text style={{ fontSize: 20 }}>🔥</Text>
              </View>
              <AppText style={[styles.actionText, { color: colors.textSecondary }]}>
                บุญวัน
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/activities' as any)}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: isDark ? '#4C1D95' : '#EDE9FE' },
                ]}
              >
                <Ionicons
                  name="calendar"
                  size={20}
                  color={isDark ? '#C4B5FD' : '#7C3AED'}
                />
              </View>
              <AppText style={[styles.actionText, { color: colors.textSecondary }]}>
                กิจกรรม
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={openMaps}>
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE' },
                ]}
              >
                <Ionicons
                  name="map"
                  size={20}
                  color={isDark ? '#93C5FD' : '#2563EB'}
                />
              </View>
              <AppText style={[styles.actionText, { color: colors.textSecondary }]}>
                แผนที่
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView
        edges={['bottom']}
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.navButton}
          onPress={openMaps}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#7C3AED', '#5B21B6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.navGradient}
          >
            <Ionicons name="navigate" size={20} color="#fff" />
            <AppText style={styles.navText}>นำทางไปวัดนี้</AppText>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  heroWrap: {
    height: 300,
    position: 'relative',
    backgroundColor: '#1E2937',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
  },
  distanceChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124,58,237,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  distanceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 4,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: { fontSize: 13 },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
  },

  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionItem: {
    alignItems: 'center',
    width: '23%',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  navButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  navGradient: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});