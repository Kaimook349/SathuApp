import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Linking,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';

const { width } = Dimensions.get('window');
const FRAME = width * 0.65;

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const goToSuccess = (params: Record<string, string>) => {
    router.replace({
      pathname: '/scan-success' as any,
      params,
    });
  };

  const handleTempleCheckIn = async (templeId: string) => {
    try {
      setProcessing(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: temple } = await supabase
        .from('temples')
        .select('id, name, province, image_url')
        .eq('id', templeId)
        .maybeSingle();

      const pointsEarned = 3;
      let totalPoints = 0;

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('merit_points')
          .eq('id', user.id)
          .maybeSingle();

        totalPoints = (profile?.merit_points || 0) + pointsEarned;
        await supabase
          .from('profiles')
          .update({ merit_points: totalPoints })
          .eq('id', user.id);
      }

      goToSuccess({
        templeName: temple?.name || 'วัด',
        province: temple?.province || '',
        distance: '',
        templeImage: temple?.image_url || '',
        activityName: 'เข้าวัดทำบุญ',
        activityDate: new Date().toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        activityTime: new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        pointsEarned: String(pointsEarned),
        totalPoints: String(totalPoints),
        activityId: '',
      });
    } catch (e) {
      console.log(e);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการเช็คอินได้', [
        { text: 'ตกลง', onPress: () => setScanned(false) },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const handleActivityCheckIn = async (activityId: string) => {
    try {
      setProcessing(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: activity } = await supabase
        .from('temples_activities')
        .select(
          'id, activity_name, temple_name, province, image_url, event_date, event_time'
        )
        .eq('id', activityId)
        .maybeSingle();

      const pointsEarned = 3;
      let totalPoints = 0;

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('merit_points')
          .eq('id', user.id)
          .maybeSingle();

        totalPoints = (profile?.merit_points || 0) + pointsEarned;
        await supabase
          .from('profiles')
          .update({ merit_points: totalPoints })
          .eq('id', user.id);
      }

      goToSuccess({
        templeName: activity?.temple_name || 'วัด',
        province: activity?.province || '',
        distance: '',
        templeImage: activity?.image_url || '',
        activityName: activity?.activity_name || 'กิจกรรมทำบุญ',
        activityDate: activity?.event_date || '',
        activityTime: activity?.event_time || '',
        pointsEarned: String(pointsEarned),
        totalPoints: String(totalPoints),
        activityId: activityId,
      });
    } catch (e) {
      console.log(e);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเช็คอินกิจกรรมได้', [
        { text: 'ตกลง', onPress: () => setScanned(false) },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const processQRData = async (data: string) => {
    const value = (data || '').trim();
    if (!value) {
      Alert.alert('ไม่พบข้อมูล', 'ลองสแกนอีกครั้ง', [
        { text: 'ตกลง', onPress: () => setScanned(false) },
      ]);
      return;
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      Alert.alert('พบลิงก์', value, [
        { text: 'สแกนต่อ', onPress: () => setScanned(false) },
        {
          text: 'เปิดลิงก์',
          onPress: async () => {
            try {
              await Linking.openURL(value);
            } catch {
              Alert.alert('เปิดลิงก์ไม่สำเร็จ');
            }
            setScanned(false);
          },
        },
      ]);
      return;
    }

    if (value.startsWith('TEMPLE:')) {
      await handleTempleCheckIn(value.replace('TEMPLE:', '').trim());
      return;
    }

    if (value.startsWith('ACTIVITY:')) {
      await handleActivityCheckIn(value.replace('ACTIVITY:', '').trim());
      return;
    }

    if (/^[0-9a-f-]{36}$/i.test(value)) {
      await handleActivityCheckIn(value);
      return;
    }

    Alert.alert('ผลการสแกน', value, [
      { text: 'สแกนอีกครั้ง', onPress: () => setScanned(false) },
      { text: 'ปิด', onPress: () => router.back() },
    ]);
  };

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned || processing) return;
    setScanned(true);
    await processQRData(result.data || '');
  };

  // เลือกภาพจากอัลบั้ม (หมายเหตุ: อ่าน QR จากรูปต้องใช้ไลบรารีเพิ่ม)
  const pickFromAlbum = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตเข้าถึงรูปภาพ');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]) return;

      // ตอนนี้ยังอ่าน QR จากรูปโดยตรงไม่ได้ใน expo-camera
      // แสดงข้อความแนะนำ หรือติดตั้ง barcode scanner จากรูปเพิ่ม
      Alert.alert(
        'เลือกรูปแล้ว',
        'ฟีเจอร์อ่าน QR จากรูปภาพยังไม่พร้อมในเวอร์ชันนี้\nกรุณาสแกนด้วยกล้องโดยตรง',
        [{ text: 'ตกลง' }]
      );

      // ถ้าติดตั้ง เช่น expo-barcode-scanner / vision-camera ภายหลัง
      // สามารถ decode รูปแล้วเรียก processQRData(decodedText) ได้
    } catch (e) {
      console.log(e);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกรูปได้');
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7C3AED" />
        <Text style={styles.centerText}>กำลังขอสิทธิ์กล้อง...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="camera-outline" size={52} color="#94A3B8" />
        <Text style={styles.centerTitle}>ต้องการสิทธิ์กล้อง</Text>
        <Text style={styles.centerText}>เพื่อสแกน QR Code ที่วัดหรือกิจกรรม</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>อนุญาตการใช้กล้อง</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#7C3AED', fontWeight: '600' }}>ย้อนกลับ</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'pdf417', 'code128'],
        }}
        onBarcodeScanned={scanned || processing ? undefined : handleBarCodeScanned}
      />

      {/* Overlay ทั้งจอ */}
      <View style={styles.overlay}>
        {/* ด้านบน */}
        <SafeAreaView edges={['top']}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>สแกน QR</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        {/* กรอบสแกนตรงกลาง */}
        <View style={styles.middle}>
          <View style={styles.frame}>
            {/* มุมทั้ง 4 */}
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            {/* เส้นกลาง */}
            <View style={styles.scanLine} />
          </View>

          <Text style={styles.hint}>
            {processing
              ? 'กำลังบันทึกการเช็คอิน...'
              : 'ให้ตำแหน่ง QR Code หรือบาร์โค้ดอยู่ตรงกลางภาพ'}
          </Text>
          {processing && (
            <ActivityIndicator color="#fff" style={{ marginTop: 12 }} />
          )}
        </View>

        {/* แถบปุ่มล่าง: แฟลช + อัลบั้ม */}
        <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
          <View style={styles.bottomSheet}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => setTorch((t) => !t)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, torch && styles.actionIconActive]}>
                <Ionicons
                  name={torch ? 'flashlight' : 'flashlight-outline'}
                  size={26}
                  color={torch ? '#7C3AED' : '#1E1B4B'}
                />
              </View>
              <Text style={styles.actionLabel}>
                {torch ? 'ปิดแฟลช' : 'เปิดแฟลช'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={pickFromAlbum}
              activeOpacity={0.8}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="images-outline" size={26} color="#1E1B4B" />
              </View>
              <Text style={styles.actionLabel}>อัลบั้ม</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    padding: 24,
  },
  centerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E2937',
    marginTop: 12,
  },
  centerText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },
  permBtn: {
    marginTop: 20,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  permBtnText: { color: '#fff', fontWeight: '700' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  middle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME,
    height: FRAME,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#fff',
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 16,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 16,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 16,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: '50%',
    height: 2,
    backgroundColor: 'rgba(255,100,100,0.7)',
    borderRadius: 1,
  },
  hint: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 28,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  bottomSafe: {
    backgroundColor: 'transparent',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 8 : 20,
  },
  actionItem: {
    alignItems: 'center',
    minWidth: 90,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionIconActive: {
    backgroundColor: '#EDE9FE',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E1B4B',
  },
});