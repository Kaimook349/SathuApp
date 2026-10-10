import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';

type TempleItem = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
};

export default function SelectLocationScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [temples, setTemples] = useState<TempleItem[]>([]);
  const [selected, setSelected] = useState<TempleItem | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    checkOnboardingThenLoad();
  }, []);

  // เข้าแอปครั้งแรกเท่านั้น — ถ้าทำ onboarding แล้ว ข้ามไป Home ทันที
  const checkOnboardingThenLoad = async () => {
    try {
      setChecking(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login' as any);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_done')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.onboarding_done === true) {
        router.replace('/home' as any);
        return;
      }

      // ยังไม่เคยเลือก → โหลดวัดใกล้เคียง
      await loadNearby();
    } catch (e) {
      console.log(e);
      await loadNearby();
    } finally {
      setChecking(false);
    }
  };

  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
  };

  const loadNearby = async () => {
    try {
      setLoading(true);
      setErrorText('');

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorText('กรุณาอนุญาตการเข้าถึงตำแหน่งเพื่อค้นหาวัดใกล้คุณ');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      setCoords({ lat: latitude, lng: longitude });

      const delta = 0.08;
      const viewbox = `${longitude - delta},${latitude + delta},${longitude + delta},${latitude - delta}`;
      const url =
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent('วัด')}&format=json&limit=15` +
        `&countrycodes=th&addressdetails=1&accept-language=th` +
        `&viewbox=${viewbox}&bounded=1`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SathuApp/1.0 (student-project)',
          'Accept-Language': 'th',
        },
      });

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setTemples([]);
        setErrorText('ไม่พบวัดใกล้เคียง ลองข้ามขั้นตอนนี้ได้');
        return;
      }

      const list: TempleItem[] = data
        .map((item: any) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          let name = item.display_name?.split(',')[0]?.trim() || 'วัด';
          if (item.address) {
            const a = item.address;
            name = a.amenity || a.building || a.tourism || name;
          }
          return {
            id: String(item.place_id),
            name,
            address: item.display_name || '',
            lat,
            lng,
            distance: calcDistance(latitude, longitude, lat, lng),
          };
        })
        .filter((t) => t.distance <= 20)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 12);

      setTemples(list);
    } catch (e) {
      console.log(e);
      setErrorText('โหลดตำแหน่งไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const saveAndContinue = async (temple?: TempleItem | null) => {
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/home' as any);
        return;
      }

      // บันทึกครั้งเดียว — ครั้งถัดไปจะไม่เข้าหน้านี้แล้ว
      const payload: any = {
        onboarding_done: true,
        home_lat: coords?.lat ?? temple?.lat ?? null,
        home_lng: coords?.lng ?? temple?.lng ?? null,
        preferred_temple_name: temple?.name || null,
        preferred_address: temple?.address || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id);

      if (error) throw error;

      router.replace('/home' as any);
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const skip = () => saveAndContinue(null);

  // กำลังเช็กว่าเคย onboarding แล้วหรือยัง
  if (checking) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>เลือกวัดใกล้คุณ</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          เลือกครั้งเดียวตอนเข้าใช้ครั้งแรก ช่วยให้แอปแนะนำวัดใกล้บ้านได้แม่นขึ้น
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            กำลังค้นหาวัดใกล้คุณ...
          </Text>
        </View>
      ) : (
        <>
          {!!errorText && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: isDark ? '#1E293B' : '#FEF3C7' },
              ]}
            >
              <Text style={{ color: isDark ? '#FDE68A' : '#92400E', fontSize: 13 }}>
                {errorText}
              </Text>
            </View>
          )}

          <FlatList
            data={temples}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
            renderItem={({ item }) => {
              const active = selected?.id === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: active ? '#7C3AED' : colors.border,
                    },
                  ]}
                  onPress={() => setSelected(item)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: active
                          ? '#EDE9FE'
                          : isDark
                          ? '#334155'
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <Ionicons
                      name="business"
                      size={20}
                      color={active ? '#7C3AED' : colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.address, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {item.address}
                    </Text>
                  </View>
                  <View style={styles.rightCol}>
                    <Text style={styles.distance}>{item.distance} กม.</Text>
                    {active && (
                      <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.center}>
                  <Text style={{ color: colors.textSecondary }}>ยังไม่มีรายการวัด</Text>
                </View>
              ) : null
            }
          />

          <View style={[styles.footer, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[styles.primaryBtn, (!selected || saving) && { opacity: 0.55 }]}
              disabled={!selected || saving}
              onPress={() => saveAndContinue(selected)}
            >
              <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.primaryGrad}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>บันทึกแล้วไปหน้าหลัก</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={skip} disabled={saving}>
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                ข้ามขั้นตอนนี้
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40, flex: 1 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 15, fontWeight: '700' },
  address: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  rightCol: { alignItems: 'flex-end', gap: 6 },
  distance: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
  },
  primaryBtn: { borderRadius: 16, overflow: 'hidden' },
  primaryGrad: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  skipBtn: { alignItems: 'center', marginTop: 12, padding: 8 },
  skipText: { fontSize: 14, fontWeight: '600' },
});