import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

export default function CreateTripScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [tripTitle, setTripTitle] = useState('');
  const [templesList, setTemplesList] = useState<any[]>([]);
  const [selectedTemples, setSelectedTemples] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAvailableTemples();
  }, []);

  const fetchAvailableTemples = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('temples').select('id, name, address, latitude, longitude').limit(20);
      if (error) throw error;
      setTemplesList(data || []);
    } catch (e) {
      console.log('Error fetching temples:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectTemple = (temple: any) => {
    if (selectedTemples.some((t) => t.id === temple.id)) {
      setSelectedTemples(selectedTemples.filter((t) => t.id !== temple.id));
    } else {
      if (selectedTemples.length >= 9) {
        Alert.alert('แจ้งเตือน', 'คุณสามารถเลือกวัดสูงสุดได้ 9 วัดต่อทริปครับ');
        return;
      }
      setSelectedTemples([...selectedTemples, temple]);
    }
  };

  const handleSaveTrip = async () => {
    if (!tripTitle.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณาตั้งชื่อทริปของคุณก่อน');
      return;
    }
    if (selectedTemples.length === 0) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกวัดอย่างน้อย 1 แห่งเข้าสู่ทริป');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนสร้างทริป');
        return;
      }

      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert([{ user_id: user.id, title: tripTitle }])
        .select()
        .single();

      if (tripError) throw tripError;

      const stopsToInsert = selectedTemples.map((t, index) => ({
        trip_id: tripData.id,
        temple_name: t.name,
        lat: t.latitude,
        lng: t.longitude,
        sort_order: index + 1,
      }));

      const { error: stopsError } = await supabase.from('trip_stops').insert(stopsToInsert);
      if (stopsError) throw stopsError;

      Alert.alert('สำเร็จ', 'สร้างทริปสายบุญของคุณเรียบร้อยแล้ว!', [
        { text: 'ตกลง', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e.message || 'ไม่สามารถบันทึกทริปได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>สร้างทริปไหว้พระเอง</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppText style={[styles.label, { color: colors.text }]}>ชื่อทริปบุญของคุณ</AppText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="เช่น ทริปเสริมดวง 9 วัด, ไหว้พระกับครอบครัว..."
          placeholderTextColor={colors.textSecondary}
          value={tripTitle}
          onChangeText={setTripTitle}
        />

        <View style={styles.selectedRow}>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>
            เลือกวัดเข้าทริป ({selectedTemples.length}/9)
          </AppText>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#7C3AED" style={{ marginTop: 20 }} />
        ) : (
          templesList.map((temple) => {
            const isSelected = selectedTemples.some((t) => t.id === temple.id);
            return (
              <TouchableOpacity
                key={temple.id}
                style={[
                  styles.templeSelectItem,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? '#4C1D95'
                        : '#F3E8FF'
                      : colors.card,
                    borderColor: isSelected ? '#7C3AED' : colors.border,
                  },
                ]}
                onPress={() => toggleSelectTemple(temple)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  {/* ชื่อวัดจาก DB ใช้ Text ปกติได้ */}
                  <Text style={[styles.templeSelectItemName, { color: colors.text }]}>
                    {temple.name}
                  </Text>
                  <Text style={[styles.templeSelectItemAddr, { color: colors.textSecondary }]}>
                    {temple.address || 'ประเทศไทย'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isSelected ? '#7C3AED' : 'transparent',
                      borderColor: isSelected ? '#7C3AED' : colors.border,
                    },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Footer Save Button */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveTrip}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <AppText style={styles.saveButtonText}>บันทึกและสร้างทริป</AppText>
          )}
        </TouchableOpacity>
      </View>
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
  scrollContent: { padding: 16, paddingBottom: 100 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 20,
  },
  selectedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  templeSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  templeSelectItemName: { fontSize: 14, fontWeight: '700' },
  templeSelectItemAddr: { fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});