import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

export default function MyTripsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchUserTrips();
  }, []);

  const fetchUserTrips = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          title,
          created_at,
          trip_stops (id, temple_name, lat, lng, sort_order)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (e) {
      console.log('Error fetching trips:', e);
    } finally {
      setLoading(false);
    }
  };

  const openNavigation = (lat: number, lng: number, name: string) => {
    if (!lat || !lng) {
      Alert.alert('แจ้งเตือน', 'ไม่พบพิกัดของวัดนี้');
      return;
    }
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const label = encodeURIComponent(name);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  const handleDeleteTrip = async (tripId: string) => {
    Alert.alert('ยืนยันการลบ', 'คุณต้องการลบทริปบุญนี้ใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('trips').delete().eq('id', tripId);
            if (error) throw error;
            setModalVisible(false);
            fetchUserTrips();
            Alert.alert('สำเร็จ', 'ลบทริปเรียบร้อยแล้ว');
          } catch (e: any) {
            Alert.alert('เกิดข้อผิดพลาด', e.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>🗺️ ทริปบุญของฉัน</AppText>
        <TouchableOpacity
          onPress={() => router.push('/create-trip' as any)}
          style={styles.addTripBtn}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <AppText style={[styles.loadingText, { color: colors.textSecondary }]}>กำลังโหลดทริปของคุณ...</AppText>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="map-marker-off" size={56} color={colors.textSecondary} />
          <AppText style={[styles.emptyText, { color: colors.textSecondary }]}>
            ยังไม่มีทริปบุญที่คุณสร้างขึ้น
          </AppText>
          <TouchableOpacity
            style={styles.createFirstBtn}
            onPress={() => router.push('/create-trip' as any)}
          >
            <AppText style={styles.createFirstText}>+ สร้างทริปแรกเลย</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {trips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              activeOpacity={0.9}
              onPress={() => {
                setSelectedTrip(trip);
                setModalVisible(true);
              }}
            >
              <LinearGradient
                colors={isDark ? ['#312E81', '#4C1D95'] : ['#F3E8FF', '#EDE9FE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tripCard}
              >
                <View style={styles.tripCardHeader}>
                  <View style={styles.tripIconBox}>
                    <MaterialCommunityIcons name="map-marker-path" size={22} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.tripTitle, { color: colors.text }]} numberOfLines={1}>
                      {trip.title}
                    </Text>
                    <Text style={[styles.tripDate, { color: colors.textSecondary }]}>
                      สร้างเมื่อ: {new Date(trip.created_at).toLocaleDateString('th-TH')}
                    </Text>
                  </View>
                  <View style={styles.badgeCount}>
                    <AppText style={styles.badgeCountText}>{trip.trip_stops?.length || 0} วัด</AppText>
                  </View>
                </View>

                <View style={styles.stopsPreview}>
                  {trip.trip_stops?.slice(0, 2).map((stop: any, idx: number) => (
                    <Text key={stop.id || idx} style={[styles.stopName, { color: colors.textSecondary }]} numberOfLines={1}>
                      📍 {stop.temple_name}
                    </Text>
                  ))}
                  {trip.trip_stops?.length > 2 && (
                    <AppText style={{ fontSize: 11, color: '#7C3AED', fontWeight: '700', marginTop: 2 }}>
                      และอีก {trip.trip_stops.length - 2} แห่ง... (แตะเพื่อดูเส้นทางทั้งหมด)
                    </AppText>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Modal แสดงรายละเอียดเส้นทางทริป (Timeline) */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            
            {selectedTrip && (
              <>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedTrip.title}</Text>
                    <AppText style={[styles.modalSub, { color: colors.textSecondary }]}>
                      เส้นทางสายบุญ ({selectedTrip.trip_stops?.length || 0} วัด)
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteTrip(selectedTrip.id)}
                    style={styles.deleteTripBtn}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 14, maxHeight: 400 }}>
                  {selectedTrip.trip_stops?.map((stop: any, index: number) => (
                    <View key={stop.id || index} style={styles.timelineItem}>
                      {index < selectedTrip.trip_stops.length - 1 && <View style={styles.timelineLine} />}
                      <View style={styles.timelineIndexBox}>
                        <Text style={styles.timelineIndexText}>{index + 1}</Text>
                      </View>
                      <View style={[styles.timelineCard, { backgroundColor: isDark ? '#1E2937' : '#F8FAFC', borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.timelineTempleName, { color: colors.text }]}>{stop.temple_name}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.navBtn}
                          onPress={() => openNavigation(stop.lat, stop.lng, stop.temple_name)}
                        >
                          <Ionicons name="location" size={14} color="#fff" />
                          <AppText style={styles.navBtnText}>นำทาง</AppText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <AppText style={styles.closeModalText}>ปิดหน้าต่าง</AppText>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  addTripBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', backgroundColor: '#7C3AED' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  createFirstBtn: { backgroundColor: '#7C3AED', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  createFirstText: { color: '#fff', fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  tripCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tripCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tripIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripTitle: { fontSize: 17, fontWeight: '800' },
  tripDate: { fontSize: 11, marginTop: 2 },
  badgeCount: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCountText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stopsPreview: { paddingLeft: 4, gap: 3 },
  stopName: { fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 12, marginTop: 2 },
  deleteTripBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },

  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, position: 'relative', paddingLeft: 6 },
  timelineLine: { position: 'absolute', left: 23, top: 32, bottom: -14, width: 2, backgroundColor: '#E2E8F0' },
  timelineIndexBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineIndexText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  timelineCard: {
    flex: 1,
    marginLeft: 12,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  timelineTempleName: { fontSize: 14, fontWeight: '700' },
  navBtn: {
    backgroundColor: '#EC4899',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    marginLeft: 8,
  },
  navBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  closeModalBtn: { backgroundColor: '#7C3AED', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  closeModalText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});