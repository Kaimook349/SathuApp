import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  TextInput,
  Linking,
  ActivityIndicator,
  Share,
  Keyboard,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from './components/BottomNav';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

const CURATED_TEMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1528181304800-259b08848526?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=900&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1548013146-72479768bada?w=900&auto=format&fit=crop&q=80',
];

const QUICK_KEYWORDS = [
  { label: 'พระอารามหลวง', query: 'วัดพระอารามหลวง' },
  { label: 'วัดป่า / ปฏิบัติธรรม', query: 'วัดป่า' },
  { label: 'วัดโบราณ', query: 'วัดโบราณ' },
  { label: 'วัดดังประจำจังหวัด', query: 'วัดสำคัญ' },
];

interface Temple {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviews: number;
  address: string;
  openHours: string;
  image: string;
  distance?: number;
  isLoadingImage?: boolean;
}

export default function MapScreen() {
  const { colors, isDark } = useTheme();

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedTemple, setSelectedTemple] = useState<Temple | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Temple[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [travelMode, setTravelMode] = useState<'driving' | 'walking'>('driving');
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  const mapRef = useRef<any>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const getWikimediaImage = async (templeName: string): Promise<string | null> => {
    try {
      const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
        templeName
      )}&language=th&uselang=th&limit=2&format=json&origin=*`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      if (!searchData.search?.length) return null;

      for (const item of searchData.search) {
        const claimsUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${item.id}&property=P18&format=json&origin=*`;
        const claimsRes = await fetch(claimsUrl);
        const claimsData = await claimsRes.json();
        const imageName = claimsData.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (imageName) {
          return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
            imageName
          )}?width=800`;
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const formatTemple = useCallback(
    (item: any, idx: number = 0): Temple => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      let name = item.display_name?.split(',')[0]?.trim() || 'วัด';
      if (item.address) {
        const a = item.address;
        name = a.amenity || a.building || a.tourism || a.place || name;
      }

      const extratags = item.extratags || {};
      const openHours =
        extratags.opening_hours || extratags['opening_hours:th'] || 'เปิดทุกวัน 08:00 - 17:00 น.';

      let distance = 0;
      if (location) {
        distance = calculateDistance(location.latitude, location.longitude, lat, lon);
      }

      const fallbackImg =
        CURATED_TEMPLE_IMAGES[Math.abs(Math.floor(lat * 1000) + idx) % CURATED_TEMPLE_IMAGES.length];

      return {
        id: (item.place_id || `${lat}-${lon}`).toString(),
        name,
        latitude: lat,
        longitude: lon,
        rating: Number((4.6 + (Math.abs(Math.sin(lat)) * 0.3)).toFixed(1)),
        reviews: Math.floor(150 + Math.abs(Math.cos(lon)) * 1200),
        address: item.display_name || 'ประเทศไทย',
        openHours,
        image: fallbackImg,
        distance,
        isLoadingImage: false,
      };
    },
    [location, calculateDistance]
  );

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc.coords);
        mapRef.current?.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          800
        );
      } catch {}
    })();

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  const centerOnUser = async () => {
    if (!location) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        mapRef.current?.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          },
          600
        );
      }
      return;
    }
    mapRef.current?.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      600
    );
  };

  const fetchRoute = async (temple: Temple, mode: 'driving' | 'walking' = 'driving') => {
    if (!location) return;
    try {
      const profile = mode === 'driving' ? 'driving' : 'foot';
      const url = `https://router.project-osrm.org/route/v1/${profile}/${location.longitude},${location.latitude};${temple.longitude},${temple.latitude}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((c: number[]) => ({
          latitude: c[1],
          longitude: c[0],
        }));
        setRouteCoords(coords);
        setRouteInfo({
          distance: Math.round((route.distance / 1000) * 10) / 10,
          duration: Math.round(route.duration / 60),
        });
        requestAnimationFrame(() => {
          if (mapRef.current && coords.length > 0) {
            mapRef.current.fitToCoordinates(coords, {
              edgePadding: { top: 160, right: 60, bottom: 340, left: 60 },
              animated: true,
            });
          }
        });
      }
    } catch {
      setRouteCoords([]);
      setRouteInfo(null);
    }
  };

  const executeSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    searchTimeout.current = setTimeout(async () => {
      try {
        let searchTerm = query.trim();
        if (!searchTerm.includes('วัด') && !searchTerm.toLowerCase().includes('wat')) {
          searchTerm = `วัด ${searchTerm}`;
        }
        const encoded = encodeURIComponent(searchTerm);
        const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=8&countrycodes=th&addressdetails=1&extratags=1&accept-language=th`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'SathuApp/1.0 (student-project)',
            'Accept-Language': 'th',
          },
        });
        const text = await res.text();
        if (!text || text.trim().startsWith('<')) {
          setSearchResults([]);
          return;
        }
        const data = JSON.parse(text);
        if (Array.isArray(data) && data.length > 0) {
          const results = data.map((item: any, idx: number) => formatTemple(item, idx));
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelectTemple = async (temple: Temple) => {
    Keyboard.dismiss();
    setShowDropdown(false);

    if (location) {
      temple.distance = calculateDistance(
        location.latitude,
        location.longitude,
        temple.latitude,
        temple.longitude
      );
    }

    setSelectedTemple({ ...temple, isLoadingImage: true });
    fetchRoute(temple, travelMode);

    mapRef.current?.animateToRegion(
      {
        latitude: temple.latitude - 0.005,
        longitude: temple.longitude,
        latitudeDelta: 0.022,
        longitudeDelta: 0.022,
      },
      600
    );

    const realImage = await getWikimediaImage(temple.name);
    if (realImage) {
      setSelectedTemple((prev) =>
        prev && prev.id === temple.id
          ? { ...prev, image: realImage, isLoadingImage: false }
          : prev
      );
    } else {
      setSelectedTemple((prev) =>
        prev && prev.id === temple.id ? { ...prev, isLoadingImage: false } : prev
      );
    }
  };

  const clearAll = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setSelectedTemple(null);
    setRouteCoords([]);
    setRouteInfo(null);
    Keyboard.dismiss();
  };

  const openExternalNavigation = (temple: Temple) => {
    const destination = `${temple.latitude},${temple.longitude}`;
    const origin = location ? `${location.latitude},${location.longitude}` : '';
    const url =
      Platform.OS === 'ios'
        ? `maps://app?${origin ? `saddr=${origin}&` : ''}daddr=${destination}&dirflg=d`
        : `google.navigation:q=${destination}&mode=d`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
      );
    });
  };

  const shareTemple = async (temple: Temple) => {
    try {
      await Share.share({
        message: `📍 ${temple.name}\n${temple.address}\nhttps://www.google.com/maps/search/?api=1&query=${temple.latitude},${temple.longitude}`,
      });
    } catch {}
  };

  const glassSurface = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
  const borderSubtle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.06)';

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ===== แผนที่หลักแบบเต็มจอ ===== */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'ios' ? undefined : PROVIDER_GOOGLE}
        style={styles.map}
        mapType={mapType}
        initialRegion={{
          latitude: 14.882,
          longitude: 102.0207,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        onPress={() => {
          Keyboard.dismiss();
          setShowDropdown(false);
        }}
        {...(Platform.OS === 'ios' && { showsPointsOfInterest: false })}
      >
        {/* แสดงหมุดเฉพาะวัดที่ผู้ใช้ค้นหาหรือเลือกเท่านั้น */}
        {searchResults.map((temple) => {
          const isSelected = selectedTemple?.id === temple.id;
          return (
            <Marker
              key={temple.id}
              coordinate={{ latitude: temple.latitude, longitude: temple.longitude }}
              onPress={() => handleSelectTemple(temple)}
              tracksViewChanges={false}
            >
              <View style={styles.markerWrap}>
                <LinearGradient
                  colors={isSelected ? ['#F59E0B', '#D97706'] : ['#6D28D9', '#4C1D95']}
                  style={[styles.customPin, isSelected && styles.customPinActive]}
                >
                  <MaterialCommunityIcons
                    name="temple-buddhist"
                    size={isSelected ? 20 : 15}
                    color="#FFFFFF"
                  />
                </LinearGradient>
                <View
                  style={[
                    styles.pinPoint,
                    { borderTopColor: isSelected ? '#D97706' : '#4C1D95' },
                  ]}
                />
              </View>
            </Marker>
          );
        })}

        {/* เส้นทางนำทาง */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#6D28D9"
            strokeWidth={5}
            lineDashPattern={travelMode === 'walking' ? [8, 6] : undefined}
          />
        )}
      </MapView>

      {/* ===== แถบค้นหา Command Bar ด้านบน ===== */}
      <SafeAreaView edges={['top']} style={styles.headerArea} pointerEvents="box-none">
        <View
          style={[
            styles.commandBar,
            { backgroundColor: glassSurface, borderColor: borderSubtle },
          ]}
        >
          <View style={styles.brandBadge}>
            <Ionicons name="compass" size={20} color="#FFFFFF" />
          </View>

          <TextInput
            style={[styles.inputField, { color: colors.text }]}
            placeholder="พิมพ์ชื่อวัด หรือสถานที่ศักดิ์สิทธิ์..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={executeSearch}
            onFocus={() => {
              if (searchResults.length > 0) setShowDropdown(true);
            }}
            returnKeyType="search"
          />

          {isSearching && (
            <ActivityIndicator size="small" color="#7C3AED" style={{ marginRight: 6 }} />
          )}

          {(searchQuery.length > 0 || selectedTemple) && (
            <TouchableOpacity onPress={clearAll} style={styles.resetBtn} hitSlop={10}>
              <Ionicons name="close" size={16} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* คำค้นหาด่วน (แสดงเฉพาะตอนยังไม่ได้เลือกวัด) */}
        {!selectedTemple && !showDropdown && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickTagsScroll}
          >
            {QUICK_KEYWORDS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.quickTag,
                  { backgroundColor: glassSurface, borderColor: borderSubtle },
                ]}
                onPress={() => executeSearch(item.query)}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles-outline" size={12} color="#7C3AED" />
                <AppText style={[styles.quickTagText, { color: colors.text }]}>
                  {item.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* รายการผลการค้นหาแบบคลีน */}
        {showDropdown && searchResults.length > 0 && (
          <View
            style={[
              styles.resultsMenu,
              { backgroundColor: glassSurface, borderColor: borderSubtle },
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 280 }}>
              {searchResults.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.resultRow,
                    idx < searchResults.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: borderSubtle,
                    },
                  ]}
                  onPress={() => handleSelectTemple(item)}
                >
                  <View style={styles.resultIconCircle}>
                    <Feather name="map-pin" size={15} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.resultAddress, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.address}
                    </Text>
                  </View>
                  {!!item.distance && (
                    <Text style={styles.resultDistance}>{item.distance} กม.</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>

      {/* ===== ปุ่มควบคุมแผนที่แบบมินิมอล (มุมขวาบนใต้ช่องค้นหา) ===== */}
      <View
        style={[
          styles.floatingTools,
          { backgroundColor: glassSurface, borderColor: borderSubtle },
        ]}
      >
        <TouchableOpacity style={styles.toolIconBtn} onPress={centerOnUser}>
          <Ionicons name="locate-outline" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.toolDivider, { backgroundColor: borderSubtle }]} />
        <TouchableOpacity
          style={styles.toolIconBtn}
          onPress={() =>
            setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'))
          }
        >
          <Ionicons
            name={mapType === 'standard' ? 'layers-outline' : 'map-outline'}
            size={20}
            color={mapType === 'satellite' ? '#7C3AED' : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* ===== การ์ดลอยตัวแสดงข้อมูลวัดที่เลือก (Luxury Floating Spotlight Card) ===== */}
      {selectedTemple && (
        <View
          style={[
            styles.spotlightCard,
            { backgroundColor: glassSurface, borderColor: borderSubtle },
          ]}
        >
          {/* ส่วนหัวการ์ด: รูปภาพ + ชื่อวัด + คะแนน */}
          <View style={styles.spotlightHeader}>
            <View style={styles.thumbWrapper}>
              {selectedTemple.isLoadingImage ? (
                <View style={styles.thumbLoader}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                </View>
              ) : (
                <Image source={{ uri: selectedTemple.image }} style={styles.thumbImage} />
              )}
            </View>

            <View style={styles.spotlightInfo}>
              <View style={styles.titleLine}>
                <Text
                  style={[styles.spotlightTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedTemple.name}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTemple(null);
                    setRouteCoords([]);
                    setRouteInfo(null);
                  }}
                  style={styles.closeCardBtn}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text
                style={[styles.spotlightAddr, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {selectedTemple.address}
              </Text>

              <View style={styles.badgeLine}>
                <View style={styles.starPill}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.starPillText}>{selectedTemple.rating}</Text>
                </View>

                <Text style={[styles.openHoursText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {selectedTemple.openHours}
                </Text>
              </View>
            </View>
          </View>

          {/* แถบข้อมูลการเดินทาง + สลับโหมด */}
          <View
            style={[
              styles.MetricsStrip,
              { backgroundColor: isDark ? 'rgba(30,41,59,0.7)' : '#F8FAFC' },
            ]}
          >
            <View style={styles.metricItem}>
              <AppText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                ระยะทาง
              </AppText>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {routeInfo?.distance || selectedTemple.distance || '-'} กม.
              </Text>
            </View>

            <View style={[styles.metricVertLine, { backgroundColor: borderSubtle }]} />

            <View style={styles.metricItem}>
              <AppText style={[styles.metricLabel, { color: colors.textSecondary }]}>
                เวลาเดินทาง
              </AppText>
              <Text style={[styles.metricValue, { color: '#7C3AED' }]}>
                {routeInfo ? `${routeInfo.duration} นาที` : 'คำนวณ...'}
              </Text>
            </View>

            <View style={styles.modeSwitchPill}>
              {(['driving', 'walking'] as const).map((m) => {
                const active = travelMode === m;
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => {
                      setTravelMode(m);
                      fetchRoute(selectedTemple, m);
                    }}
                    style={[
                      styles.modeIconBtn,
                      active && { backgroundColor: '#7C3AED' },
                    ]}
                  >
                    <Ionicons
                      name={m === 'driving' ? 'car' : 'walk'}
                      size={15}
                      color={active ? '#FFFFFF' : colors.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ปุ่ม Action ด้านล่างการ์ด */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.primaryNavBtn}
              activeOpacity={0.9}
              onPress={() => openExternalNavigation(selectedTemple)}
            >
              <LinearGradient
                colors={['#7C3AED', '#4C1D95']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryNavGrad}
              >
                <Feather name="navigation" size={16} color="#FFFFFF" />
                <Text style={styles.primaryNavText}>เริ่มนำทางทันที</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryIconBtn, { borderColor: borderSubtle }]}
              onPress={() => shareTemple(selectedTemple)}
            >
              <Ionicons name="share-outline" size={19} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
 map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  /* ส่วนค้นหาด้านบน */
  headerArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingTop: 8,
  },
  commandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#6D28D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 8,
  },
  resetBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },

  /* แถบคำค้นหาด่วน */
  quickTagsScroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  quickTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  quickTagText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* เมนูผลการค้นหา */
  resultsMenu: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  resultIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  resultDistance: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },

  /* ปุ่มควบคุมมุมขวา */
  floatingTools: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 165 : 135,
    borderRadius: 18,
    borderWidth: 1,
    padding: 4,
    zIndex: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  toolIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolDivider: {
    height: 1,
    marginHorizontal: 6,
  },

  /* หมุดบนแผนที่ */
  markerWrap: {
    alignItems: 'center',
  },
  customPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  customPinActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
  },
  pinPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  /* การ์ดลอยตัวด้านล่าง (Floating Spotlight Card) */
  spotlightCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    zIndex: 25,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
  spotlightHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  thumbWrapper: {
    width: 78,
    height: 78,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  thumbLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  spotlightInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  spotlightTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  closeCardBtn: {
    padding: 4,
  },
  spotlightAddr: {
    fontSize: 12,
    marginTop: 3,
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  starPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  openHoursText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },

  /* แถบตัวเลขระยะทางและเวลา */
  MetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
    marginBottom: 14,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  metricVertLine: {
    width: 1,
    height: 26,
    marginHorizontal: 12,
  },
  modeSwitchPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  modeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ปุ่มกดนำทาง */
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryNavBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryNavGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  primaryNavText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});